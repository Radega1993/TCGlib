import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { displayName } from '../auth/alias';
import { User } from '../auth/schemas/user.schema';
import { isPublicSlug, randomToken } from '../auth/state-token';
import { ProductsService } from '../catalog/products/products.service';
import {
  CARD_CODE,
  DON_DECK,
  DeckFormat,
  Playable,
  checkAvailability,
  checkConstruction,
  checkLegality,
  currentRules,
  deckSummary,
  normalizeLines,
  parseCost,
  pickCanonical,
  presentCopies,
  rulesById,
  rulesLabel,
  splitCardColors,
  wishlistAdds,
} from './deck-rules';
import { CreateDeckDto, SaveDeckDto } from './dto/deck.dto';
import { assembleOpsim, OpsimError, parseOpsim } from './opsim';
import { LibraryService } from './library.service';
import { isCommunityList } from './community-decks';
import { SuggestedDecksService } from './suggested-decks.service';
import { Deck, DeckSource } from './schemas/deck.schema';
import { LibraryEntry, LibraryList } from './schemas/library-entry.schema';

type Printing = {
  externalId: number;
  name: string;
  code?: string | null;
  cardType?: string | null;
  color?: string | null;
  cost?: string | null;
  images?: { small?: string; medium?: string }[];
};

type DeckRecord = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  format: DeckFormat;
  leaderCode?: string;
  lines: { code: string; quantity: number }[];
  source: DeckSource;
  rulesId: string;
  publicSlug?: string;
  shareEnabled: boolean;
  updatedAt?: Date;
};

@Injectable()
export class DeckService {
  constructor(
    @InjectModel(Deck.name) private readonly decks: Model<Deck>,
    @InjectModel(LibraryEntry.name)
    private readonly entries: Model<LibraryEntry>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly products: ProductsService,
    private readonly library: LibraryService,
    private readonly suggested: SuggestedDecksService,
  ) {}

  async list(userId: string) {
    const decks = await this.decks
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .lean();
    const owned = await this.quantitiesByCode(userId, 'owned');
    const groups = await this.groupsFor(decks);
    return decks.map((deck) => {
      const view = this.evaluate(deck, groups, owned);
      return {
        id: deck._id.toString(),
        name: deck.name,
        format: deck.format,
        rulesId: deck.rulesId || null,
        rulesLabel: rulesLabel(deck.rulesId),
        updatedAt: deck.updatedAt?.toISOString() ?? null,
        leader: view.leader,
        construction: {
          ok: view.construction.ok,
          size: view.construction.size,
          target: view.construction.target,
        },
        legality: {
          status: view.legality.status,
          blockChecked: view.legality.blockChecked,
        },
        availability: {
          available: view.availability.available,
          listSize: view.availability.listSize,
          missingCopies: view.availability.missingCopies,
          target: view.availability.target,
        },
      };
    });
  }

  async suggestions(userId: string) {
    const owner = new Types.ObjectId(userId);
    const [catalog, owned, saved] = await Promise.all([
      this.suggested.forMatching(),
      this.quantitiesByCode(userId, 'owned'),
      this.decks
        .find({ userId: owner, sourceRef: { $regex: '^dotgg:' } })
        .select('sourceRef')
        .lean(),
    ]);
    const savedBySlug = new Map(
      saved.flatMap((deck) => {
        const slug = deck.sourceRef?.slice('dotgg:'.length);
        return slug ? [[slug, deck._id.toString()] as const] : [];
      }),
    );
    const groups = await this.groupsFor(
      catalog.map((deck) => ({ leaderCode: deck.leaderCode, lines: [] })),
    );
    return catalog
      .filter((deck) => isCommunityList(deck))
      .map((deck) => {
        const availability = checkAvailability(
          [{ code: deck.leaderCode, quantity: 1 }, ...deck.lines],
          owned,
        );
        const leader = canonical(groups.get(deck.leaderCode));
        return {
          slug: deck.slug,
          name: deck.name,
          author: deck.author,
          leader: leader ? cardView(leader) : null,
          missingCopies: availability.missingCopies,
          available: availability.available,
          listSize: availability.listSize,
          deckId: savedBySlug.get(deck.slug) ?? null,
          views: deck.views,
        };
      })
      .sort(
        (left, right) =>
          left.missingCopies - right.missingCopies ||
          right.available - left.available ||
          right.views - left.views,
      )
      .map(({ views: _views, ...deck }) => deck);
  }

