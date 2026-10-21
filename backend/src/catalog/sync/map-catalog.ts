import { ApitcgProduct, ApitcgSet, ApitcgTcg } from '../apitcg/apitcg.types';

export interface TcgRecord {
  slug: string;
  name: string;
  description?: string;
  logo?: string;
  markets?: ApitcgTcg['markets'];
  sourceCreatedAt?: Date;
  sourceUpdatedAt?: Date;
  syncedAt: Date;
}

export interface CardSetRecord {
  externalId: string;
  tcgSlug: string;
  name: string;
  slug: string;
  code?: string;
  releaseDate?: Date;
  serie?: string | null;
  markets?: ApitcgSet['markets'];
  sourceCreatedAt?: Date;
  sourceUpdatedAt?: Date;
  syncedAt: Date;
}

export interface ProductSetSnapshotRecord {
  externalId: string;
  name: string;
  slug: string;
  code?: string;
}

export interface ProductRecord {
  externalId: number;
  type: string;
  name: string;
  tcgSlug: string;
  set: ProductSetSnapshotRecord;
  code?: string;
  images: { small?: string; medium?: string; large?: string }[];
  attributes: Record<string, string>;
  rarity?: string;
  color?: string;
  cardType?: string;
  cost?: string;
  power?: string;
  life?: string;
  artist?: string;
  cardNumber?: string;
  subtypes?: string;
  cardAttribute?: string;
  markets?: ApitcgProduct['markets'];
  sourceCreatedAt?: Date;
  sourceUpdatedAt?: Date;
  syncedAt: Date;
}

export function mapTcg(tcg: ApitcgTcg, syncedAt: Date): TcgRecord {
  return omitUndefined({
    slug: tcg._id,
    name: tcg.name,
    description: tcg.description,
    logo: tcg.logo,
    markets: tcg.markets,
    sourceCreatedAt: toDate(tcg.createdAt),
    sourceUpdatedAt: toDate(tcg.updatedAt),
    syncedAt,
  });
}

export function mapSet(set: ApitcgSet, syncedAt: Date): CardSetRecord {
  const tcgSlug = typeof set.tcg === 'string' ? set.tcg : set.tcg._id;
  return omitUndefined({
    externalId: set._id,
    tcgSlug,
    name: set.name,
    slug: set.slug,
    code: set.code,
    releaseDate: toDate(set.release_date),
    serie: set.serie ?? null,
    markets: set.markets,
    sourceCreatedAt: toDate(set.createdAt),
    sourceUpdatedAt: toDate(set.updatedAt),
    syncedAt,
  });
}

export function mapProduct(
  product: ApitcgProduct,
  syncedAt: Date,
): ProductRecord {
  if (typeof product.set === 'string') {
    throw new Error(
      `El producto ${product._id} llegó sin el set poblado. La sincronización necesita el documento del set.`,
    );
  }

  const attributes = product.attributes ?? {};
  const tcgSlug =
    typeof product.tcg === 'string' ? product.tcg : product.tcg._id;

  return omitUndefined({
    externalId: product._id,
    type: product.type,
    name: product.name,
    tcgSlug,
    set: omitUndefined({
      externalId: product.set._id,
      name: product.set.name,
      slug: product.set.slug,
      code: product.set.code,
    }),
    code: product.code,
    images: (product.images ?? []).map((image) =>
      omitUndefined({
        small: image.small,
        medium: image.medium,
        large: image.large,
      }),
    ),
    attributes,
    rarity: clean(attributes.Rarity),
    color:
      clean(attributes.Color) ??
      (tcgSlug === 'riftbound' ? clean(attributes.Domain) : undefined),
    cardType:
      clean(attributes.CardType) ??
      (tcgSlug === 'riftbound' ? clean(attributes['Card Type']) : undefined),
    cost:
      clean(attributes.Cost) ??
      (tcgSlug === 'riftbound' ? clean(attributes['Energy Cost']) : undefined),
    power:
      clean(attributes.Power) ??
      (tcgSlug === 'riftbound' ? clean(attributes.Might) : undefined),
    life: clean(attributes.Life),
    artist: clean(attributes.Artist),
    cardNumber: clean(attributes.Number) ?? clean(product.cardNumber),
    subtypes: clean(attributes.Subtypes),
    cardAttribute:
      clean(attributes.Attribute) ??
      (tcgSlug === 'riftbound' ? clean(attributes.Tag) : undefined),
    markets: product.markets,
    sourceCreatedAt: toDate(product.createdAt),
    sourceUpdatedAt: toDate(product.updatedAt),
    syncedAt,
  });
}

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
