import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  ShareCollectionQueryDto,
  ShareTab,
} from './dto/share-collection.query';
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

    const collection = await this.library.publicBoard(
      profile.id,
      query,
      query.tab ?? tabForView(profile.view),
    );
    return {
      data: {
        name: profile.name,
        picture: profile.picture,
        ...collection,
      },
    };
  }
}

function tabForView(view: 'library' | 'wanted' | 'trades'): ShareTab {
  if (view === 'wanted') return 'busco';
  if (view === 'trades') return 'intercambio';
  return 'biblioteca';
}
