import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PublicUser } from '../auth/public-user';
import { CollectionService } from './collection.service';
import {
  CollectionSetQueryDto,
  UpdateCollectionGoalDto,
} from './dto/collection.dto';

const SET_ID = /^[a-z0-9-]{1,120}$/;

@Controller('me/collection')
@UseGuards(AuthGuard)
export class CollectionController {
  constructor(private readonly collection: CollectionService) {}

  @Get()
  overview(
    @CurrentUser() user: PublicUser,
    @Query('tcg') tcg?: string,
  ) {
    return this.collection.overview(user.id, tcg).then((data) => ({ data }));
  }

  @Put('goal')
  saveGoal(
    @CurrentUser() user: PublicUser,
    @Body() body: UpdateCollectionGoalDto,
  ) {
    return this.collection.saveGoal(user.id, body).then((data) => ({ data }));
  }

  @Get('sets/:externalId')
  setDetail(
    @CurrentUser() user: PublicUser,
    @Param('externalId') externalId: string,
    @Query() query: CollectionSetQueryDto,
  ) {
    return this.collection
      .setDetail(
        user.id,
        setId(externalId),
        query.view ?? 'todas',
        query.page ?? 1,
        query.tcg,
      )
      .then((data) => ({ data }));
  }

  @Post('sets/:externalId/wishlist')
  @HttpCode(200)
  addMissing(
    @CurrentUser() user: PublicUser,
    @Param('externalId') externalId: string,
    @Query('tcg') tcg?: string,
  ) {
    return this.collection
      .addMissing(user.id, setId(externalId), tcg)
      .then((data) => ({ data }));
  }
}

function setId(externalId: string) {
  if (!SET_ID.test(externalId)) {
    throw new NotFoundException('No hay un set con ese id');
  }
  return externalId;
}
