import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductFilterInput } from '../catalog/products/product-filter';
import { ProductsService } from '../catalog/products/products.service';
import { Product } from '../catalog/schemas/product.schema';
import { ShareCollectionQueryDto } from './dto/share-collection.query';
import { LibraryEntry, LibraryList } from './schemas/library-entry.schema';

const PUBLIC_PAGE_SIZE = 24;

type LibraryCounts = {
  owned: { cards: number; copies: number };
  wanted: { cards: number; copies: number };
};

type QuantityRow = {
  productExternalId: number;
  quantity: number;
};

@Injectable()
export class LibraryService {
  constructor(
    @InjectModel(LibraryEntry.name)
    private readonly entries: Model<LibraryEntry>,
    private readonly products: ProductsService,
  ) {}

  async list(userId: string, list: LibraryList) {
    const owner = new Types.ObjectId(userId);
    const [entries, counts] = await Promise.all([
      this.entries.find({ userId: owner, list }).lean(),
      this.countLists(owner),
    ]);
    const cards = await this.products.findCardsByExternalIds(
      entries.map((entry) => entry.productExternalId),
    );
    const byId = new Map(cards.map((card) => [card.externalId, card]));

    const data = entries
      .flatMap((entry) => {
        const product = byId.get(entry.productExternalId);
        if (!product) return [];
        return [
          { quantity: entry.quantity, product: toLibraryProduct(product) },
        ];
      })
      .sort(
        (a, b) =>
          a.product.name.localeCompare(b.product.name, 'es') ||
          (a.product.code ?? '').localeCompare(b.product.code ?? '', 'es'),
      );

    return { data, list, counts };
  }

  async publicCollection(userId: string, query: ShareCollectionQueryDto) {
    const owner = new Types.ObjectId(userId);
    const filter = toCardFilter(query);
    const [ownedRows, wantedRows, counts] = await Promise.all([
      this.quantityRows(owner, 'owned'),
      this.quantityRows(owner, 'wanted'),
      this.countLists(owner),
    ]);
    const ids = [
      ...new Set([
        ...ownedRows.map((row) => row.productExternalId),
        ...wantedRows.map((row) => row.productExternalId),
      ]),
    ];
    const [facets, sets, owned, wanted] = await Promise.all([
      this.products.facetsForExternalIds(ids),
      this.products.setsForExternalIds(ids),
      this.pageRows(ownedRows, filter, query.page ?? 1),
      this.pageRows(wantedRows, filter, query.wanted ?? 1),
    ]);

    return { counts, facets, sets, owned, wanted };
  }

  async countsForCard(userId: string, externalId: number) {
    const entries = await this.entries
      .find({
        userId: new Types.ObjectId(userId),
        productExternalId: externalId,
      })
      .select('list quantity')
      .lean();
    return {
      owned: entries.find((entry) => entry.list === 'owned')?.quantity ?? 0,
      wanted: entries.find((entry) => entry.list === 'wanted')?.quantity ?? 0,
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
      return { list, quantity: 0 };
    }

    await this.entries.findOneAndUpdate(
      filter,
      { $set: { quantity } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return { list, quantity };
  }

  private quantityRows(userId: Types.ObjectId, list: LibraryList) {
    return this.entries
      .find({ userId, list })
      .select('productExternalId quantity')
      .lean();
  }

  private async pageRows(
    rows: QuantityRow[],
    filter: ProductFilterInput,
    page: number,
  ) {
    const quantities = new Map(
      rows.map((row) => [row.productExternalId, row.quantity]),
    );
    const result = await this.products.pageByExternalIds(
      [...quantities.keys()],
      filter,
      page,
      PUBLIC_PAGE_SIZE,
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
        return [{ quantity, product: toLibraryProduct(product) }];
      }),
    };
  }

  private async countLists(userId: Types.ObjectId): Promise<LibraryCounts> {
    const grouped = await this.entries.aggregate<{
      _id: LibraryList;
      cards: number;
      copies: number;
    }>([
      { $match: { userId } },
      {
        $group: {
          _id: '$list',
          cards: { $sum: 1 },
          copies: { $sum: '$quantity' },
        },
      },
    ]);

    const counts: LibraryCounts = {
      owned: { cards: 0, copies: 0 },
      wanted: { cards: 0, copies: 0 },
    };
    for (const group of grouped) {
      counts[group._id] = { cards: group.cards, copies: group.copies };
    }
    return counts;
  }
}

function toCardFilter(query: ShareCollectionQueryDto): ProductFilterInput {
  return {
    tcg: 'one-piece',
    type: 'card',
    set: query.set,
    q: query.q,
    color: query.color,
    rarity: query.rarity,
    cardType: query.cardType,
    attribute: query.attribute,
    cost: query.cost,
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
