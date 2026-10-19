import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { DeckService } from './deck.service';

@Controller('decks')
export class DeckPublicController {
  constructor(private readonly decks: DeckService) {}

  @Get(':slug')
  async show(@Param('slug') slug: string) {
    const data = await this.decks.publicView(slug);
    if (!data) throw new NotFoundException('Este enlace no está disponible');
    return { data };
  }
}
