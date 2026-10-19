import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { Session } from '../auth/schemas/session.schema';
import { User } from '../auth/schemas/user.schema';
import { ProductsService } from '../catalog/products/products.service';
import { escapeRegex } from '../catalog/products/product-filter';
import { SyncRun } from '../catalog/schemas/sync-run.schema';
import { SetsService } from '../catalog/sets/sets.service';
import { ONE_PIECE_SLUG } from '../catalog/sync/catalog-sync.service';
import { LibraryEntry } from '../library/schemas/library-entry.schema';
import { BlockUserDto } from './dto/block-user.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users.query';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

const PAGE_SIZE = 20;

type ListTotals = {
  cards: number;
  copies: number;
  users: Types.ObjectId[];
};

@Injectable()
export class AdminService {
  constructor(
    private readonly authService: AuthService,
    private readonly productsService: ProductsService,
    private readonly setsService: SetsService,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    @InjectModel(LibraryEntry.name) private readonly library: Model<LibraryEntry>,
    @InjectModel(SyncRun.name) private readonly syncRuns: Model<SyncRun>,
  ) {}

  async overview() {
    const [total, blocked, sharing, sessions, libraryRows, catalog, sets, sync] =
      await Promise.all([
        this.users.countDocuments(),
        this.users.countDocuments({ blocked: true }),
        this.users.countDocuments({ shareEnabled: true }),
        this.sessions.countDocuments({ expiresAt: { $gt: new Date() } }),
        this.library.aggregate<ListTotals & { _id: 'owned' | 'wanted' }>([
          {
            $group: {
              _id: '$list',
              cards: { $sum: 1 },
              copies: { $sum: '$quantity' },
              users: { $addToSet: '$userId' },
            },
          },
        ]),
        this.productsService.countByType(ONE_PIECE_SLUG),
        this.setsService.count(ONE_PIECE_SLUG),
        this.syncRuns
          .findOne({ tcgSlug: ONE_PIECE_SLUG })
          .sort({ startedAt: -1 })
          .select('status startedAt finishedAt cards sealed productsUpserted error')
          .lean(),
      ]);

    return {
      users: { total, blocked, sharing },
      sessions,
      library: {
        owned: listSummary(libraryRows, 'owned'),
        wanted: listSummary(libraryRows, 'wanted'),
      },
      catalog: { ...catalog, sets },
      sync: sync
        ? {
            status: sync.status,
            startedAt: sync.startedAt,
            finishedAt: sync.finishedAt,
            cards: sync.cards,
            sealed: sync.sealed,
            products: sync.productsUpserted,
            error: sync.error,
          }
        : null,
    };
  }

  async usersPage(query: ListAdminUsersQueryDto) {
    const limit = PAGE_SIZE;
    const filter = userFilter(query.q);
    const total = await this.users.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(query.page ?? 1, pages);
    const rows = await this.users
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totals = await this.libraryTotals(rows.map((user) => user._id));
    return {
      data: rows.map((user) => this.toAdminUser(user, totals.get(user._id.toString()))),
      total,
      page,
      limit,
    };
  }

  async updateUser(id: string, patch: UpdateAdminUserDto) {
    if (patch.name === undefined && patch.shareEnabled === undefined) {
      throw new BadRequestException('No hay cambios que guardar');
    }
    const user = await this.requireUser(id);
    if (patch.name !== undefined) {
      user.name = patch.name;
    }
    if (patch.shareEnabled !== undefined) {
      if (patch.shareEnabled && !user.publicSlug) {
        const share = await this.authService.setShare(id, true);
        user.publicSlug = share.publicSlug;
        user.shareEnabled = share.shareEnabled;
      } else {
        user.shareEnabled = patch.shareEnabled;
      }
    }
    await user.save();
    return this.present(user._id);
  }

  async setBlocked(actorId: string, id: string, body: BlockUserDto) {
    if (actorId === id) {
      throw new BadRequestException('No puedes bloquear tu propia cuenta');
    }
    const user = await this.requireUser(id);
    user.blocked = body.blocked;
    await user.save();
    if (body.blocked) {
      await this.sessions.deleteMany({ userId: user._id });
    }
    return this.present(user._id);
  }

  async removeUser(actorId: string, id: string) {
    if (actorId === id) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }
    const user = await this.requireUser(id);
    if (this.authService.isAdminEmail(user.email)) {
      throw new BadRequestException('No se puede eliminar una cuenta de administración');
    }
    await Promise.all([
      this.sessions.deleteMany({ userId: user._id }),
      this.library.deleteMany({ userId: user._id }),
      this.users.deleteOne({ _id: user._id }),
    ]);
    return { ok: true };
  }

  private async present(id: Types.ObjectId) {
    const user = await this.users.findById(id).lean();
    if (!user) {
      throw new NotFoundException('No hay un usuario con ese id');
    }
    const totals = await this.libraryTotals([user._id]);
    return this.toAdminUser(user, totals.get(user._id.toString()));
  }

  private async requireUser(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('El identificador no es válido');
    }
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('No hay un usuario con ese id');
    }
    return user;
  }

  private toAdminUser(
    user: {
      _id: { toString(): string };
      email: string;
      name: string;
      picture?: string;
      publicSlug?: string;
      shareEnabled?: boolean;
      blocked?: boolean;
      createdAt?: Date;
    },
    lists?: { owned: ListCount; wanted: ListCount },
  ) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture,
      publicSlug: user.publicSlug,
      shareEnabled: Boolean(user.shareEnabled),
      blocked: Boolean(user.blocked),
      admin: this.authService.isAdminEmail(user.email),
      createdAt: user.createdAt,
      owned: lists?.owned ?? emptyList(),
      wanted: lists?.wanted ?? emptyList(),
    };
  }

  private async libraryTotals(ids: Types.ObjectId[]) {
    const totals = new Map<string, { owned: ListCount; wanted: ListCount }>();
    if (ids.length === 0) return totals;
    const rows = await this.library.aggregate<{
      _id: { userId: Types.ObjectId; list: 'owned' | 'wanted' };
      cards: number;
      copies: number;
    }>([
      { $match: { userId: { $in: ids } } },
      {
        $group: {
          _id: { userId: '$userId', list: '$list' },
          cards: { $sum: 1 },
          copies: { $sum: '$quantity' },
        },
      },
    ]);
    for (const row of rows) {
      const key = row._id.userId.toString();
      const current = totals.get(key) ?? { owned: emptyList(), wanted: emptyList() };
      current[row._id.list] = { cards: row.cards, copies: row.copies };
      totals.set(key, current);
    }
    return totals;
  }
}

type ListCount = { cards: number; copies: number };

function emptyList(): ListCount {
  return { cards: 0, copies: 0 };
}

function listSummary(rows: Array<ListTotals & { _id: 'owned' | 'wanted' }>, list: 'owned' | 'wanted') {
  const row = rows.find((item) => item._id === list);
  return {
    cards: row?.cards ?? 0,
    copies: row?.copies ?? 0,
    users: row?.users.length ?? 0,
  };
}

function userFilter(q: string | undefined): FilterQuery<User> {
  const term = q?.trim();
  if (!term) return {};
  const pattern = escapeRegex(term);
  return {
    $or: [
      { name: { $regex: pattern, $options: 'i' } },
      { email: { $regex: pattern, $options: 'i' } },
    ],
  };
}
