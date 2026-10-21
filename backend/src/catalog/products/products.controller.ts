import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ListProductsQueryDto } from './dto/list-products.query';
import { SuggestProductsQueryDto } from './dto/suggest-products.query';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('suggest')
  suggest(@Query() query: SuggestProductsQueryDto) {
    return this.productsService.suggest(
      query.q ?? '',
      query.limit ?? 8,
      query.tcg,
    );
  }

  @Get(':externalId')
  findOne(@Param('externalId', ParseIntPipe) externalId: number) {
    return this.productsService.findOne(externalId);
  }
}
