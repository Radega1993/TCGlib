import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApitcgClient } from './apitcg/apitcg.client';
import { CatalogController } from './catalog.controller';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { CardSet, CardSetSchema } from './schemas/card-set.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { SyncRun, SyncRunSchema } from './schemas/sync-run.schema';
import { Tcg, TcgSchema } from './schemas/tcg.schema';
import { SetsController } from './sets/sets.controller';
import { SetsService } from './sets/sets.service';
import { CatalogSyncService } from './sync/catalog-sync.service';
import { SyncController } from './sync/sync.controller';
import { TcgsController } from './tcgs/tcgs.controller';
import { TcgsService } from './tcgs/tcgs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tcg.name, schema: TcgSchema },
      { name: CardSet.name, schema: CardSetSchema },
      { name: Product.name, schema: ProductSchema },
      { name: SyncRun.name, schema: SyncRunSchema },
    ]),
  ],
  controllers: [
    CatalogController,
    TcgsController,
    SetsController,
    ProductsController,
    SyncController,
  ],
  providers: [
    ApitcgClient,
    CatalogSyncService,
    TcgsService,
    SetsService,
    ProductsService,
  ],
  exports: [ProductsService],
})
export class CatalogModule {}