  async suggestion(userId: string, slug: string) {
    const suggested = await this.requireSuggestion(slug);
    const owned = await this.quantitiesByCode(userId, 'owned');
    const groups = await this.groupsFor([suggested]);
    const saved = await this.decks
      .findOne({
        userId: new Types.ObjectId(userId),
        sourceRef: `dotgg:${slug}`,
      })
      .select('_id')
      .lean();
    const rows = [
      { code: suggested.leaderCode, quantity: 1, leader: true },
      ...suggested.lines.map((line) => ({
        code: line.code,
        quantity: line.quantity,
        leader: false,
      })),
    ].map((line) => {
      const card = canonical(groups.get(line.code));
      const count = owned.get(line.code) ?? 0;
      return {
        ...(card
          ? cardView(card)
          : {
              externalId: null,
              code: line.code,
              name: line.code,
              cardType: null,
              color: null,
              cost: null,
              image: null,
            }),
        needed: line.quantity,
        owned: count,
        missing: Math.max(0, line.quantity - count),
        leader: line.leader,
      };
    });
    const availability = checkAvailability(
      rows.map((line) => ({ code: line.code, quantity: line.needed })),
      owned,
    );
    const leader = rows.find((line) => line.leader);
    return {
      slug: suggested.slug,
      name: suggested.name,
      author: suggested.author,
      leader: leader
        ? {
            externalId: leader.externalId,
            code: leader.code,
            name: leader.name,
            cardType: leader.cardType,
            color: leader.color,
            cost: leader.cost,
            image: leader.image,
          }
        : null,
      missingCopies: availability.missingCopies,
      available: availability.available,
      listSize: availability.listSize,
      deckId: saved?._id.toString() ?? null,
      lines: rows,
    };
  }

  async adoptSuggestion(userId: string, slug: string) {
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      throw new BadRequestException('Ese mazo no está en la lista.');
    }
    const sourceRef = `dotgg:${slug}`;
    const existing = await this.decks.findOne({
      userId: new Types.ObjectId(userId),
      sourceRef,
    });
    if (existing) return this.present(userId, existing.toObject());

