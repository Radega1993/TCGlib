import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { publicPlayerName } from '../auth/alias';
import { User } from '../auth/schemas/user.schema';
import { escapeRegex } from '../catalog/products/product-filter';
import { SearchPlayersQueryDto } from './dto/search-players.query';
import { LibraryEntry } from './schemas/library-entry.schema';

const PAGE_SIZE = 24;

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(LibraryEntry.name) private readonly entries: Model<LibraryEntry>,
  ) {}

  async search(query: SearchPlayersQueryDto) {
    const limit = PAGE_SIZE;
    const requested = query.page ?? 1;
    const filter = publicFilter(query.q);
    const total = await this.users.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requested, pages);
    const rows = await this.users
      .find(filter)
      .select('name alias picture publicSlug')
      .collation({ locale: 'es' })
      .sort({ alias: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const counts = await this.listCounts(rows.map((user) => user._id));

    return {
      data: rows.flatMap((user) => {
        if (!user.publicSlug) return [];
        const lists = counts.get(user._id.toString()) ?? {
          owned: 0,
          trades: 0,
          wanted: 0,
        };
        return [
          {
            name: publicPlayerName(user),
            picture: user.picture,
            slug: user.publicSlug,
            owned: lists.owned,
            trades: lists.trades,
            wanted: lists.wanted,
          },
        ];
      }),
      total,
      page,
      limit,
    };
  }

  private async listCounts(ids: Types.ObjectId[]) {
    const counts = new Map<
      string,
      { owned: number; trades: number; wanted: number }
    >();
    if (ids.length === 0) return counts;
    const rows = await this.entries.aggregate<{
      _id: Types.ObjectId;
      owned: number;
      trades: number;
      wanted: number;
    }>([
      { $match: { userId: { $in: ids } } },
      {
        $group: {
          _id: '$userId',
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
    ]);
    for (const row of rows) {
      counts.set(row._id.toString(), {
        owned: row.owned,
        trades: row.trades,
        wanted: row.wanted,
      });
    }
    return counts;
  }
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
