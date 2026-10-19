import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductsService } from '../catalog/products/products.service';
import { Product } from '../catalog/schemas/product.schema';
import { LibraryEntry, LibraryList } from './schemas/library-entry.schema';

type LibraryCounts = {
  owned: { cards: number; copies: number };
  wanted: { cards: number; copies: number };
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
