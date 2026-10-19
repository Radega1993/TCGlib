import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { ONE_PIECE_SLUG } from '../sync/catalog-sync.service';
import { Product } from '../schemas/product.schema';
import { UsageEvent } from '../schemas/usage-event.schema';
import { ListProductsQueryDto } from './dto/list-products.query';
import {
  buildProductFilter,
  escapeRegex,
  orderValues,
  ProductFilterInput,
} from './product-filter';

const COLOR_ORDER = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'];
const RARITY_ORDER = ['C', 'UC', 'R', 'SR', 'SEC', 'L', 'PR', 'TR', 'DON!!'];
const CARD_TYPE_ORDER = ['Leader', 'Character', 'Event', 'Stage', 'DON!!'];
const ATTRIBUTE_ORDER = ['Slash', 'Strike', 'Ranged', 'Special', 'Wisdom'];
const COST_ORDER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(UsageEvent.name) private readonly usage: Model<UsageEvent>,
  ) {}

  async findAll(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const filter = buildProductFilter(query);

    const term = query.q
      ?.trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80)
      .toLowerCase();
    if (term && term.length >= 2 && page === 1 && query.type !== 'sealed') {
      await this.recordUsage('search', term);
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ 'set.code': 1, code: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async findOne(externalId: number) {
    const data = await this.productModel.findOne({ externalId }).lean();
    if (!data) {
      throw new NotFoundException(`No hay un producto con id ${externalId}`);
    }
    if (data.type === 'card') {
      await this.recordUsage('view', String(data.externalId));
    }
    return { data };
  }

  async suggest(q: string, limit = 8) {
    const term = q.trim();
    if (term.length < 2) {
      return { data: [] };
    }

    const pattern = escapeRegex(term);
    const data = await this.productModel.aggregate([
      {
        $match: {
          tcgSlug: ONE_PIECE_SLUG,
          type: 'card',
          $or: [
            { name: { $regex: pattern, $options: 'i' } },
            { code: { $regex: pattern, $options: 'i' } },
          ],
        },
      },
      {
        $addFields: {
          rank: {
            $switch: {
              branches: [
                { case: regexMatch('$code', `^${pattern}$`), then: 0 },
                { case: regexMatch('$name', `^${pattern}$`), then: 1 },
                { case: regexMatch('$name', `${pattern}$`), then: 2 },
                { case: regexMatch('$name', `^${pattern}`), then: 3 },
                { case: regexMatch('$code', `^${pattern}`), then: 4 },
                { case: regexMatch('$name', pattern), then: 5 },
              ],
              default: 6,
            },
          },
          nameLength: { $strLenCP: '$name' },
        },
      },
      { $sort: { rank: 1, nameLength: 1, name: 1, code: 1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          externalId: 1,
          name: 1,
          code: 1,
          color: 1,
          rarity: 1,
          set: { code: '$set.code', name: '$set.name' },
          image: {
            $let: {
              vars: { firstImage: { $first: '$images' } },
              in: {
                $ifNull: ['$$firstImage.small', '$$firstImage.medium'],
              },
            },
          },
        },
      },
    ]);

    return { data };
  }

  async facets(tcgSlug = ONE_PIECE_SLUG) {
    const [result] = await this.productModel.aggregate<FacetGroups>([
      { $match: { tcgSlug, type: 'card' } },
      {
        $facet: {
          color: tokenFacet('color'),
          rarity: valueFacet('rarity'),
          cardType: valueFacet('cardType'),
          attribute: tokenFacet('cardAttribute'),
          cost: valueFacet('cost'),
        },
      },
    ]);

    const ids = (groups?: { _id: string }[]) =>
      groups?.map((item) => item._id) ?? [];

    return {
      data: {
        color: orderValues(ids(result?.color), COLOR_ORDER),
        rarity: orderValues(ids(result?.rarity), RARITY_ORDER),
        cardType: orderValues(ids(result?.cardType), CARD_TYPE_ORDER),
        attribute: orderValues(ids(result?.attribute), ATTRIBUTE_ORDER),
        cost: orderValues(ids(result?.cost), COST_ORDER),
      },
    };
  }

  private async recordUsage(kind: 'search' | 'view', key: string) {
    try {
      await this.usage.create({ kind, key });
    } catch {
      // Las métricas no deben tumbar el catálogo.
    }
  }

  async countByType(tcgSlug = ONE_PIECE_SLUG) {
    const [products, cards, sealed] = await Promise.all([
      this.productModel.countDocuments({ tcgSlug }),
      this.productModel.countDocuments({ tcgSlug, type: 'card' }),
      this.productModel.countDocuments({ tcgSlug, type: 'sealed' }),
    ]);
    return { products, cards, sealed };
  }

  async requireCard(externalId: number) {
    const card = await this.productModel
      .findOne({ externalId, type: 'card' })
      .lean();
    if (!card) {
      throw new NotFoundException(`No hay una carta con id ${externalId}`);
    }
    return card;
  }

  playableByCodes(codes: string[]) {
    if (codes.length === 0) return Promise.resolve([]);
    return this.productModel
      .find({
        tcgSlug: ONE_PIECE_SLUG,
        type: 'card',
        code: { $in: codes },
      })
      .select(
        'externalId name code cardType color cost images.small images.medium',
      )
      .lean();
  }

  searchPlayable(term: string, role: 'leader' | 'card') {
    const pattern = escapeRegex(term.trim());
    return this.productModel
      .find({
        tcgSlug: ONE_PIECE_SLUG,
        type: 'card',
        code: { $regex: '^[A-Z]{1,4}\\d{0,2}-\\d{3}$' },
        cardType:
          role === 'leader'
            ? 'Leader'
            : { $in: ['Character', 'Event', 'Stage'] },
        $or: [
          { name: { $regex: pattern, $options: 'i' } },
          { code: { $regex: pattern, $options: 'i' } },
        ],
      })
      .select(
        'externalId name code cardType color cost images.small images.medium',
      )
      .limit(120)
      .lean();
  }

  findCardsByExternalIds(externalIds: number[]) {
    if (externalIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.productModel
      .find({ externalId: { $in: externalIds }, type: 'card' })
      .select('externalId name code rarity color set images')
      .lean();
  }

  async pageByExternalIds(
    externalIds: number[],
    query: ProductFilterInput,
    page: number,
    limit: number,
  ) {
    if (externalIds.length === 0) {
      return {
        products: [] as Product[],
        matchedIds: [] as number[],
        page: 1,
        limit,
      };
    }

    const filter = buildProductFilter({ ...query, type: 'card' });
    filter.externalId = { $in: externalIds };
    const matched = await this.productModel
      .find(filter)
      .select('externalId')
      .lean();
    const matchedIds = matched.map((product) => product.externalId);
    const totalPages = Math.max(1, Math.ceil(matchedIds.length / limit));
    const current = Math.min(Math.max(page, 1), totalPages);
    const products =
      matchedIds.length === 0
        ? []
        : await this.productModel
            .find(filter)
            .collation({ locale: 'es' })
            .sort({ name: 1, code: 1 })
            .skip((current - 1) * limit)
            .limit(limit)
            .select('externalId name code rarity color set images')
            .lean();

    return { products, matchedIds, page: current, limit };
  }

  async facetsForExternalIds(externalIds: number[]) {
    if (externalIds.length === 0) {
      return emptyFacets();
    }

    const [result] = await this.productModel.aggregate<FacetGroups>([
      { $match: { externalId: { $in: externalIds }, type: 'card' } },
      {
        $facet: {
          color: tokenFacet('color'),
          rarity: valueFacet('rarity'),
          cardType: valueFacet('cardType'),
          attribute: tokenFacet('cardAttribute'),
          cost: valueFacet('cost'),
        },
      },
    ]);
    const ids = (groups?: { _id: string }[]) =>
      groups?.map((item) => item._id) ?? [];

    return {
      color: orderValues(ids(result?.color), COLOR_ORDER),
      rarity: orderValues(ids(result?.rarity), RARITY_ORDER),
      cardType: orderValues(ids(result?.cardType), CARD_TYPE_ORDER),
      attribute: orderValues(ids(result?.attribute), ATTRIBUTE_ORDER),
      cost: orderValues(ids(result?.cost), COST_ORDER),
    };
  }

  async setsForExternalIds(externalIds: number[]) {
    if (externalIds.length === 0) return [];
    const sets = await this.productModel.aggregate<{
      _id: string;
      name: string;
      code?: string;
    }>([
      { $match: { externalId: { $in: externalIds }, type: 'card' } },
      {
        $group: {
          _id: '$set.externalId',
          name: { $first: '$set.name' },
          code: { $first: '$set.code' },
        },
      },
      { $sort: { code: 1, name: 1 } },
    ]);
    return sets.map((set) => ({
      externalId: set._id,
      name: set.name,
      code: set.code,
    }));
  }

  progressCards() {
    return this.productModel
      .find({ tcgSlug: ONE_PIECE_SLUG, type: 'card' })
      .select({
        externalId: 1,
        name: 1,
        code: 1,
        cardType: 1,
        rarity: 1,
        'images.small': 1,
        'images.medium': 1,
        'set.externalId': 1,
        'set.name': 1,
        'set.code': 1,
      })
      .lean();
  }
}

type FacetGroups = {
  color: { _id: string }[];
  rarity: { _id: string }[];
  cardType: { _id: string }[];
  attribute: { _id: string }[];
  cost: { _id: string }[];
};

function valueFacet(field: string): PipelineStage.FacetPipelineStage[] {
  return [
    { $match: { [field]: { $type: 'string', $gt: '' } } },
    { $group: { _id: `$${field}` } },
  ];
}

function tokenFacet(field: string): PipelineStage.FacetPipelineStage[] {
  return [
    { $match: { [field]: { $type: 'string', $gt: '' } } },
    { $project: { parts: { $split: [`$${field}`, ';'] } } },
    { $unwind: '$parts' },
    { $match: { parts: { $gt: '' } } },
    { $group: { _id: '$parts' } },
  ];
}

function emptyFacets() {
  return {
    color: [] as string[],
    rarity: [] as string[],
    cardType: [] as string[],
    attribute: [] as string[],
    cost: [] as string[],
  };
}

function regexMatch(input: string, regex: string) {
  return {
    $regexMatch: {
      input: { $ifNull: [input, ''] },
      regex,
      options: 'i',
    },
  };
}
