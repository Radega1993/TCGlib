import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model } from 'mongoose';
import {
  ApitcgListResponse,
  ApitcgItemResponse,
  ApitcgProduct,
  ApitcgSet,
  ApitcgTcg,
} from '../apitcg/apitcg.types';
import { ApitcgClient } from '../apitcg/apitcg.client';
import { CardSet } from '../schemas/card-set.schema';
import { Product } from '../schemas/product.schema';
import { SyncRun } from '../schemas/sync-run.schema';
import { Tcg } from '../schemas/tcg.schema';
import { mapProduct, mapSet, mapTcg, ProductRecord } from './map-catalog';

export const ONE_PIECE_SLUG = 'one-piece';
export const RIFTBOUND_SLUG = 'riftbound';
const PAGE_SIZE = 100;
const PAGE_DELAY_MS = 150;

export const SYNC_GAMES = [
  { slug: ONE_PIECE_SLUG, name: 'One Piece' },
  { slug: RIFTBOUND_SLUG, name: 'Riftbound' },
] as const;

export interface SyncOnePieceResult {
  tcgSlug: typeof ONE_PIECE_SLUG;
  sets: number;
  products: number;
  cards: number;
  sealed: number;
  requests: number;
  startedAt: string;
  finishedAt: string;
}

@Injectable()
export class CatalogSyncService implements OnModuleInit {
  private readonly logger = new Logger(CatalogSyncService.name);
  private readonly jobs = new Set<string>();

  constructor(
    private readonly apitcg: ApitcgClient,
    @InjectModel(Tcg.name) private readonly tcgModel: Model<Tcg>,
    @InjectModel(CardSet.name) private readonly setModel: Model<CardSet>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(SyncRun.name) private readonly syncRunModel: Model<SyncRun>,
  ) {}

  async onModuleInit() {
    await this.syncRunModel.updateMany(
      { status: 'running' },
      {
        $set: {
          status: 'failed',
          finishedAt: new Date(),
          error: 'La actualización se interrumpió al reiniciar.',
        },
      },
    );
  }

  start(slug: string) {
    const game = SYNC_GAMES.find((item) => item.slug === slug);
    if (!game) {
      throw new NotFoundException('Ese juego no se puede actualizar.');
    }
    if (this.jobs.has(slug)) {
      throw new ConflictException(
        'Ya hay una actualización de este juego en curso.',
      );
    }
    this.jobs.add(slug);
    const task =
      slug === RIFTBOUND_SLUG ? this.syncCards(slug) : this.syncOnePiece();
    void task
      .catch((error: unknown) => {
        this.logger.error(
          error instanceof Error ? error.message : String(error),
        );
      })
      .finally(() => {
        this.jobs.delete(slug);
      });
    return { slug: game.slug, name: game.name, status: 'running' as const };
  }

  async latest(tcgSlug = ONE_PIECE_SLUG) {
    const data = await this.syncRunModel
      .findOne({ tcgSlug })
      .sort({ startedAt: -1 })
      .lean();
    return { data };
  }

  async syncOnePiece(): Promise<SyncOnePieceResult> {
    const startedAt = new Date();
    const run = await this.syncRunModel.create({
      tcgSlug: ONE_PIECE_SLUG,
      status: 'running',
      startedAt,
    });

    let requests = 0;
    let setsUpserted = 0;
    let productsUpserted = 0;
    let cards = 0;
    let sealed = 0;

    try {
      requests += 1;
      const tcgResponse = await this.apitcg.get<ApitcgItemResponse<ApitcgTcg>>(
        `/api/tcgs/${ONE_PIECE_SLUG}`,
      );
      const tcg = mapTcg(tcgResponse.data, new Date());
      await this.tcgModel.updateOne(
        { slug: tcg.slug },
        { $set: tcg },
        { upsert: true },
      );
      this.logger.log(`TCG ${tcg.name} guardado`);

      requests += 1;
      const setsResponse = await this.apitcg.get<ApitcgListResponse<ApitcgSet>>(
        `/api/${ONE_PIECE_SLUG}/sets`,
      );
      const syncedSetsAt = new Date();
      const sets = setsResponse.data.map((set) => mapSet(set, syncedSetsAt));
      if (sets.length > 0) {
        await this.setModel.bulkWrite(
          sets.map((set) => ({
            updateOne: {
              filter: { externalId: set.externalId },
              update: { $set: set },
              upsert: true,
            },
          })),
          { ordered: true },
        );
      }
      setsUpserted = sets.length;
      this.logger.log(`${setsUpserted} sets guardados`);

      let afterId = 0;
      let page = 0;
      while (true) {
        requests += 1;
        const response = await this.apitcg.get<
          ApitcgListResponse<ApitcgProduct>
        >('/api/products', {
          tcg: ONE_PIECE_SLUG,
          sortBy: '_id',
          sortOrder: 'asc',
          limit: PAGE_SIZE,
          afterId,
        });

        if (!response.data?.length) {
          break;
        }

        const lastId = response.data[response.data.length - 1]._id;
        if (typeof lastId !== 'number' || lastId <= afterId) {
          throw new Error(
            `El cursor de APITCG no avanzó (afterId=${afterId}, lastId=${String(lastId)})`,
          );
        }

        const records = response.data.map((product) =>
          mapProduct(product, new Date()),
        );
        await this.upsertProducts(records);

        page += 1;
        productsUpserted += records.length;
        cards += records.filter((record) => record.type === 'card').length;
        sealed += records.filter((record) => record.type === 'sealed').length;
        afterId = lastId;

        await this.syncRunModel.updateOne(
          { _id: run._id },
          {
            $set: {
              requests,
              setsUpserted,
              productsUpserted,
              cards,
              sealed,
            },
          },
        );
        this.logger.log(
          `Página ${page}: ${records.length} productos (cursor ${afterId}, acumulado ${productsUpserted})`,
        );
        await delay(PAGE_DELAY_MS);
      }

      const finishedAt = new Date();
      await this.syncRunModel.updateOne(
        { _id: run._id },
        {
          $set: {
            status: 'completed',
            finishedAt,
            requests,
            setsUpserted,
            productsUpserted,
            cards,
            sealed,
          },
        },
      );

      const result: SyncOnePieceResult = {
        tcgSlug: ONE_PIECE_SLUG,
        sets: setsUpserted,
        products: productsUpserted,
        cards,
        sealed,
        requests,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      };
      this.logger.log(
        `Sincronización terminada: ${cards} cartas, ${sealed} sellados, ${requests} peticiones`,
      );
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.syncRunModel.updateOne(
        { _id: run._id },
        {
          $set: {
            status: 'failed',
            finishedAt: new Date(),
            requests,
            setsUpserted,
            productsUpserted,
            cards,
            sealed,
            error: message,
          },
        },
      );
      throw error;
    }
  }