    const suggested = await this.suggested.findBySlug(slug);
    if (!suggested) {
      throw new NotFoundException('Ese mazo no está en la lista.');
    }
    const deck = await this.decks.create({
      userId: new Types.ObjectId(userId),
      name: suggested.name,
      format: 'extra',
      leaderCode: suggested.leaderCode,
      lines: suggested.lines,
      source: 'imported',
      sourceRef,
      rulesId: currentRules()?.id ?? '',
      shareEnabled: false,
    });
    return this.present(userId, deck.toObject());
  }

  async get(userId: string, id: string) {
    const deck = await this.requireDeck(userId, id);
    return this.present(userId, deck.toObject());
  }

  async create(userId: string, body: CreateDeckDto) {
    const name = body.name?.trim() || 'Mazo nuevo';
    if (!name) {
      throw new BadRequestException('El mazo necesita un nombre');
    }
    const deck = await this.decks.create({
      userId: new Types.ObjectId(userId),
      name,
      format: body.format ?? 'extra',
      lines: [],
      source: 'user',
      rulesId: currentRules()?.id ?? '',
      shareEnabled: false,
    });
    return this.present(userId, deck.toObject());
  }

  async importNew(userId: string, source: string) {
    const built = await this.readOpsim(source);
    const deck = await this.decks.create({
      userId: new Types.ObjectId(userId),
      name: built.name ?? 'Mazo importado',
      format: 'extra',
      leaderCode: built.leaderCode ?? undefined,
      lines: built.lines,
      source: 'imported',
      rulesId: currentRules()?.id ?? '',
      shareEnabled: false,
    });
    return {
      deck: await this.present(userId, deck.toObject()),
      notes: built.notes,
    };
  }

  async importInto(userId: string, id: string, source: string) {
    const deck = await this.requireDeck(userId, id);
    const built = await this.readOpsim(source);
    if (built.name) deck.name = built.name;
    deck.set('leaderCode', built.leaderCode ?? undefined);
    deck.set('lines', built.lines);
    deck.source = 'imported';
    if (!deck.rulesId) deck.rulesId = currentRules()?.id ?? '';
    await deck.save();
    return {
      deck: await this.present(userId, deck.toObject()),
      notes: built.notes,
    };
  }

  async preview(userId: string, id: string, body: SaveDeckDto) {
    const deck = await this.requireDeck(userId, id);
    return this.present(userId, {
      ...deck.toObject(),
      name: cleanName(body.name),
      format: body.format,
      leaderCode: body.leaderCode,
      lines: normalizeLines(body.lines),
    });
  }

  async save(userId: string, id: string, body: SaveDeckDto) {
    const deck = await this.requireDeck(userId, id);
    deck.name = cleanName(body.name);
    deck.format = body.format;
    deck.set('leaderCode', body.leaderCode);
    deck.set('lines', normalizeLines(body.lines));
    if (!deck.rulesId) deck.rulesId = currentRules()?.id ?? '';
    await deck.save();
    return this.present(userId, deck.toObject());
  }

  async duplicate(userId: string, id: string) {
    const deck = await this.requireDeck(userId, id);
    const copy = await this.decks.create({
      userId: deck.userId,
      name: copyName(deck.name),
      format: deck.format,
      leaderCode: deck.leaderCode,
      lines: deck.lines.map((line) => ({
        code: line.code,
        quantity: line.quantity,
      })),
      source: 'user',
      rulesId: deck.rulesId,
      shareEnabled: false,
    });
    return this.present(userId, copy.toObject());
  }

  async remove(userId: string, id: string) {
    const deck = await this.requireDeck(userId, id);
    await this.decks.deleteOne({ _id: deck._id });
    return { deleted: true };
  }

  async setShare(userId: string, id: string, enabled: boolean) {
    const deck = await this.requireDeck(userId, id);
    if (enabled && !deck.publicSlug) {
      deck.publicSlug = await this.uniqueSlug();
    }
    deck.shareEnabled = enabled;
    await deck.save();
    return {
      publicSlug: deck.publicSlug ?? null,
      shareEnabled: deck.shareEnabled,
    };
  }

  async resetShare(userId: string, id: string) {
    const deck = await this.requireDeck(userId, id);
    deck.publicSlug = await this.uniqueSlug();
    deck.shareEnabled = true;
    await deck.save();
    return {
      publicSlug: deck.publicSlug,
      shareEnabled: true,
    };
  }

  async addMissing(userId: string, id: string) {
    const deck = await this.requireDeck(userId, id);
    const groups = await this.groupsFor([deck.toObject()]);
    const copies = await this.addToWishlist(userId, deck.lines, groups);
    return { copies };
  }

  async wishSuggestion(userId: string, slug: string) {
    const suggested = await this.requireSuggestion(slug);
    const groups = await this.groupsFor([suggested]);
    const copies = await this.addToWishlist(
      userId,
      [{ code: suggested.leaderCode, quantity: 1 }, ...suggested.lines],
      groups,
    );
    return { copies };
  }

  async search(userId: string, term: string, role: 'leader' | 'card') {
    const printings = (await this.products.searchPlayable(
      term,
      role,
    )) as Printing[];
    const groups = groupPrintings(printings);
    const owned = await this.quantitiesByCode(userId, 'owned');
    return [...groups.values()]
      .map((group) => pickCanonical(group))
      .sort((left, right) => {
        const rank = searchRank(left, term) - searchRank(right, term);
        if (rank !== 0) return rank;
        return (
          left.name.length - right.name.length ||
          left.name.localeCompare(right.name)
        );
      })
      .slice(0, 12)
      .map((card) => ({
        ...cardView(card),
        owned: owned.get(card.code?.toUpperCase() ?? '') ?? 0,
      }));
  }

  async publicView(slug: string) {
    if (!isPublicSlug(slug)) return null;
    const deck = await this.decks
      .findOne({ publicSlug: slug, shareEnabled: true })
      .lean();
    if (!deck) return null;
    const owner = await this.users
      .findById(deck.userId)
      .select('name alias')
      .lean();
    const view = await this.present(deck.userId.toString(), deck, false);
    return {
      owner: owner ? displayName(owner) : 'Un jugador',
      name: view.name,
      format: view.format,
      rulesId: view.rulesId,
      rulesLabel: view.rulesLabel,
      don: view.don,
      leader: view.leader,
      lines: view.lines.map((line) => ({
        externalId: line.externalId,
        code: line.code,
        name: line.name,
        cardType: line.cardType,
        color: line.color,
        cost: line.cost,
        image: line.image,
        quantity: line.needed,
      })),
      construction: view.construction,
      legality: view.legality,
      summary: view.summary,
    };
  }

  private async requireSuggestion(slug: string) {
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
      throw new BadRequestException('Ese mazo no está en la lista.');
    }
    const suggested = await this.suggested.findBySlug(slug);
    if (!suggested || !isCommunityList(suggested)) {
      throw new NotFoundException('Ese mazo no está en la lista.');
    }
    return suggested;
  }

  private async addToWishlist(
    userId: string,
    lines: { code: string; quantity: number }[],
    groups: Map<string, Printing[]>,
  ) {
    const owned = await this.quantitiesByCode(userId, 'owned');
    const wanted = await this.quantitiesByCode(userId, 'wanted');
    const adds = wishlistAdds(
      lines.map((line) => ({
        code: line.code,
        needed: line.quantity,
        owned: owned.get(line.code) ?? 0,
      })),
      wanted,
    );
    let copies = 0;
    for (const add of adds) {
      const printings = groups.get(add.code);
      if (!printings?.length) continue;
      const base = pickCanonical(printings);
      const current = await this.productWanted(userId, base.externalId);
      const quantity = Math.min(99, current + add.extra);
      if (quantity <= current) continue;
      await this.library.setQuantity(
        userId,
        base.externalId,
        'wanted',
        quantity,
      );
      copies += quantity - current;
    }
    return copies;
  }

  private async present(userId: string, deck: DeckRecord, withLibrary = true) {
    const owned = withLibrary
      ? await this.quantitiesByCode(userId, 'owned')
      : new Map<string, number>();
    const groups = await this.groupsFor([deck]);
    return {
      id: deck._id.toString(),
      ...this.evaluate(deck, groups, owned),
      shareEnabled: deck.shareEnabled,
      publicSlug: deck.shareEnabled ? (deck.publicSlug ?? null) : null,
      updatedAt: deck.updatedAt?.toISOString() ?? null,
    };
  }

  private evaluate(
    deck: DeckRecord,
    groups: Map<string, Printing[]>,
    owned: Map<string, number>,
  ) {
    const leaderCode = deck.leaderCode ?? null;
    const leaderCard = leaderCode ? canonical(groups.get(leaderCode)) : null;
    const leaderPlayable = leaderCard ? toPlayable(leaderCard) : null;
    const lines = deck.lines.map((line) => {
      const card = canonical(groups.get(line.code));
      const playable = card ? toPlayable(card) : null;
      const count = owned.get(line.code) ?? 0;
      return {
        ...(card
          ? cardView(card)
          : {
              externalId: null,
              code: line.code,
              name: line.code,
              cardType: null,
              color: null,
              cost: null,
              image: null,
            }),
        needed: line.quantity,
        owned: count,
        missing: Math.max(0, line.quantity - count),
        card: playable,
      };
    });
    const construction = checkConstruction(
      leaderCode,
      leaderPlayable,
      lines.map((line) => ({
        code: line.code,
        quantity: line.needed,
        card: line.card,
      })),
    );
    const legality = checkLegality(
      deck.format,
      presentCopies(leaderCode, deck.lines),
      rulesById(deck.rulesId),
    );
    const availability = checkAvailability(deck.lines, owned);
    const summary = deckSummary(
      lines.flatMap((line) =>
        line.card ? [{ card: line.card, quantity: line.needed }] : [],
      ),
    );
    return {
      name: deck.name,
      format: deck.format,
      source: deck.source,
      rulesId: deck.rulesId || null,
      rulesLabel: rulesLabel(deck.rulesId),
      don: DON_DECK,
      leader: leaderCard ? cardView(leaderCard) : null,
      lines: lines.map((line) => ({
        externalId: line.externalId,
        code: line.code,
        name: line.name,
        cardType: line.cardType,
        color: line.color,
        cost: line.cost,
        image: line.image,
        needed: line.needed,
        owned: line.owned,
        missing: line.missing,
      })),
      construction,
      legality,
      availability,
      summary,
    };
  }

  private async readOpsim(source: string) {
    let parsed: ReturnType<typeof parseOpsim>;
    try {
      parsed = parseOpsim(source);
    } catch (error) {
      if (error instanceof OpsimError)
        throw new BadRequestException(error.message);
      throw error;
    }
    const groups = await this.groupsFor([
      { lines: parsed.cards.map((card) => ({ code: card.code })) },
    ]);
    const types = new Map(
      parsed.cards.map((card) => [
        card.code,
        canonical(groups.get(card.code))?.cardType ?? null,
      ]),
    );
    try {
      return assembleOpsim(parsed, types);
    } catch (error) {
      if (error instanceof OpsimError)
        throw new BadRequestException(error.message);
      throw error;
    }
  }

  private async groupsFor(
    decks: { leaderCode?: string; lines: { code: string }[] }[],
  ) {
    const codes = new Set<string>();
    for (const deck of decks) {
      if (deck.leaderCode) codes.add(deck.leaderCode);
      for (const line of deck.lines) codes.add(line.code);
    }
    const printings = (await this.products.playableByCodes([
      ...codes,
    ])) as Printing[];
    return groupPrintings(printings);
  }

  private async quantitiesByCode(userId: string, list: LibraryList) {
    const rows = await this.entries
      .find({ userId: new Types.ObjectId(userId), list })
      .select('productExternalId quantity')
      .lean();
    const cards = await this.products.findCardsByExternalIds(
      rows.map((row) => row.productExternalId),
    );
    const codeById = new Map(
      cards.map((card) => [card.externalId, normalizeStoredCode(card.code)]),
    );
    const totals = new Map<string, number>();
    for (const row of rows) {
      const code = codeById.get(row.productExternalId);
      if (!code) continue;
      totals.set(code, (totals.get(code) ?? 0) + row.quantity);
    }
    return totals;
  }

  private async productWanted(userId: string, externalId: number) {
    const entry = await this.entries
      .findOne({
        userId: new Types.ObjectId(userId),
        productExternalId: externalId,
        list: 'wanted',
      })
      .select('quantity')
      .lean();
    return entry?.quantity ?? 0;
  }

  private async requireDeck(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('No encuentro ese mazo');
    }
    const deck = await this.decks.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    if (!deck) throw new NotFoundException('No encuentro ese mazo');
    return deck;
  }

  private async uniqueSlug() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = randomToken(9);
      const exists = await this.decks.exists({ publicSlug: slug });
      if (!exists) return slug;
    }
    throw new BadRequestException(
      'No se pudo crear el enlace. Inténtalo de nuevo.',
    );
  }
}

