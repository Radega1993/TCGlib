import { BadGatewayException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CommunityDeck,
  isCommunityList,
  pickNewVariants,
  readCommunityDeck,
} from './community-decks';
import { SuggestedDeck } from './schemas/suggested-deck.schema';

const LIST_URL = 'https://api.dotgg.gg/cgfw/getdecks';
const PAGE_SIZE = 30;
const PAGES = 4;

@Injectable()
export class SuggestedDecksService {
  constructor(
    @InjectModel(SuggestedDeck.name)
    private readonly decks: Model<SuggestedDeck>,
  ) {}

  count() {
    return this.decks.countDocuments();
  }

  async refresh() {
    const pages = ['views', 'date'].flatMap((sort) =>
      Array.from({ length: PAGES }, (_, index) =>
        this.fetchPage(sort as 'views' | 'date', index + 1),
      ),
    );
    const incoming = uniqueDecks((await Promise.all(pages)).flat()).filter(
      isCommunityList,
    );
    const stored = await this.decks
      .find()
      .select('slug fingerprint leaderCode')
      .lean();
    const picked = pickNewVariants(incoming, stored);
    if (picked.fresh.length) {
      await this.decks.insertMany(
        picked.fresh.map((deck) => ({ ...deck, source: 'dotgg' as const })),
      );
    }

    return {
      added: picked.fresh.length,
      kept: picked.kept,
      total: await this.count(),
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

  private async fetchPage(sort: 'views' | 'date', page: number) {
    const request = {
      page,
      limit: PAGE_SIZE,
      srt: sort,
      direct: 'desc',
      my: 0,
      getdecks: { smartsrch: '', format: '' },
    };
    const url = `${LIST_URL}?game=onepiece&rq=${encodeURIComponent(JSON.stringify(request))}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'TCGlib' },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new BadGatewayException(
        'No se pudo leer la lista pública de mazos.',
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(
        'No se pudo leer la lista pública de mazos.',
      );
    }
    const body: unknown = await response.json().catch(() => null);
    if (!Array.isArray(body)) {
      throw new BadGatewayException(
        'La lista pública de mazos no tiene el formato esperado.',
      );
    }
    return body.flatMap((item) => {
      const deck = readCommunityDeck(item);
      return deck ? [deck] : [];
    });
  }
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
