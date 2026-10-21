import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../auth/schemas/user.schema';
import { ProductsService } from '../catalog/products/products.service';
import { SetsService } from '../catalog/sets/sets.service';
import {
  CardQuantity,
  ClassifiedCard,
  CollectionCard,
  CollectionGoal,
  CollectionView,
  buildRows,
  buildSlots,
  classifyPrintings,
  normalizeGoal,
  rowMatches,
  summarize,
  variantOptions,
  wishlistPlan,
} from './collection-progress';
import { LibraryEntry } from './schemas/library-entry.schema';

const PAGE_SIZE = 24;
const CACHE_MS = 60_000;

type CachedCatalog = {
  expires: number;
  cards: ClassifiedCard[];
};

function gameOf(value?: string) {
  return value === 'riftbound' ? 'riftbound' : 'one-piece';
}

@Injectable()
export class CollectionService {
  private catalogs = new Map<string, CachedCatalog>();

  constructor(
    @InjectModel(LibraryEntry.name)
    private readonly entries: Model<LibraryEntry>,
    @InjectModel(User.name)
    private readonly users: Model<User>,
    private readonly products: ProductsService,
    private readonly sets: SetsService,
  ) {}

  async overview(userId: string, tcg = 'one-piece') {
    const game = gameOf(tcg);
    const [goal, cards, catalogSets, quantities] = await Promise.all([
      this.goalFor(userId),
      this.catalog(game),
      this.sets.findAll(game),
      this.quantities(userId),
    ]);
    const slots = buildSlots(cards, goal, quantities);
    const bySet = new Map<string, typeof slots>();
    for (const slot of slots) {
      const group = bySet.get(slot.setExternalId);
      if (group) group.push(slot);
      else bySet.set(slot.setExternalId, [slot]);
    }

    const known = new Set(catalogSets.data.map((set) => set.externalId));
    const rows = catalogSets.data.map((set) => ({
      externalId: set.externalId,
      code: set.code,
      name: set.name,
      releaseDate: set.releaseDate,
      ...summarize(bySet.get(set.externalId) ?? []),
    }));

    for (const [externalId, group] of bySet) {
      if (known.has(externalId)) continue;
      const sample = cards.find((card) => card.setExternalId === externalId);
      rows.push({
        externalId,
        code: undefined,
        name: sample?.name ?? externalId,
        releaseDate: undefined,
        ...summarize(group),
      });
    }

    return {
      goal,
      variants: variantOptions(cards),
      sets: rows.filter((set) => set.total > 0).sort(compareSets),
    };
  }

  async setDetail(
    userId: string,
    externalId: string,
    view: CollectionView,
    page: number,
    tcg = 'one-piece',
  ) {
    const set = await this.sets.findOne(externalId);
    const [goal, cards, quantities] = await Promise.all([
      this.goalFor(userId),
      this.catalog(gameOf(tcg)),
      this.quantities(userId),
    ]);
    const mine = cards.filter((card) => card.setExternalId === externalId);
    const slots = buildSlots(mine, goal, quantities);
    const rows = buildRows(mine, goal, quantities);
    const counts = {
      todas: rows.length,
      faltan: rows.filter((row) => rowMatches(row, 'faltan')).length,
      tienes: rows.filter((row) => rowMatches(row, 'tienes')).length,
      repetidas: rows.filter((row) => rowMatches(row, 'repetidas')).length,
      deseadas: rows.filter((row) => rowMatches(row, 'deseadas')).length,
    };
    const filtered = rows.filter((row) => rowMatches(row, view));
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const current = Math.min(page, pages);
    return {
      set: {
        externalId: set.data.externalId,
        code: set.data.code,
        name: set.data.name,
        ...summarize(slots),
      },
      goal,
      view,
      counts,
      cards: filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
      page: current,
      limit: PAGE_SIZE,
      total,
    };
  }

  async saveGoal(userId: string, input: CollectionGoal) {
    const goal = normalizeGoal(input);
    await this.users.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $set: { collectionGoal: goal } },
    );
    return goal;
  }

  async addMissing(userId: string, externalId: string, tcg = 'one-piece') {
    await this.sets.findOne(externalId);
    const [goal, cards, quantities] = await Promise.all([
      this.goalFor(userId),
      this.catalog(gameOf(tcg)),
      this.quantities(userId),
    ]);
    const updates = wishlistPlan(
      buildSlots(
        cards.filter((card) => card.setExternalId === externalId),
        goal,
        quantities,
      ),
    );
    if (updates.length === 0) return { added: 0 };

    const owner = new Types.ObjectId(userId);
    await this.entries.bulkWrite(
      updates.map((update) => ({
        updateOne: {
          filter: {
            userId: owner,
            productExternalId: update.externalId,
            list: 'wanted' as const,
          },
          update: { $set: { quantity: update.quantity } },
          upsert: true,
        },
      })),
    );
    return { added: updates.length };
  }

  private async goalFor(userId: string) {
    const user = await this.users
      .findById(userId)
      .select('collectionGoal')
      .lean();
    return normalizeGoal(user?.collectionGoal);
  }

  private async quantities(userId: string) {
    const entries = await this.entries
      .find({ userId: new Types.ObjectId(userId) })
      .select('productExternalId list quantity')
      .lean();
    const quantities = new Map<number, CardQuantity>();
    for (const entry of entries) {
      const current = quantities.get(entry.productExternalId) ?? {
        owned: 0,
        wanted: 0,
      };
      if (entry.list === 'owned') current.owned = entry.quantity;
      if (entry.list === 'wanted') current.wanted = entry.quantity;
      quantities.set(entry.productExternalId, current);
    }
    return quantities;
  }

  private async catalog(tcg: string) {
    const now = Date.now();
    const cached = this.catalogs.get(tcg);
    if (cached && cached.expires > now) return cached.cards;
    const rows = await this.products.progressCards(tcg);
    const cards = classifyPrintings(rows.map(toCollectionCard));
    this.catalogs.set(tcg, { expires: now + CACHE_MS, cards });
    return cards;
  }
}

function toCollectionCard(row: {
  externalId: number;
  name: string;
  code?: string | null;
  cardType?: string | null;
  rarity?: string | null;
  images?: { small?: string; medium?: string }[];
  set: { externalId: string };
}): CollectionCard {
  const image = row.images?.[0];
  return {
    externalId: row.externalId,
    name: row.name,
    code: row.code,
    cardType: row.cardType,
    rarity: row.rarity,
    image: image?.small || image?.medium,
    setExternalId: row.set.externalId,
  };
}

function compareSets(
  a: { releaseDate?: Date | string | null; code?: string | null; name: string },
  b: { releaseDate?: Date | string | null; code?: string | null; name: string },
) {
  const aTime = a.releaseDate
    ? new Date(a.releaseDate).getTime()
    : Number.POSITIVE_INFINITY;
  const bTime = b.releaseDate
    ? new Date(b.releaseDate).getTime()
    : Number.POSITIVE_INFINITY;
  return (
    aTime - bTime ||
    (a.code ?? '').localeCompare(b.code ?? '', 'en') ||
    a.name.localeCompare(b.name, 'es')
  );
}
