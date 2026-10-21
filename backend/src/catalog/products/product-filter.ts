import { FilterQuery } from 'mongoose';
import { ONE_PIECE_SLUG } from '../sync/catalog-sync.service';
import { Product } from '../schemas/product.schema';

export const PRODUCT_SORTS = ['set', 'color', 'rarity'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

const COLOR_ORDER = [
  'Red',
  'Green',
  'Blue',
  'Purple',
  'Black',
  'Yellow',
  'Fury',
  'Calm',
  'Mind',
  'Body',
  'Chaos',
  'Order',
];
const RARITY_ORDER = [
  'C',
  'UC',
  'R',
  'SR',
  'SEC',
  'L',
  'PR',
  'TR',
  'DON!!',
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
  'Showcase',
];

export type ProductFilterInput = {
  tcg?: string;
  type?: string;
  set?: string;
  code?: string;
  q?: string;
  color?: string[];
  rarity?: string[];
  cardType?: string[];
  attribute?: string[];
  cost?: string[];
  sort?: ProductSort;
};

export function buildProductFilter(
  query: ProductFilterInput,
): FilterQuery<Product> {
  const filter: FilterQuery<Product> = {
    tcgSlug: query.tcg ?? ONE_PIECE_SLUG,
  };

  if (query.type) {
    filter.type = query.type;
  }
  if (query.set) {
    filter['set.externalId'] = query.set;
  }
  if (query.code) {
    filter.code = query.code;
  }
  if (query.rarity?.length) {
    filter.rarity = { $in: query.rarity };
  }
  if (query.cardType?.length) {
    filter.cardType = { $in: query.cardType };
  }
  if (query.cost?.length) {
    filter.cost = { $in: query.cost };
  }

  const clauses: FilterQuery<Product>[] = [];
  const colors = tokenClause('color', query.color);
  const attributes = tokenClause('cardAttribute', query.attribute);
  if (colors) clauses.push(colors);
  if (attributes) clauses.push(attributes);
  if (query.q) {
    const pattern = escapeRegex(query.q);
    clauses.push({
      $or: [
        { name: { $regex: pattern, $options: 'i' } },
        { code: { $regex: pattern, $options: 'i' } },
      ],
    });
  }

  if (clauses.length === 1) {
    Object.assign(filter, clauses[0]);
  } else if (clauses.length > 1) {
    filter.$and = clauses;
  }

  return filter;
}

export function productSort(sort: ProductSort = 'set'): Record<string, 1> {
  if (sort === 'color') {
    return { colorRank: 1, 'set.code': 1, code: 1, name: 1 };
  }
  if (sort === 'rarity') {
    return { rarityRank: 1, 'set.code': 1, code: 1, name: 1 };
  }
  return { 'set.code': 1, code: 1, name: 1 };
}

export function productSortFields(sort: ProductSort = 'set') {
  if (sort === 'color') return [colorRank()];
  if (sort === 'rarity') return [rarityRank()];
  return [];
}

function colorRank() {
  return {
    $addFields: {
      colorRank: ranked(
        {
          $trim: {
            input: {
              $arrayElemAt: [
                { $split: [{ $ifNull: ['$color', ''] }, ';'] },
                0,
              ],
            },
          },
        },
        COLOR_ORDER,
      ),
    },
  };
}

function rarityRank() {
  return {
    $addFields: {
      rarityRank: ranked({ $ifNull: ['$rarity', ''] }, RARITY_ORDER),
    },
  };
}

function ranked(value: unknown, order: readonly string[]) {
  return {
    $let: {
      vars: { rank: { $indexOfArray: [order, value] } },
      in: { $cond: [{ $lt: ['$$rank', 0] }, order.length, '$$rank'] },
    },
  };
}

export function orderValues(values: string[], preferred: readonly string[]) {
  const present = new Set(values.filter(Boolean));
  const known = preferred.filter((item) => present.has(item));
  const extra = [...present]
    .filter((item) => !preferred.includes(item))
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  return [...known, ...extra];
}

function tokenClause(
  field: string,
  values?: string[],
): FilterQuery<Product> | undefined {
  if (!values?.length) {
    return undefined;
  }
  return {
    $or: values.map((value) => ({
      [field]: { $regex: `(^|;)${escapeRegex(value)}(;|$)` },
    })),
  };
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
