import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

export type AuthState = {
  returnTo: string;
};

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function safeReturnPath(value: unknown, fallback = '/perfil') {
  if (typeof value !== 'string') return fallback;
  if (value.length === 0 || value.length > 300) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('://') || /[\s\\]/.test(value)) return fallback;
  if (value.startsWith('/entrar') || value.startsWith('/api')) return fallback;
  return value;
}

export function signState(
  secret: string,
  returnTo: string,
  expiresAt = Date.now() + 10 * 60 * 1000,
) {
  const payload = Buffer.from(
    JSON.stringify({ n: randomToken(16), e: expiresAt, r: returnTo }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyState(secret: string, state: string): AuthState | null {
  const [payload, signature] = state.split('.');
  if (!payload || !signature || state.split('.').length !== 2) return null;

  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { e?: unknown; r?: unknown };
    if (typeof data.e !== 'number' || data.e <= Date.now()) return null;
    return { returnTo: safeReturnPath(data.r) };
  } catch {
    return null;
  }
}

export function googleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', input.state);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}