  async syncCards(slug: typeof RIFTBOUND_SLUG) {
    const startedAt = new Date();
    const run = await this.syncRunModel.create({
      tcgSlug: slug,
      status: 'running',
      startedAt,
    });

    let requests = 0;
    let setsUpserted = 0;
    let productsUpserted = 0;
    let cards = 0;
    const sealed = 0;
    const usedSets = new Set<string>();

    try {
      requests += 1;
      const tcgResponse = await this.apitcg.get<ApitcgItemResponse<ApitcgTcg>>(
        `/api/tcgs/${slug}`,
      );
      const tcg = mapTcg(tcgResponse.data, new Date());
      await this.tcgModel.updateOne(
        { slug: tcg.slug },
        { $set: tcg },
        { upsert: true },
      );

      requests += 1;
      const setsResponse = await this.apitcg.get<ApitcgListResponse<ApitcgSet>>(
        `/api/${slug}/sets`,
      );
      const syncedSetsAt = new Date();
      const sets = setsResponse.data.map((set) => mapSet(set, syncedSetsAt));

      let afterId = 0;
      let page = 0;
      while (true) {
        requests += 1;
        const response = await this.apitcg.get<
          ApitcgListResponse<ApitcgProduct>
        >('/api/products', {
          tcg: slug,
          type: 'card',
          sortBy: '_id',
          sortOrder: 'asc',
          limit: PAGE_SIZE,
          afterId,
        });

        if (!response.data?.length) break;

        const lastId = response.data[response.data.length - 1]._id;
        if (typeof lastId !== 'number' || lastId <= afterId) {
          throw new Error(
            `El cursor de APITCG no avanzó (afterId=${afterId}, lastId=${String(lastId)})`,
          );
        }

        const records = response.data
          .map((product) => mapProduct(product, new Date()))
          .filter((record) => record.type === 'card');
        if (records.length > 0) {
          await this.upsertProducts(records);
          for (const record of records) usedSets.add(record.set.externalId);
        }

        page += 1;
        productsUpserted += records.length;
        cards += records.length;
        afterId = lastId;

        await this.syncRunModel.updateOne(
          { _id: run._id },
          {
            $set: {
              requests,
              setsUpserted,
              productsUpserted,
              cards,
              sealed,
            },
          },
        );
        this.logger.log(
          `Página ${page}: ${records.length} cartas de ${slug} (cursor ${afterId}, acumulado ${productsUpserted})`,
        );
        await delay(PAGE_DELAY_MS);
      }

      const cardSets = sets.filter((set) => usedSets.has(set.externalId));
      if (cardSets.length > 0) {
        await this.setModel.bulkWrite(
          cardSets.map((set) => ({
            updateOne: {
              filter: { externalId: set.externalId },
              update: { $set: set },
              upsert: true,
            },
          })),
          { ordered: true },
        );
      }
      setsUpserted = cardSets.length;

      const finishedAt = new Date();
      await this.syncRunModel.updateOne(
        { _id: run._id },
        {
          $set: {
            status: 'completed',
            finishedAt,
            requests,
            setsUpserted,
            productsUpserted,
            cards,
            sealed,
          },
        },
      );
      this.logger.log(
        `Sincronización de ${slug} terminada: ${cards} cartas, ${setsUpserted} colecciones, ${requests} peticiones`,
      );
      return {
        tcgSlug: slug,
        sets: setsUpserted,
        products: productsUpserted,
        cards,
        sealed,
        requests,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.syncRunModel.updateOne(
        { _id: run._id },
        {
          $set: {
            status: 'failed',
            finishedAt: new Date(),
            requests,
            setsUpserted,
            productsUpserted,
            cards,
            sealed,
            error: message,
          },
        },
      );
      throw error;
    }
  }

  private upsertProducts(records: ProductRecord[]) {
    const operations: AnyBulkWriteOperation<Product>[] = records.map(
      (record) => ({
        updateOne: {
          filter: { externalId: record.externalId },
          update: { $set: record },
          upsert: true,
        },
      }),
    );
    return this.productModel.bulkWrite(operations, { ordered: true });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
