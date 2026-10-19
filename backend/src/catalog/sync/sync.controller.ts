import { Controller, Get } from '@nestjs/common';
import { CatalogSyncService, ONE_PIECE_SLUG } from './catalog-sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly catalogSyncService: CatalogSyncService) {}

  @Get(ONE_PIECE_SLUG)
  latest() {
    return this.catalogSyncService.latest(ONE_PIECE_SLUG);
  }
}
