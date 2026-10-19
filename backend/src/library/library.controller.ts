import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PublicUser } from '../auth/public-user';
import { ListLibraryQueryDto } from './dto/list-library.query';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { LibraryService } from './library.service';

@Controller('me/library')
@UseGuards(AuthGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list(@CurrentUser() user: PublicUser, @Query() query: ListLibraryQueryDto) {
    return this.library.list(user.id, query.list ?? 'owned');
  }

  @Get('card/:externalId')
  card(
    @CurrentUser() user: PublicUser,
    @Param('externalId', ParseIntPipe) externalId: number,
  ) {
    return this.library
      .countsForCard(user.id, externalId)
      .then((data) => ({ data }));
  }

  @Put('trade')
  trade(@CurrentUser() user: PublicUser, @Body() body: UpdateTradeDto) {
    return this.library
      .setForTrade(user.id, body.externalId, body.forTrade)
      .then((data) => ({ data }));
  }

  @Put()
  update(@CurrentUser() user: PublicUser, @Body() body: UpdateLibraryDto) {
    return this.library
      .setQuantity(user.id, body.externalId, body.list, body.quantity)
      .then((data) => ({ data }));
  }
}
