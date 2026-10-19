import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ShareCollectionQueryDto } from './dto/share-collection.query';
import { LibraryService } from './library.service';

@Controller('share')
export class ShareController {
  constructor(
    private readonly authService: AuthService,
    private readonly library: LibraryService,
  ) {}

  @Get(':slug')
  async show(
    @Param('slug') slug: string,
    @Query() query: ShareCollectionQueryDto,
  ) {
    const profile = await this.authService.publicProfile(slug);
    if (!profile) {
      throw new NotFoundException('Este enlace no está disponible');
    }

    const collection =
      profile.view === 'trades'
        ? await this.library.publicTrades(profile.id, query)
        : profile.view === 'wanted'
          ? await this.library.publicWanted(profile.id, query)
          : await this.library.publicLibrary(profile.id, query);
    return {
      data: {
        name: profile.name,
        picture: profile.picture,
        ...collection,
      },
    };
  }
}
