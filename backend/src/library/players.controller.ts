import { Controller, Get, Query } from '@nestjs/common';
import { SearchPlayersQueryDto } from './dto/search-players.query';
import { PlayersService } from './players.service';

@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get()
  search(@Query() query: SearchPlayersQueryDto) {
    return this.players.search(query);
  }
}
