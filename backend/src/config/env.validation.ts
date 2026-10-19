export interface EnvConfig {
  MONGODB_URI: string;
  APITCG_API_KEY: string;
  APITCG_BASE_URL: string;
  PORT: number;
  CORS_ORIGIN: string;
  WEB_ORIGIN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  AUTH_STATE_SECRET: string;
  ADMIN_EMAILS: string;
}

function requiredString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const port = Number(config.PORT ?? 3001);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  const baseUrl = requiredString(
    {
      ...config,
      APITCG_BASE_URL:
        typeof config.APITCG_BASE_URL === 'string' &&
        config.APITCG_BASE_URL.trim() !== ''
          ? config.APITCG_BASE_URL
          : 'https://api.apitcg.com',
    },
    'APITCG_BASE_URL',
  );

  const corsOrigin =
    typeof config.CORS_ORIGIN === 'string' && config.CORS_ORIGIN.trim() !== ''
      ? config.CORS_ORIGIN.trim()
      : 'http://localhost:3000';
  const webOrigin =
    optionalString(config, 'WEB_ORIGIN') || corsOrigin.split(',')[0];
  const stateSecret = requiredString(config, 'AUTH_STATE_SECRET');
  if (stateSecret.length < 16) {
    throw new Error('AUTH_STATE_SECRET must be at least 16 characters');
  }

  return {
    MONGODB_URI: requiredString(config, 'MONGODB_URI'),
    APITCG_API_KEY: requiredString(config, 'APITCG_API_KEY'),
    APITCG_BASE_URL: baseUrl.replace(/\/$/, ''),
    PORT: port,
    CORS_ORIGIN: corsOrigin,
    WEB_ORIGIN: webOrigin.replace(/\/$/, ''),
    GOOGLE_CLIENT_ID: optionalString(config, 'GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: optionalString(config, 'GOOGLE_CLIENT_SECRET'),
    GOOGLE_REDIRECT_URI:
      optionalString(config, 'GOOGLE_REDIRECT_URI') ||
      `http://localhost:${port}/api/auth/google/callback`,
    AUTH_STATE_SECRET: stateSecret,
    ADMIN_EMAILS: optionalString(config, 'ADMIN_EMAILS'),
  };
}

function optionalString(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : '';
}
