import { Controller, Get, Param, Query } from '@nestjs/common';
import { ONE_PIECE_SLUG } from '../sync/catalog-sync.service';
import { ListSetsQueryDto } from './dto/list-sets.query';
import { SetsService } from './sets.service';

@Controller('sets')
export class SetsController {
  constructor(private readonly setsService: SetsService) {}

  @Get()
  findAll(@Query() query: ListSetsQueryDto) {
    return this.setsService.findAll(query.tcg ?? ONE_PIECE_SLUG);
  }

  @Get(':externalId')
  findOne(@Param('externalId') externalId: string) {
    return this.setsService.findOne(externalId);
  }
}
