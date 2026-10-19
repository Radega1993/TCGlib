import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { BlockedAccountError } from './blocked-account.error';
import { CurrentUser } from './current-user.decorator';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { AuthenticatedRequest, PublicUser } from './public-user';
import { safeReturnPath } from './state-token';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  status() {
    return { data: this.authService.status() };
  }

  @Get('google')
  start(@Query('return') returnTo: string | undefined, @Res() res: Response) {
    const back = safeReturnPath(returnTo);
    if (!this.authService.isGoogleConfigured()) {
      return res.redirect(
        this.authService.webUrl(
          `/entrar?error=config&return=${encodeURIComponent(back)}`,
        ),
      );
    }

    return res.redirect(
      this.authService.authorizationUrl(this.authService.createState(back)),
    );
  }

  @Get('google/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const payload = state ? this.authService.readState(state) : null;
    const returnTo = payload?.returnTo ?? '/biblioteca';
    if (error || !code || !state) {
      return res.redirect(
        this.authService.webUrl(
          `/entrar?error=${error ? 'cancelado' : 'google'}&return=${encodeURIComponent(returnTo)}`,
        ),
      );
    }

    try {
      const login = await this.authService.loginWithGoogle(code, state);
      return res.redirect(
        this.authService.webUrl(
          `/api/auth/complete?code=${encodeURIComponent(login.exchange)}&return=${encodeURIComponent(login.returnTo)}`,
        ),
      );
    } catch (error) {
      const reason = error instanceof BlockedAccountError ? 'bloqueado' : 'google';
      return res.redirect(
        this.authService.webUrl(
          `/entrar?error=${reason}&return=${encodeURIComponent(returnTo)}`,
        ),
      );
    }
  }

  @Post('exchange')
  async exchange(@Body() body: ExchangeCodeDto) {
    return { data: await this.authService.exchange(body.code) };
  }

  @Delete('session')
  @UseGuards(AuthGuard)
  async logout(@Req() request: AuthenticatedRequest) {
    await this.authService.revokeToken(request.sessionToken);
    return { data: { ok: true } };
  }
}

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  me(@CurrentUser() user: PublicUser) {
    return { data: user };
  }

  @Put('share')
  share(@CurrentUser() user: PublicUser, @Body() body: UpdateShareDto) {
    return this.authService
      .setShare(user.id, body.enabled)
      .then((data) => ({ data }));
  }

  @Post('share/reset')
  resetShare(@CurrentUser() user: PublicUser) {
    return this.authService.resetShare(user.id).then((data) => ({ data }));
  }
}
