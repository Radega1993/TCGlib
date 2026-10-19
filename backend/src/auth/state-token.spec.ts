import {
  googleAuthorizationUrl,
  safeReturnPath,
  signState,
  verifyState,
} from './state-token';

const SECRET = 'test-secret-with-enough-length';

describe('auth state', () => {
  it('roundtrips the return path', () => {
    const state = signState(SECRET, '/products/9804');
    expect(verifyState(SECRET, state)).toEqual({ returnTo: '/products/9804' });
  });

  it('rejects a tampered or expired state', () => {
    const state = signState(SECRET, '/perfil');
    expect(verifyState(SECRET, `${state}x`)).toBeNull();
    expect(verifyState('other-secret-with-enough-length', state)).toBeNull();
    expect(
      verifyState(SECRET, signState(SECRET, '/perfil', Date.now() - 1000)),
    ).toBeNull();
  });

  it('only allows internal return paths', () => {
    expect(safeReturnPath('/perfil?lista=buscando')).toBe(
      '/perfil?lista=buscando',
    );
    expect(safeReturnPath('https://evil.example')).toBe('/perfil');
    expect(safeReturnPath('//evil.example')).toBe('/perfil');
    expect(safeReturnPath('/entrar')).toBe('/perfil');
  });
});

describe('googleAuthorizationUrl', () => {
  it('points at Google with the code flow', () => {
    const url = new URL(
      googleAuthorizationUrl({
        clientId: 'client',
        redirectUri: 'http://localhost:3001/api/auth/google/callback',
        state: 'signed',
      }),
    );
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3001/api/auth/google/callback',
    );
  });
});
