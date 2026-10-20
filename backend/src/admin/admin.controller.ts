import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PublicUser } from '../auth/public-user';
import { AdminService } from './admin.service';
import { BlockUserDto } from './dto/block-user.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users.query';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.overview().then((data) => ({ data }));
  }

  @Post('sync/:slug')
  sync(@Param('slug') slug: string) {
    return { data: this.adminService.startSync(slug) };
  }

  @Post('suggested-decks')
  suggestedDecks() {
    return this.adminService
      .refreshSuggestedDecks()
      .then((data) => ({ data }));
  }

  @Get('users')
  users(@Query() query: ListAdminUsersQueryDto) {
    return this.adminService.usersPage(query);
  }

  @Put('users/:id')
  update(@Param('id') id: string, @Body() body: UpdateAdminUserDto) {
    return this.adminService.updateUser(id, body).then((data) => ({ data }));
  }

  @Put('users/:id/block')
  block(
    @CurrentUser() actor: PublicUser,
    @Param('id') id: string,
    @Body() body: BlockUserDto,
  ) {
    return this.adminService
      .setBlocked(actor.id, id, body)
      .then((data) => ({ data }));
  }

  @Delete('users/:id')
  remove(@CurrentUser() actor: PublicUser, @Param('id') id: string) {
    return this.adminService.removeUser(actor.id, id).then((data) => ({ data }));
  }
}
