import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products/products.service';
import { SetsService } from './sets/sets.service';
import { ONE_PIECE_SLUG } from './sync/catalog-sync.service';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly setsService: SetsService,
  ) {}

  @Get('stats')
  async stats(@Query('tcg') tcg = ONE_PIECE_SLUG) {
    const [counts, sets] = await Promise.all([
      this.productsService.countByType(tcg),
      this.setsService.count(tcg),
    ]);
    return { data: { tcg, sets, ...counts } };
  }

  @Get('facets')
  facets(@Query('tcg') tcg = ONE_PIECE_SLUG) {
    return this.productsService.facets(tcg);
  }
}
