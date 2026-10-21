import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { publicPlayerName } from '../auth/alias';
import { User } from '../auth/schemas/user.schema';
import { escapeRegex } from '../catalog/products/product-filter';
import { SearchPlayersQueryDto } from './dto/search-players.query';

const PAGE_SIZE = 24;

type PlayerRow = {
  name: string;
  alias?: string;
  picture?: string;
  publicSlug?: string;
  owned: number;
  trades: number;
  wanted: number;
};

@Injectable()
export class PlayersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  async search(query: SearchPlayersQueryDto) {
    const limit = query.limit ?? PAGE_SIZE;
    const requested = query.page ?? 1;
    const term = query.q?.trim().slice(0, 40);
    const match = publicFilter(term);
    const tcg = gameOf(query.tcg);
    const total = await this.count(match, !term, tcg);
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requested, pages);
    const rows = total
      ? await this.users
          .aggregate<PlayerRow>([
            { $match: match },
            ...rankedStages(!term, tcg),
            { $sort: { cards: -1, activeMs: -1, lastSeenAt: -1, name: 1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                name: 1,
                alias: 1,
                picture: 1,
                publicSlug: 1,
                owned: 1,
                trades: 1,
                wanted: 1,
              },
            },
          ])
          .collation({ locale: 'es' })
      : [];

    return {
      data: rows.flatMap((user) => {
        if (!user.publicSlug) return [];
        return [
          {
            name: publicPlayerName(user),
            picture: user.picture,
            slug: user.publicSlug,
            owned: user.owned,
            trades: user.trades,
            wanted: user.wanted,
          },
        ];
      }),
      total,
      page,
      limit,
    };
  }

  private async count(
    match: Record<string, unknown>,
    requireActivity: boolean,
    tcg: string,
  ) {
    const [row] = await this.users.aggregate<{ n: number }>([
      { $match: match },
      ...rankedStages(requireActivity, tcg),
      { $count: 'n' },
    ]);
    return row?.n ?? 0;
  }
}

function gameOf(value?: string) {
  return value === 'riftbound' ? 'riftbound' : 'one-piece';
}

function rankedStages(requireActivity: boolean, tcg: string): PipelineStage[] {
  const stages: PipelineStage[] = [
    {
      $lookup: {
        from: 'library_entries',
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$userId', '$$id'] } } },
          {
            $lookup: {
              from: 'products',
              localField: 'productExternalId',
              foreignField: 'externalId',
              pipeline: [{ $project: { tcgSlug: 1, type: 1 } }],
              as: 'card',
            },
          },
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: [{ $first: '$card.tcgSlug' }, tcg] },
                  { $eq: [{ $first: '$card.type' }, 'card'] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              owned: { $sum: { $cond: [{ $eq: ['$list', 'owned'] }, 1, 0] } },
              wanted: { $sum: { $cond: [{ $eq: ['$list', 'wanted'] }, 1, 0] } },
              trades: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$list', 'owned'] },
                        { $gt: [{ $ifNull: ['$forTrade', 0] }, 0] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        as: 'lists',
      },
    },
    {
      $lookup: {
        from: 'sessions',
        let: { id: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$userId', '$$id'] } } },
          { $group: { _id: null, activeMs: { $sum: '$activeMs' } } },
        ],
        as: 'activity',
      },
    },
    {
      $addFields: {
        owned: { $ifNull: [{ $first: '$lists.owned' }, 0] },
        wanted: { $ifNull: [{ $first: '$lists.wanted' }, 0] },
        trades: { $ifNull: [{ $first: '$lists.trades' }, 0] },
        activeMs: { $ifNull: [{ $first: '$activity.activeMs' }, 0] },
        cards: {
          $add: [
            { $ifNull: [{ $first: '$lists.owned' }, 0] },
            { $ifNull: [{ $first: '$lists.wanted' }, 0] },
            { $ifNull: [{ $first: '$lists.trades' }, 0] },
          ],
        },
      },
    },
  ];
  if (requireActivity) {
    stages.push({
      $match: {
        $or: [
          { cards: { $gt: 0 } },
          { activeMs: { $gt: 0 } },
          { lastSeenAt: { $type: 'date' } },
        ],
      },
    });
  }
  return stages;
}

function publicFilter(raw: string | undefined) {
  const filter: Record<string, unknown> = {
    shareEnabled: true,
    blocked: { $ne: true },
    publicSlug: { $type: 'string', $ne: '' },
  };
  const term = raw?.trim().slice(0, 40);
  if (!term) return filter;
  const pattern = escapeRegex(term);
  filter.$or = [
    { alias: { $regex: pattern, $options: 'i' } },
    { name: { $regex: pattern, $options: 'i' } },
  ];
  return filter;
}
