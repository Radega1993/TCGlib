import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { parseAlias } from '../auth/alias';
import { AuthService } from '../auth/auth.service';
import {
  madridDayLabel,
  madridDaysAgo,
  recentMadridDays,
} from '../auth/madrid-time';
import { ActivityDay } from '../auth/schemas/activity-day.schema';
import { Session } from '../auth/schemas/session.schema';
import { User } from '../auth/schemas/user.schema';
import { ProductsService } from '../catalog/products/products.service';
import { escapeRegex } from '../catalog/products/product-filter';
import { SyncRun } from '../catalog/schemas/sync-run.schema';
import { UsageEvent } from '../catalog/schemas/usage-event.schema';
import { SetsService } from '../catalog/sets/sets.service';
import {
  CatalogSyncService,
  ONE_PIECE_SLUG,
  SYNC_GAMES,
} from '../catalog/sync/catalog-sync.service';
import { LibraryEntry } from '../library/schemas/library-entry.schema';
import { SuggestedDecksService } from '../library/suggested-decks.service';
import { BlockUserDto } from './dto/block-user.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users.query';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

const PAGE_SIZE = 25;
const RANK_LIMIT = 8;

type ListCount = { cards: number; copies: number; users: number };
type LibraryGroup = ListCount & { _id: 'owned' | 'wanted' | 'trades' };

@Injectable()
export class AdminService {
  constructor(
    private readonly authService: AuthService,
    private readonly productsService: ProductsService,
    private readonly setsService: SetsService,
    private readonly catalogSync: CatalogSyncService,
    private readonly suggestedDecks: SuggestedDecksService,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    @InjectModel(LibraryEntry.name)
    private readonly library: Model<LibraryEntry>,
    @InjectModel(SyncRun.name) private readonly syncRuns: Model<SyncRun>,
    @InjectModel(ActivityDay.name)
    private readonly activityDays: Model<ActivityDay>,
    @InjectModel(UsageEvent.name) private readonly usage: Model<UsageEvent>,
  ) {}

