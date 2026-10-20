import { BadGatewayException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductsService } from '../catalog/products/products.service';
import { normalizeCode } from './deck-rules';
import {
  CommunityDeck,
  isCommunityList,
  leadersNeedingDecks,
  pickNewVariants,
  readCommunityDeck,
  VARIANTS_PER_LEADER,
} from './community-decks';
import { SuggestedDeck } from './schemas/suggested-deck.schema';

const LIST_URL = 'https://api.dotgg.gg/cgfw/getdecks';
const PAGE_SIZE = 30;
const MAX_PAGES = 3;
const FETCH_AT_ONCE = 4;

@Injectable()
export class SuggestedDecksService {
  constructor(
    @InjectModel(SuggestedDeck.name)
    private readonly decks: Model<SuggestedDeck>,
    private readonly products: ProductsService,
  ) {}

  count() {
    return this.decks.countDocuments();
  }

  async refresh() {
    const [catalogCodes, stored] = await Promise.all([
      this.products.leaderCodes(),
      this.decks.find().select('slug fingerprint leaderCode').lean(),
    ]);
    const leaders = [
      ...new Set(
        catalogCodes.flatMap((code) => {
          const normalized = normalizeCode(String(code));
          return normalized ? [normalized] : [];
        }),
      ),
    ];
    const missing = leadersNeedingDecks(leaders, stored);
    const counts = new Map<string, number>();
    for (const deck of stored) {
      counts.set(deck.leaderCode, (counts.get(deck.leaderCode) ?? 0) + 1);
    }

    const known = new Set<string>();
    for (const deck of stored) {
      known.add(deck.slug);
      known.add(deck.fingerprint);
    }
    const incoming: CommunityDeck[] = [];
    let missed = 0;
    await runPool(missing, FETCH_AT_ONCE, async (code) => {
      const needed = VARIANTS_PER_LEADER - (counts.get(code) ?? 0);
      const result = await this.fetchLeader(code, needed, known);
      incoming.push(...result.decks);
      if (result.missed) missed += 1;
    });

    const picked = pickNewVariants(
      uniqueDecks(incoming).filter(isCommunityList),
      stored,
    );
    if (!picked.fresh.length && missed === missing.length && missing.length) {
      throw new BadGatewayException(
        'No se pudo leer la lista pública de mazos.',
      );
    }
    if (picked.fresh.length) {
      await this.decks.insertMany(
        picked.fresh.map((deck) => ({ ...deck, source: 'dotgg' as const })),
      );
    }
    for (const deck of picked.fresh) {
      counts.set(deck.leaderCode, (counts.get(deck.leaderCode) ?? 0) + 1);
    }

    return {
      added: picked.fresh.length,
      kept: picked.kept,
      total: await this.count(),
      leaders: leaders.length,
      complete: leaders.filter(
        (code) => (counts.get(code) ?? 0) >= VARIANTS_PER_LEADER,
      ).length,
      missed,
    };
  }

  forMatching() {
    return this.decks
      .find()
      .select('slug name author leaderCode lines views')
      .lean();
  }

  findBySlug(slug: string) {
    return this.decks.findOne({ slug }).lean();
  }

  private async fetchLeader(code: string, needed: number, known: Set<string>) {
    const decks: CommunityDeck[] = [];
    let missed = false;
    for (let page = 1; page <= MAX_PAGES && decks.length < needed; page += 1) {
      const batch = await this.fetchPage(page, code);
      if (!batch) {
        missed = true;
        break;
      }
      for (const deck of batch.decks) {
        if (deck.leaderCode !== code || !isCommunityList(deck)) continue;
        if (known.has(deck.slug) || known.has(deck.fingerprint)) continue;
        decks.push(deck);
        if (decks.length >= needed) break;
      }
      if (batch.size < PAGE_SIZE) break;
    }
    return { decks, missed: missed && decks.length < needed };
  }

  private async fetchPage(page: number, leaderCode: string) {
    const request = {
      page,
      limit: PAGE_SIZE,
      srt: 'views',
      direct: 'desc',
      my: 0,
      getdecks: { hascrd: [leaderCode], smartsrch: '', format: '' },
    };
    const url = `${LIST_URL}?game=onepiece&rq=${encodeURIComponent(JSON.stringify(request))}`;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: { accept: 'application/json', 'user-agent': 'TCGlib' },
          signal: AbortSignal.timeout(20000),
        });
        if (response.status === 429 || response.status >= 500) {
          await wait(500 * (attempt + 1));
          continue;
        }
        if (!response.ok) return null;
        const rows = deckRows(await response.json().catch(() => null));
        if (!rows) return null;
        return {
          size: rows.length,
          decks: rows.flatMap((item) => {
            const deck = readCommunityDeck(item);
            return deck ? [deck] : [];
          }),
        };
      } catch {
        await wait(500 * (attempt + 1));
      }
    }
    return null;
  }
}

function deckRows(body: unknown): unknown[] | null {
  const parsed = typeof body === 'string' ? parseJson(body) : body;
  return Array.isArray(parsed) ? parsed : null;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPool<T>(
  items: T[],
  size: number,
  run: (item: T) => Promise<void>,
) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await run(current);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, () => worker()),
  );
}

function uniqueDecks(decks: CommunityDeck[]) {
  const seen = new Set<string>();
  return decks.filter((deck) => {
    if (seen.has(deck.slug) || seen.has(deck.fingerprint)) return false;
    seen.add(deck.slug);
    seen.add(deck.fingerprint);
    return true;
  });
}
