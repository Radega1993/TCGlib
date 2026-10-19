export type ProductImage = {
  small?: string;
  medium?: string;
  large?: string;
};

export type PricePoint = {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
};

export type Product = {
  externalId: number;
  type: string;
  name: string;
  tcgSlug: string;
  set: {
    externalId: string;
    name: string;
    slug: string;
    code?: string;
  };
  code?: string;
  images: ProductImage[];
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
  markets?: {
    tcgplayer?: {
      id?: string;
      url?: string;
      prices?: PricePoint;
      printing?: string;
      printings?: { subTypeName?: string; prices?: PricePoint }[];
    };
  };
  sourceUpdatedAt?: string;
};

export type CardSet = {
  externalId: string;
  name: string;
  code?: string;
  releaseDate?: string;
};

export type CatalogStats = {
  tcg: string;
  sets: number;
  products: number;
  cards: number;
  sealed: number;
};

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export type CatalogFacets = {
  color: string[];
  rarity: string[];
  cardType: string[];
  attribute: string[];
  cost: string[];
};

export type CardSuggestion = {
  externalId: number;
  name: string;
  code?: string;
  color?: string;
  rarity?: string;
  set: {
    code?: string;
    name: string;
  };
  image?: string | null;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  publicSlug?: string;
  shareEnabled: boolean;
};

export type SharedListPage = {
  total: number;
  copies: number;
  page: number;
  limit: number;
  entries: LibraryEntry[];
};

export type SharedCollection = {
  name: string;
  picture?: string;
  counts: LibraryCounts;
  facets: CatalogFacets;
  sets: CardSet[];
  owned: SharedListPage;
  wanted: SharedListPage;
};

export type ShareQuery = CatalogQuery & {
  wantedPage: number;
};

export type LibraryList = "owned" | "wanted";

export type LibraryCard = {
  externalId: number;
  name: string;
  code?: string;
  rarity?: string;
  color?: string;
  set: {
    name: string;
    code?: string;
  };
  image?: string;
};

export type LibraryEntry = {
  quantity: number;
  product: LibraryCard;
};

export type LibraryCounts = {
  owned: { cards: number; copies: number };
  wanted: { cards: number; copies: number };
};

export type CatalogQuery = {
  q?: string;
  set?: string;
  color: string[];
  rarity: string[];
  cardType: string[];
  attribute: string[];
  cost: string[];
  page: number;
};
