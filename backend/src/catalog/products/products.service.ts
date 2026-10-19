import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { ONE_PIECE_SLUG } from '../sync/catalog-sync.service';
import { Product } from '../schemas/product.schema';
import { ListProductsQueryDto } from './dto/list-products.query';
import { buildProductFilter, escapeRegex, orderValues } from './product-filter';

const COLOR_ORDER = ['Red', 'Green', 'Blue', 'Purple', 'Black', 'Yellow'];
const RARITY_ORDER = ['C', 'UC', 'R', 'SR', 'SEC', 'L', 'PR', 'TR', 'DON!!'];
const CARD_TYPE_ORDER = ['Leader', 'Character', 'Event', 'Stage', 'DON!!'];
const ATTRIBUTE_ORDER = ['Slash', 'Strike', 'Ranged', 'Special', 'Wisdom'];
const COST_ORDER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async findAll(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const filter = buildProductFilter(query);

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

  findCardsByExternalIds(externalIds: number[]) {
    if (externalIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.productModel
      .find({ externalId: { $in: externalIds }, type: 'card' })
      .select('externalId name code rarity color set images')
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

function regexMatch(input: string, regex: string) {
  return {
    $regexMatch: {
      input: { $ifNull: [input, ''] },
      regex,
      options: 'i',
    },
  };
}
