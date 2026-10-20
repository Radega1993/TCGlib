import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateShareDto } from '../auth/dto/update-share.dto';
import { PublicUser } from '../auth/public-user';
import { DeckService } from './deck.service';
import {
  CreateDeckDto,
  ImportDeckDto,
  SaveDeckDto,
  SearchDeckQueryDto,
} from './dto/deck.dto';

@Controller('me/decks')
@UseGuards(AuthGuard)
export class DeckController {
  constructor(private readonly decks: DeckService) {}

  @Get()
  list(@CurrentUser() user: PublicUser) {
    return this.decks.list(user.id).then((data) => ({ data }));
  }

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() body: CreateDeckDto) {
    return this.decks.create(user.id, body).then((data) => ({ data }));
  }

  @Post('import')
  importNew(@CurrentUser() user: PublicUser, @Body() body: ImportDeckDto) {
    return this.decks
      .importNew(user.id, body.source)
      .then((data) => ({ data }));
  }

  @Get('suggestions')
  suggestions(@CurrentUser() user: PublicUser) {
    return this.decks.suggestions(user.id).then((data) => ({ data }));
  }

  @Get('suggestions/:slug')
  suggestion(@CurrentUser() user: PublicUser, @Param('slug') slug: string) {
    return this.decks.suggestion(user.id, slug).then((data) => ({ data }));
  }

  @Post('suggestions/:slug/wishlist')
  wish(@CurrentUser() user: PublicUser, @Param('slug') slug: string) {
    return this.decks
      .wishSuggestion(user.id, slug)
      .then((data) => ({ data }));
  }

  @Post('suggestions/:slug')
  adopt(@CurrentUser() user: PublicUser, @Param('slug') slug: string) {
    return this.decks
      .adoptSuggestion(user.id, slug)
      .then((data) => ({ data }));
  }

  @Get('search')
  search(@CurrentUser() user: PublicUser, @Query() query: SearchDeckQueryDto) {
    return this.decks
      .search(user.id, query.q, query.role)
      .then((data) => ({ data }));
  }

  @Get(':id')
  get(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.decks.get(user.id, id).then((data) => ({ data }));
  }

  @Put(':id')
  save(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() body: SaveDeckDto,
  ) {
    return this.decks.save(user.id, id, body).then((data) => ({ data }));
  }

  @Post(':id/preview')
  @HttpCode(200)
  preview(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() body: SaveDeckDto,
  ) {
    return this.decks.preview(user.id, id, body).then((data) => ({ data }));
  }

  @Post(':id/import')
  importInto(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() body: ImportDeckDto,
  ) {
    return this.decks
      .importInto(user.id, id, body.source)
      .then((data) => ({ data }));
  }

  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.decks.duplicate(user.id, id).then((data) => ({ data }));
  }

  @Post(':id/wishlist')
  @HttpCode(200)
  wishlist(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.decks.addMissing(user.id, id).then((data) => ({ data }));
  }

  @Put(':id/share')
  share(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() body: UpdateShareDto,
  ) {
    return this.decks
      .setShare(user.id, id, body.enabled)
      .then((data) => ({ data }));
  }

  @Post(':id/share/reset')
  resetShare(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.decks.resetShare(user.id, id).then((data) => ({ data }));
  }

  @Delete(':id')
  remove(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.decks.remove(user.id, id).then((data) => ({ data }));
  }
}