  async overview() {
    const today = madridDaysAgo(1);
    const week = madridDaysAgo(7);
    const month = madridDaysAgo(30);
    const days = recentMadridDays(14);
    const chartStart = madridDaysAgo(14);

    const [
      total,
      blocked,
      sharing,
      privateProfiles,
      activeToday,
      activeWeek,
      activeMonth,
      newWeek,
      newMonth,
      sessions,
      activity,
      libraryRows,
      catalog,
      sets,
      sync,
      signupRows,
      visitRows,
      wantedRows,
      ownedRows,
      searchRows,
      viewRows,
      suggestedDeckCount,
      tradeRows,
      gameRows,
    ] = await Promise.all([
      this.users.countDocuments(),
      this.users.countDocuments({ blocked: true }),
      this.users.countDocuments({ shareEnabled: true }),
      this.users.countDocuments({ shareEnabled: { $ne: true } }),
      this.users.countDocuments({ lastSeenAt: { $gte: today } }),
      this.users.countDocuments({ lastSeenAt: { $gte: week } }),
      this.users.countDocuments({ lastSeenAt: { $gte: month } }),
      this.users.countDocuments({ createdAt: { $gte: week } }),
      this.users.countDocuments({ createdAt: { $gte: month } }),
      this.sessions.countDocuments({ expiresAt: { $gt: new Date() } }),
      this.averageActivity(month),
      this.library.aggregate<LibraryGroup>([
        {
          $group: {
            _id: { list: '$list', userId: '$userId' },
            cards: { $sum: 1 },
            copies: { $sum: '$quantity' },
          },
        },
        {
          $group: {
            _id: '$_id.list',
            cards: { $sum: '$cards' },
            copies: { $sum: '$copies' },
            users: { $sum: 1 },
          },
        },
      ]),
      this.productsService.countByType(ONE_PIECE_SLUG),
      this.setsService.count(ONE_PIECE_SLUG),
      this.syncRuns
        .findOne({ tcgSlug: ONE_PIECE_SLUG })
        .sort({ startedAt: -1 })
        .select(
          'status startedAt finishedAt cards sealed productsUpserted error',
        )
        .lean(),
      this.users.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: chartStart } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Europe/Madrid',
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      this.activityDays.aggregate<{ _id: string; count: number }>([
        { $match: { day: { $gte: days[0] } } },
        { $group: { _id: '$day', count: { $sum: 1 } } },
      ]),
      this.topLibrary('wanted'),
      this.topLibrary('owned'),
      this.usage.aggregate<{ _id: string; count: number }>([
        { $match: { kind: 'search', createdAt: { $gte: month } } },
        { $group: { _id: '$key', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: RANK_LIMIT },
      ]),
      this.usage.aggregate<{ _id: string; count: number }>([
        { $match: { kind: 'view', createdAt: { $gte: month } } },
        { $group: { _id: '$key', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: RANK_LIMIT },
      ]),
      this.suggestedDecks.coverage(),
      this.library.aggregate<LibraryGroup>([
        { $match: { list: 'owned', forTrade: { $gt: 0 } } },
        {
          $group: {
            _id: '$userId',
            cards: { $sum: 1 },
            copies: { $sum: '$forTrade' },
          },
        },
        {
          $group: {
            _id: 'trades',
            cards: { $sum: '$cards' },
            copies: { $sum: '$copies' },
            users: { $sum: 1 },
          },
        },
      ]),
      this.gameCatalog(),
    ]);

    const [wanted, owned, viewed] = await Promise.all([
      this.hydrateCards(wantedRows),
      this.hydrateCards(ownedRows),
      this.hydrateViews(viewRows),
    ]);

    return {
      users: {
        total,
        blocked,
        sharing,
        private: privateProfiles,
        activeToday,
        activeWeek,
        activeMonth,
        newWeek,
        newMonth,
      },
      sessions,
      activity,
      library: {
        owned: listSummary(libraryRows, 'owned'),
        wanted: listSummary(libraryRows, 'wanted'),
        trades: listSummary(tradeRows, 'trades'),
      },
      catalog: { ...catalog, sets },
      sync: syncView(sync),
      signups: fillDays(days, signupRows),
      visits: fillDays(days, visitRows),
      wanted,
      owned,
      searched: searchRows.map((row) => ({ term: row._id, count: row.count })),
      viewed,
      games: gameRows,
      suggestedDecks: suggestedDeckCount,
    };
  }

  startSync(slug: string) {
    return this.catalogSync.start(slug);
  }

  refreshSuggestedDecks() {
    return this.suggestedDecks.refresh();
  }

  private gameCatalog() {
    return Promise.all(
      SYNC_GAMES.map(async (game) => {
        const [counts, sets, sync] = await Promise.all([
          this.productsService.countByType(game.slug),
          this.setsService.count(game.slug),
          this.syncRuns
            .findOne({ tcgSlug: game.slug })
            .sort({ startedAt: -1 })
            .select(
              'status startedAt finishedAt cards sealed productsUpserted error',
            )
            .lean(),
        ]);
        return {
          slug: game.slug,
          name: game.name,
          cards: counts.cards,
          sets,
          sync: syncView(sync),
        };
      }),
    );
  }

  async usersPage(query: ListAdminUsersQueryDto) {
    const limit = PAGE_SIZE;
    const filter = userFilter(query);
    const total = await this.users.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(query.page ?? 1, pages);
    const rows = await this.users
      .find(filter)
      .sort(userSort(query.sort))
      .collation({ locale: 'es' })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totals = await this.libraryTotals(rows.map((user) => user._id));
    return {
      data: rows.map((user) =>
        this.toAdminUser(user, totals.get(user._id.toString())),
      ),
      total,
      page,
      limit,
    };
  }

  async updateUser(id: string, patch: UpdateAdminUserDto) {
    if (patch.alias === undefined && patch.shareEnabled === undefined) {
      throw new BadRequestException('No hay cambios que guardar');
    }
    const user = await this.requireUser(id);
    if (patch.alias !== undefined) {
      user.set('alias', parseAlias(patch.alias) ?? undefined);
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
      throw new BadRequestException(
        'No se puede eliminar una cuenta de administración',
      );
    }
    await Promise.all([
      this.sessions.deleteMany({ userId: user._id }),
      this.library.deleteMany({ userId: user._id }),
      this.activityDays.deleteMany({ userId: user._id }),
      this.users.deleteOne({ _id: user._id }),
    ]);
    return { ok: true };
  }

  private async averageActivity(since: Date) {
    const [row] = await this.sessions.aggregate<{
      users: number;
      averageMs: number;
    }>([
      { $match: { lastSeenAt: { $gte: since }, activeMs: { $gt: 0 } } },
      { $group: { _id: '$userId', activeMs: { $sum: '$activeMs' } } },
      {
        $group: {
          _id: null,
          users: { $sum: 1 },
          averageMs: { $avg: '$activeMs' },
        },
      },
    ]);
    return {
      users: row?.users ?? 0,
      averageMs: Math.round(row?.averageMs ?? 0),
    };
  }

  private topLibrary(list: 'owned' | 'wanted') {
    return this.library.aggregate<{
      _id: number;
      copies: number;
      users: number;
    }>([
      { $match: { list } },
      {
        $group: {
          _id: '$productExternalId',
          copies: { $sum: '$quantity' },
          users: { $sum: 1 },
        },
      },
      { $sort: { users: -1, copies: -1 } },
      { $limit: RANK_LIMIT },
    ]);
  }

  private async hydrateCards(
    rows: { _id: number; copies: number; users: number }[],
  ) {
    const products = await this.productsService.findCardsByExternalIds(
      rows.map((row) => row._id),
    );
    const byId = new Map(
      products.map((product) => [product.externalId, product]),
    );
    return rows.flatMap((row) => {
      const product = byId.get(row._id);
      if (!product) return [];
      return [
        {
          externalId: product.externalId,
          name: product.name,
          code: product.code,
          image: cardImage(product.images),
          users: row.users,
          copies: row.copies,
        },
      ];
    });
  }

  private async hydrateViews(rows: { _id: string; count: number }[]) {
    const ids = rows
      .map((row) => Number(row._id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const products = await this.productsService.findCardsByExternalIds(ids);
    const byId = new Map(
      products.map((product) => [product.externalId, product]),
    );
    return rows.flatMap((row) => {
      const product = byId.get(Number(row._id));
      if (!product) return [];
      return [
        {
          externalId: product.externalId,
          name: product.name,
          code: product.code,
          image: cardImage(product.images),
          views: row.count,
        },
      ];
    });
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
      alias?: string | null;
      picture?: string;
      publicSlug?: string;
      shareEnabled?: boolean;
      blocked?: boolean;
      createdAt?: Date;
      lastSeenAt?: Date;
    },
    lists?: { owned: ListCount; wanted: ListCount; trades: ListCount },
  ) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      alias: user.alias || undefined,
      picture: user.picture,
      publicSlug: user.publicSlug,
      shareEnabled: Boolean(user.shareEnabled),
      blocked: Boolean(user.blocked),
      admin: this.authService.isAdminEmail(user.email),
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
      owned: lists?.owned ?? emptyList(),
      wanted: lists?.wanted ?? emptyList(),
      trades: lists?.trades ?? emptyList(),
    };
  }

