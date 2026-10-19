import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../../config/env.validation';

const MAX_ATTEMPTS = 6;

@Injectable()
export class ApitcgClient {
  private readonly logger = new Logger(ApitcgClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ConfigService<EnvConfig, true>) {
    this.baseUrl = config.get('APITCG_BASE_URL');
    this.apiKey = config.get('APITCG_API_KEY');
  }

  async get<T>(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(path, `${this.baseUrl}/`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (response.status === 429 && attempt < MAX_ATTEMPTS) {
        const retryAfter = Number(response.headers.get('retry-after') ?? 2);
        const waitSeconds = Math.min(
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2,
          60,
        );
        this.logger.warn(
          `APITCG respondió 429. Reintento ${attempt} en ${waitSeconds}s`,
        );
        await delay(waitSeconds * 1000);
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `APITCG ${response.status} ${url.pathname}${url.search}: ${body.slice(0, 300)}`,
        );
      }

      return (await response.json()) as T;
    }

    throw new Error(`APITCG mantuvo el límite de ritmo en ${url.pathname}`);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
