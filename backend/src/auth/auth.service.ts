import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvConfig } from '../config/env.validation';
import { LoginCode } from './schemas/login-code.schema';
import { Session } from './schemas/session.schema';
import { User } from './schemas/user.schema';
import { BlockedAccountError } from './blocked-account.error';
import { PublicUser } from './public-user';
import {
  googleAuthorizationUrl,
  isPublicSlug,
  randomToken,
  safeReturnPath,
  sha256,
  signState,
  verifyState,
} from './state-token';

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Session.name) private readonly sessions: Model<Session>,
    @InjectModel(LoginCode.name) private readonly loginCodes: Model<LoginCode>,
  ) {}

  isGoogleConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }

  status() {
    return { google: this.isGoogleConfigured() };
  }

  createState(returnTo: unknown) {
    return signState(this.secret, safeReturnPath(returnTo));
  }

  readState(state: string) {
    return verifyState(this.secret, state);
  }

  authorizationUrl(state: string) {
    return googleAuthorizationUrl({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      state,
    });
  }

  webUrl(path: string) {
    const safe = path.startsWith('/') ? path : '/entrar';
    return `${this.webOrigin}${safe}`;
  }

  async loginWithGoogle(code: string, state: string) {
    const payload = this.readState(state);
    if (!payload) {
      throw new UnauthorizedException(
        'El acceso ha caducado. Vuelve a intentarlo.',
      );
    }
    if (!this.isGoogleConfigured()) {
      throw new UnauthorizedException('Google no está configurado');
    }

    const profile = await this.fetchGoogleProfile(code);
    const name = profile.name?.trim() || profile.email.split('@')[0];
    const user = await this.users.findOneAndUpdate(
      { googleId: profile.sub },
      {
        $set: {
          email: profile.email,
          ...(profile.picture ? { picture: profile.picture } : {}),
        },
        $setOnInsert: { name },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (user.blocked) {
      throw new BlockedAccountError();
    }

    const token = randomToken();
    const session = await this.sessions.create({
      tokenHash: sha256(token),
      userId: user._id,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
    });

    const exchange = randomToken();
    try {
      await this.loginCodes.create({
        codeHash: sha256(exchange),
        sessionToken: token,
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      });
    } catch (error) {
      await this.sessions.deleteOne({ _id: session._id });
      throw error;
    }

    return { exchange, returnTo: payload.returnTo };
  }

  async exchange(code: string) {
    const login = await this.loginCodes.findOneAndDelete({
      codeHash: sha256(code),
      expiresAt: { $gt: new Date() },
    });
    if (!login) {
      throw new UnauthorizedException('El código de acceso ha caducado');
    }
    return { token: login.sessionToken, maxAge: SESSION_MAX_AGE };
  }

  async userFromToken(token: string): Promise<PublicUser | null> {
    const session = await this.sessions
      .findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } })
      .lean();
    if (!session) return null;

    const user = await this.users.findById(session.userId).lean();
    if (!user || user.blocked) return null;
    return this.toPublicUser(user);
  }

  async publicProfile(slug: string) {
    if (!isPublicSlug(slug)) return null;
    const user = await this.users
      .findOne({ publicSlug: slug, shareEnabled: true })
      .select('name picture')
      .lean();
    if (!user) return null;
    return {
      id: user._id.toString(),
      name: user.name,
      picture: user.picture,
    };
  }

  async setShare(userId: string, enabled: boolean) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('La sesión no es válida');
    }
    if (enabled && !user.publicSlug) {
      user.publicSlug = await this.createUniqueSlug();
    }
    user.shareEnabled = enabled;
    await user.save();
    return {
      publicSlug: user.publicSlug,
      shareEnabled: user.shareEnabled,
    };
  }

  async resetShare(userId: string) {
    const publicSlug = await this.createUniqueSlug();
    const user = await this.users.findByIdAndUpdate(
      userId,
      { $set: { publicSlug, shareEnabled: true } },
      { new: true },
    );
    if (!user) {
      throw new UnauthorizedException('La sesión no es válida');
    }
    return { publicSlug: user.publicSlug, shareEnabled: true };
  }

  private toPublicUser(user: {
    _id: { toString(): string };
    email: string;
    name: string;
    picture?: string;
    publicSlug?: string;
    shareEnabled?: boolean;
  }): PublicUser {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture,
      publicSlug: user.publicSlug,
      shareEnabled: Boolean(user.shareEnabled),
      admin: this.isAdminEmail(user.email),
    };
  }

  private async createUniqueSlug() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = randomToken(9);
      const exists = await this.users.exists({ publicSlug: slug });
      if (!exists) return slug;
    }
    throw new UnauthorizedException('No se pudo crear el enlace público');
  }

  isAdminEmail(email: string) {
    return this.adminEmails.has(email.trim().toLowerCase());
  }

  async revokeToken(token: string) {
    await this.sessions.deleteOne({ tokenHash: sha256(token) });
  }

  private async fetchGoogleProfile(code: string): Promise<GoogleProfile> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) {
      throw new UnauthorizedException('Google no ha completado el acceso');
    }

    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) {
      throw new UnauthorizedException('Google no ha completado el acceso');
    }

    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { authorization: `Bearer ${tokenBody.access_token}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!profileResponse.ok) {
      throw new UnauthorizedException('Google no ha devuelto el perfil');
    }

    const profile = (await profileResponse.json()) as GoogleProfile;
    if (!profile.sub || !profile.email || profile.email_verified === false) {
      throw new UnauthorizedException(
        'La cuenta de Google no tiene un email verificado',
      );
    }
    return profile;
  }

  private get clientId() {
    return this.config.get('GOOGLE_CLIENT_ID');
  }

  private get clientSecret() {
    return this.config.get('GOOGLE_CLIENT_SECRET');
  }

  private get redirectUri() {
    return this.config.get('GOOGLE_REDIRECT_URI');
  }

  private get webOrigin() {
    return this.config.get('WEB_ORIGIN');
  }

  private get secret() {
    return this.config.get('AUTH_STATE_SECRET');
  }

  private get adminEmails() {
    return new Set(
      this.config
        .get('ADMIN_EMAILS')
        .split(',')
        .map((email: string) => email.trim().toLowerCase())
        .filter(Boolean),
    );
  }
}
