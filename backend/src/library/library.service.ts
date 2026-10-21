import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductFilterInput } from '../catalog/products/product-filter';
import { ProductsService } from '../catalog/products/products.service';
import { Product } from '../catalog/schemas/product.schema';
import { ListLibraryQueryDto } from './dto/list-library.query';
import {
  ShareCollectionQueryDto,
  ShareTab,
} from './dto/share-collection.query';
import { LibraryEntry, LibraryList } from './schemas/library-entry.schema';
import { availableCopies } from './trade-copies';

const PUBLIC_PAGE_SIZE = 24;

type LibraryCounts = {
  owned: { cards: number; copies: number };
  wanted: { cards: number; copies: number };
  trades: { cards: number; copies: number };
};

type QuantityRow = {
  productExternalId: number;
  quantity: number;
  forTrade?: number;
};

@Injectable()
export class LibraryService {
  constructor(
    @InjectModel(LibraryEntry.name)
    private readonly entries: Model<LibraryEntry>,
    private readonly products: ProductsService,
  ) {}

  async list(userId: string, query: ListLibraryQueryDto) {
    if (query.list === 'trade') return this.listTrades(userId, query);
    const list = query.list ?? 'owned';
    const owner = new Types.ObjectId(userId);
    const filter = toCardFilter(query);
    const lists = await this.listsFor(owner, gameOf(query.tcg));
    const rows = list === 'wanted' ? lists.wanted : lists.owned;
    const counts = lists.counts;
    const ids = rows.map((row) => row.productExternalId);
    const [facets, sets, page] = await Promise.all([
      this.products.facetsForExternalIds(ids),
      this.products.setsForExternalIds(ids),
      this.pageRows(rows, filter, query.page ?? 1),
    ]);

    return {
      data: page.entries,
      total: page.total,
      copies: page.copies,
      page: page.page,
      limit: page.limit,
      list,
      counts,
      facets,
      sets,
    };
  }

  private async listTrades(userId: string, query: ListLibraryQueryDto) {
    const owner = new Types.ObjectId(userId);
    const filter = toCardFilter(query);
    const lists = await this.listsFor(owner, gameOf(query.tcg));
    const ownedRows = lists.owned;
    const wantedRows = lists.wanted;
    const counts = lists.counts;
    const tradeRows = ownedRows.flatMap((row) => {
      const available = availableCopies(row.quantity, row.forTrade ?? 0);
      if (available <= 0) return [];
      return [
        {
          productExternalId: row.productExternalId,
          quantity: row.quantity,
          forTrade: available,
        },
      ];
    });
    const ids = tradeRows.map((row) => row.productExternalId);
    const wanted = new Map(
      wantedRows.map((row) => [row.productExternalId, row.quantity]),
    );
    const [facets, sets, page] = await Promise.all([
      this.products.facetsForExternalIds(ids),
      this.products.setsForExternalIds(ids),
      this.pageRows(tradeRows, filter, query.page ?? 1),
    ]);

    return {
      data: page.entries.map((entry) => ({
        ...entry,
        wanted: wanted.get(entry.product.externalId) ?? 0,
      })),
      total: page.total,
      copies: counts.trades.copies,
      page: page.page,
      limit: page.limit,
      list: 'trade' as const,
      counts,
      facets,
      sets,
    };
  }

  async publicBoard(
    userId: string,
    query: ShareCollectionQueryDto,
    tab: ShareTab,
  ) {
    const counts = await this.countLists(
      new Types.ObjectId(userId),
      gameOf(query.tcg),
    );
    const view =
      tab === 'intercambio'
        ? await this.publicTrades(userId, query)
        : tab === 'busco'
          ? await this.publicWanted(userId, query)
          : await this.publicLibrary(userId, query);
    return { ...view, counts, tab };
  }

  async publicLibrary(userId: string, query: ShareCollectionQueryDto) {
    const page = await this.publicOneList(userId, 'owned', query);
    return {
      scope: 'library' as const,
      counts: page.counts,
      facets: page.facets,
      sets: page.sets,
      owned: {
        ...page.list,
        entries: page.list.entries.map((entry) => ({ ...entry, forTrade: 0 })),
      },
    };
  }

