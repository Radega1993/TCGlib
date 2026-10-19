import { Controller, Get, Param } from '@nestjs/common';
import { TcgsService } from './tcgs.service';

@Controller('tcgs')
export class TcgsController {
  constructor(private readonly tcgsService: TcgsService) {}

  @Get()
  findAll() {
    return this.tcgsService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.tcgsService.findOne(slug);
  }
}