function cleanName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new BadRequestException('El mazo necesita un nombre');
  return trimmed;
}

function copyName(name: string) {
  const suffix = ' (copia)';
  const room = 60 - suffix.length;
  return `${name.slice(0, room).trimEnd()}${suffix}`;
}

function canonical(cards?: Printing[]) {
  if (!cards?.length) return null;
  return pickCanonical(cards);
}

function toPlayable(card: Printing): Playable {
  return {
    code: card.code?.toUpperCase() ?? '',
    name: card.name,
    cardType: card.cardType ?? null,
    colors: splitCardColors(card.color),
    cost: parseCost(card.cost),
  };
}

function cardView(card: Printing) {
  return {
    externalId: card.externalId,
    code: card.code?.toUpperCase() ?? '',
    name: card.name,
    cardType: card.cardType ?? null,
    color: card.color ?? null,
    cost: parseCost(card.cost),
    image: card.images?.[0]?.small ?? card.images?.[0]?.medium ?? null,
  };
}

function groupPrintings(cards: Printing[]) {
  const groups = new Map<string, Printing[]>();
  for (const card of cards) {
    const code = normalizeStoredCode(card.code);
    if (!code) continue;
    const group = groups.get(code);
    if (group) group.push(card);
    else groups.set(code, [card]);
  }
  return groups;
}

function normalizeStoredCode(code?: string | null) {
  const value = code?.trim().toUpperCase();
  return value && CARD_CODE.test(value) ? value : null;
}

function searchRank(card: Printing, term: string) {
  const query = term.trim().toUpperCase();
  const code = card.code?.toUpperCase() ?? '';
  const name = card.name.toUpperCase();
  if (code === query) return 0;
  if (code.startsWith(query)) return 1;
  if (name.startsWith(query)) return 2;
  return 3;
}