  async publicWanted(userId: string, query: ShareCollectionQueryDto) {
    const page = await this.publicOneList(userId, 'wanted', query);
    return {
      scope: 'wanted' as const,
      counts: page.counts,
      facets: page.facets,
      sets: page.sets,
      wanted: page.list,
    };
  }

  async publicTrades(userId: string, query: ShareCollectionQueryDto) {
    const owner = new Types.ObjectId(userId);
    const filter = toCardFilter(query);
    const ownedRows = await this.gameRows(
      await this.quantityRows(owner, 'owned'),
      gameOf(query.tcg),
    );
    const tradeRows = ownedRows.flatMap((row) => {
      const available = availableCopies(row.quantity, row.forTrade ?? 0);
      if (available <= 0) return [];
      return [
        { productExternalId: row.productExternalId, quantity: available },
      ];
    });
    const ids = tradeRows.map((row) => row.productExternalId);
    const [facets, sets, trades] = await Promise.all([
      this.products.facetsForExternalIds(ids),
      this.products.setsForExternalIds(ids),
      this.pageRows(tradeRows, filter, query.page ?? 1),
    ]);
    const copies = tradeRows.reduce((sum, row) => sum + row.quantity, 0);

    return {
      scope: 'trades' as const,
      counts: {
        owned: { cards: 0, copies: 0 },
        wanted: { cards: 0, copies: 0 },
        trades: { cards: tradeRows.length, copies },
      },
      facets,
      sets,
      trades,
    };
  }

  async countsForCard(userId: string, externalId: number) {
    const entries = await this.entries
      .find({
        userId: new Types.ObjectId(userId),
        productExternalId: externalId,
      })
      .select('list quantity forTrade')
      .lean();
    const owned = entries.find((entry) => entry.list === 'owned');
    return {
      owned: owned?.quantity ?? 0,
      wanted: entries.find((entry) => entry.list === 'wanted')?.quantity ?? 0,
      forTrade: availableCopies(owned?.quantity ?? 0, owned?.forTrade ?? 0),
    };
  }