  private async libraryTotals(ids: Types.ObjectId[]) {
    const totals = new Map<
      string,
      { owned: ListCount; wanted: ListCount; trades: ListCount }
    >();
    if (ids.length === 0) return totals;
    const rows = await this.library.aggregate<{
      _id: { userId: Types.ObjectId; list: 'owned' | 'wanted' };
      cards: number;
      copies: number;
      tradeCards: number;
      tradeCopies: number;
    }>([
      { $match: { userId: { $in: ids } } },
      {
        $group: {
          _id: { userId: '$userId', list: '$list' },
          cards: { $sum: 1 },
          copies: { $sum: '$quantity' },
          tradeCards: {
            $sum: {
              $cond: [{ $gt: [{ $ifNull: ['$forTrade', 0] }, 0] }, 1, 0],
            },
          },
          tradeCopies: { $sum: { $ifNull: ['$forTrade', 0] } },
        },
      },
    ]);
    for (const row of rows) {
      const key = row._id.userId.toString();
      const current = totals.get(key) ?? {
        owned: emptyList(),
        wanted: emptyList(),
        trades: emptyList(),
      };
      current[row._id.list] = {
        cards: row.cards,
        copies: row.copies,
        users: 1,
      };
      current.trades = {
        cards: current.trades.cards + row.tradeCards,
        copies: current.trades.copies + row.tradeCopies,
        users: 1,
      };
      totals.set(key, current);
    }
    return totals;
  }
}

function emptyList(): ListCount {
  return { cards: 0, copies: 0, users: 0 };
}

function syncView(
  sync: {
    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    finishedAt?: Date;
    cards?: number;
    sealed?: number;
    productsUpserted?: number;
    error?: string;
  } | null,
) {
  if (!sync) return null;
  return {
    status: sync.status,
    startedAt: sync.startedAt,
    finishedAt: sync.finishedAt,
    cards: sync.cards ?? 0,
    sealed: sync.sealed ?? 0,
    products: sync.productsUpserted ?? 0,
    error: sync.error,
  };
}

function listSummary(
  rows: LibraryGroup[],
  list: 'owned' | 'wanted' | 'trades',
): ListCount {
  const row = rows.find((item) => item._id === list);
  return {
    cards: row?.cards ?? 0,
    copies: row?.copies ?? 0,
    users: row?.users ?? 0,
  };
}

function fillDays(days: string[], rows: { _id: string; count: number }[]) {
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return days.map((day) => ({
    day,
    label: madridDayLabel(day),
    count: counts.get(day) ?? 0,
  }));
}

function userFilter(query: ListAdminUsersQueryDto): FilterQuery<User> {
  const filter: FilterQuery<User> = {};
  if (query.status === 'blocked') filter.blocked = true;
  if (query.status === 'sharing') filter.shareEnabled = true;
  if (query.status === 'private') filter.shareEnabled = { $ne: true };
  if (query.status === 'active') filter.lastSeenAt = { $gte: madridDaysAgo(7) };
  const term = query.q?.trim();
  if (!term) return filter;
  const pattern = escapeRegex(term);
  filter.$or = [
    { name: { $regex: pattern, $options: 'i' } },
    { alias: { $regex: pattern, $options: 'i' } },
    { email: { $regex: pattern, $options: 'i' } },
  ];
  return filter;
}

function userSort(
  sort: ListAdminUsersQueryDto['sort'],
): Record<string, 1 | -1> {
  if (sort === 'name') return { name: 1 };
  if (sort === 'activity') return { lastSeenAt: -1, createdAt: -1 };
  return { createdAt: -1 };
}

function cardImage(images?: { small?: string; medium?: string }[]) {
  const first = images?.[0];
  return first?.small || first?.medium;
}