  async setQuantity(
    userId: string,
    externalId: number,
    list: LibraryList,
    quantity: number,
  ) {
    await this.products.requireCard(externalId);
    const filter = {
      userId: new Types.ObjectId(userId),
      productExternalId: externalId,
      list,
    };

    if (quantity === 0) {
      await this.entries.deleteOne(filter);
      return { list, quantity: 0, forTrade: 0 };
    }

    const current = await this.entries
      .findOne(filter)
      .select('forTrade')
      .lean();
    const forTrade =
      list === 'owned' ? availableCopies(quantity, current?.forTrade ?? 0) : 0;
    await this.entries.findOneAndUpdate(
      filter,
      { $set: { quantity, forTrade } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return { list, quantity, forTrade };
  }

  async setForTrade(userId: string, externalId: number, forTrade: number) {
    await this.products.requireCard(externalId);
    const filter = {
      userId: new Types.ObjectId(userId),
      productExternalId: externalId,
      list: 'owned' as const,
    };
    const owned = await this.entries.findOne(filter).select('quantity').lean();
    if (!owned) {
      throw new BadRequestException(
        'Guarda la carta en tu biblioteca antes de marcar copias para intercambio.',
      );
    }
    if (forTrade > owned.quantity) {
      throw new BadRequestException(
        'No puedes ofrecer más copias de las que tienes.',
      );
    }
    await this.entries.updateOne(filter, { $set: { forTrade } });
    return { forTrade, owned: owned.quantity };
  }

  private async publicOneList(
    userId: string,
    list: LibraryList,
    query: ShareCollectionQueryDto,
  ) {
    const owner = new Types.ObjectId(userId);
    const filter = toCardFilter(query);
    const lists = await this.listsFor(owner, gameOf(query.tcg));
    const rows = list === 'wanted' ? lists.wanted : lists.owned;
    const counts = lists.counts;
    const ids = rows.map((row) => row.productExternalId);
    const [facets, sets, page] = await Promise.all([
      this.products.facetsForExternalIds(ids),
      this.products.setsForExternalIds(ids),
      this.pageRows(rows, filter, query.page ?? 1),
    ]);
    return {
      counts: {
        owned: list === 'owned' ? counts.owned : { cards: 0, copies: 0 },
        wanted: list === 'wanted' ? counts.wanted : { cards: 0, copies: 0 },
        trades: { cards: 0, copies: 0 },
      },
      facets,
      sets,
      list: page,
    };
  }

  private quantityRows(userId: Types.ObjectId, list: LibraryList) {
    return this.entries
      .find({ userId, list })
      .select('productExternalId quantity forTrade')
      .lean();
  }

  private async pageRows(
    rows: QuantityRow[],
    filter: ProductFilterInput,
    page: number,
    limit = PUBLIC_PAGE_SIZE,
  ) {
    const quantities = new Map(
      rows.map((row) => [row.productExternalId, row.quantity]),
    );
    const trades = new Map(
      rows.map((row) => [row.productExternalId, row.forTrade ?? 0]),
    );
    const result = await this.products.pageByExternalIds(
      [...quantities.keys()],
      filter,
      page,
      limit,
    );
    const matched = new Set(result.matchedIds);
    let copies = 0;
    for (const [id, quantity] of quantities) {
      if (matched.has(id)) copies += quantity;
    }

    return {
      total: result.matchedIds.length,
      copies,
      page: result.page,
      limit: result.limit,
      entries: result.products.flatMap((product) => {
        const quantity = quantities.get(product.externalId);
        if (!quantity) return [];
        return [
          {
            quantity,
            forTrade: availableCopies(
              quantity,
              trades.get(product.externalId) ?? 0,
            ),
            product: toLibraryProduct(product),
          },
        ];
      }),
    };
  }

  private async listsFor(userId: Types.ObjectId, tcg: string) {
    const [owned, wanted] = await Promise.all([
      this.quantityRows(userId, 'owned'),
      this.quantityRows(userId, 'wanted'),
    ]);
    const [ownedRows, wantedRows] = await Promise.all([
      this.gameRows(owned, tcg),
      this.gameRows(wanted, tcg),
    ]);
    return {
      owned: ownedRows,
      wanted: wantedRows,
      counts: countsFrom(ownedRows, wantedRows),
    };
  }

  private async gameRows(rows: QuantityRow[], tcg: string) {
    const ids = await this.products.cardIdsForTcg(
      rows.map((row) => row.productExternalId),
      tcg,
    );
    const allowed = new Set(ids);
    return rows.filter((row) => allowed.has(row.productExternalId));
  }

  private async countLists(
    userId: Types.ObjectId,
    tcg = 'one-piece',
  ): Promise<LibraryCounts> {
    const lists = await this.listsFor(userId, tcg);
    return lists.counts;
  }

}

function gameOf(value?: string) {
  return value === 'riftbound' ? 'riftbound' : 'one-piece';
}

function countsFrom(owned: QuantityRow[], wanted: QuantityRow[]): LibraryCounts {
  let ownedCopies = 0;
  let tradeCards = 0;
  let tradeCopies = 0;
  for (const row of owned) {
    ownedCopies += row.quantity;
    const offered = row.forTrade ?? 0;
    if (offered > 0) {
      tradeCards += 1;
      tradeCopies += offered;
    }
  }
  return {
    owned: { cards: owned.length, copies: ownedCopies },
    wanted: {
      cards: wanted.length,
      copies: wanted.reduce((sum, row) => sum + row.quantity, 0),
    },
    trades: { cards: tradeCards, copies: tradeCopies },
  };
}

function toCardFilter(query: ShareCollectionQueryDto): ProductFilterInput {
  return {
    tcg: gameOf(query.tcg),
    type: 'card',
    set: query.set,
    q: query.q,
    color: query.color,
    rarity: query.rarity,
    cardType: query.cardType,
    attribute: query.attribute,
    cost: query.cost,
    sort: query.sort,
  };
}

function toLibraryProduct(product: Product) {
  const image = product.images?.[0];
  return {
    externalId: product.externalId,
    name: product.name,
    code: product.code,
    rarity: product.rarity,
    color: product.color,
    set: {
      name: product.set.name,
      code: product.set.code,
    },
    image: image?.small ?? image?.medium,
  };
}
