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
  alias?: string;
  picture?: string;
  publicSlug?: string;
  wantedSlug?: string;
  tradeSlug?: string;
  shareEnabled: boolean;
  admin: boolean;
};

export type SharedListPage = {
  total: number;
  copies: number;
  page: number;
  limit: number;
  entries: LibraryEntry[];
};

export type ShareView = "library" | "wanted" | "trades";

export type ShareTab = "biblioteca" | "intercambio" | "busco";

export type SharedCollection = {
  name: string;
  picture?: string;
  tab: ShareTab;
  scope: ShareView;
  counts: LibraryCounts;
  facets: CatalogFacets;
  sets: CardSet[];
  owned?: SharedListPage;
  wanted?: SharedListPage;
  trades?: SharedListPage;
};

export type AdminListCount = {
  cards: number;
  copies: number;
  users?: number;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  alias?: string;
  picture?: string;
  publicSlug?: string;
  shareEnabled: boolean;
  blocked: boolean;
  admin: boolean;
  createdAt?: string;
  lastSeenAt?: string;
  owned: AdminListCount;
  wanted: AdminListCount;
};

export type AdminCardRank = {
  externalId: number;
  name: string;
  code?: string;
  image?: string;
  users: number;
  copies: number;
};

export type AdminViewRank = {
  externalId: number;
  name: string;
  code?: string;
  image?: string;
  views: number;
};

export type AdminDayPoint = {
  day: string;
  label: string;
  count: number;
};

export type AdminOverview = {
  users: {
    total: number;
    blocked: number;
    sharing: number;
    activeToday: number;
    activeWeek: number;
    activeMonth: number;
    newWeek: number;
    newMonth: number;
  };
  sessions: number;
  activity: { averageMs: number; users: number };
  library: { owned: AdminListCount; wanted: AdminListCount };
  catalog: { sets: number; products: number; cards: number; sealed: number };
  sync: {
    status: "running" | "completed" | "failed";
    startedAt: string;
    finishedAt?: string;
    cards: number;
    sealed: number;
    products: number;
    error?: string;
  } | null;
  signups: AdminDayPoint[];
  visits: AdminDayPoint[];
  wanted: AdminCardRank[];
  owned: AdminCardRank[];
  searched: { term: string; count: number }[];
  viewed: AdminViewRank[];
  games: AdminGame[];
  suggestedDecks: number;
};

export type AdminGame = {
  slug: string;
  name: string;
  sync: AdminOverview["sync"];
};

export type ShareLayout = "album" | "list";

export type ShareQuery = CatalogQuery & {
  tab?: ShareTab;
  view?: ShareLayout;
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
  forTrade?: number;
  product: LibraryCard;
};

export type LibraryCounts = {
  owned: { cards: number; copies: number };
  wanted: { cards: number; copies: number };
  trades: { cards: number; copies: number };
};

export type CollectionMode = "base" | "master" | "playset" | "custom";

export type CollectionView = "todas" | "faltan" | "tienes" | "repetidas" | "deseadas";

export type CollectionGoal = {
  mode: CollectionMode;
  customCopies: number;
  excludedVariants: string[];
};

export type CollectionVariant = {
  label: string;
  cards: number;
};

export type SetProgress = {
  externalId: string;
  code?: string;
  name: string;
  obtained: number;
  total: number;
  missing: number;
  duplicates: number;
  wanted: number;
  percent: number;
};

export type CollectionOverview = {
  goal: CollectionGoal;
  variants: CollectionVariant[];
  sets: SetProgress[];
};

export type CollectionCardRow = {
  externalId: number;
  name: string;
  code?: string | null;
  cardType?: string | null;
  rarity?: string | null;
  image?: string | null;
  variantLabel?: string | null;
  owned: number;
  wanted: number;
  inGoal: boolean;
  target: number;
  counted: number;
};

export type CollectionSetDetail = {
  set: SetProgress;
  goal: CollectionGoal;
  view: CollectionView;
  counts: Record<CollectionView, number>;
  cards: CollectionCardRow[];
  page: number;
  limit: number;
  total: number;
};

export type DeckFormat = "extra" | "standard";
export type LegalityStatus = "legal" | "illegal" | "unchecked";

export type DeckCard = {
  externalId: number | null;
  code: string;
  name: string;
  cardType: string | null;
  color: string | null;
  cost: number | null;
  image: string | null;
};

export type DeckLine = DeckCard & {
  needed: number;
  owned: number;
  missing: number;
};

export type ConstructionIssue =
  | { code: "leader-missing" }
  | { code: "leader-unknown" }
  | { code: "leader-type" }
  | { code: "size"; have: number }
  | { code: "copies"; card: string; quantity: number }
  | { code: "color"; card: string }
  | { code: "type"; card: string }
  | { code: "unknown"; card: string };

export type DeckLegality = {
  status: LegalityStatus;
  rulesId: string | null;
  blockChecked: boolean;
  banned: string[];
  pairs: [string, string][];
  restricted: { code: string; quantity: number; max: number }[];
};

export type DeckSummaryStats = {
  colors: { color: string; copies: number }[];
  types: { cardType: string; copies: number }[];
  curve: { cost: string; copies: number }[];
};

export type DeckDetail = {
  id: string;
  name: string;
  format: DeckFormat;
  source: string;
  rulesId: string | null;
  rulesLabel: string | null;
  don: number;
  leader: DeckCard | null;
  lines: DeckLine[];
  construction: {
    ok: boolean;
    size: number;
    target: number;
    issues: ConstructionIssue[];
  };
  legality: DeckLegality;
  availability: {
    listSize: number;
    available: number;
    missingCopies: number;
    target: number;
  };
  summary: DeckSummaryStats;
  shareEnabled: boolean;
  publicSlug: string | null;
  updatedAt: string | null;
};

export type DeckListItem = {
  id: string;
  name: string;
  format: DeckFormat;
  rulesId: string | null;
  rulesLabel: string | null;
  updatedAt: string | null;
  leader: DeckCard | null;
  construction: { ok: boolean; size: number; target: number };
  legality: { status: LegalityStatus; blockChecked: boolean };
  availability: {
    available: number;
    listSize: number;
    missingCopies: number;
    target: number;
  };
};

export type DeckSearchCard = DeckCard & { owned: number };

export type SuggestedDeckMatch = {
  slug: string;
  name: string;
  author: string;
  leader: DeckCard | null;
  missingCopies: number;
  available: number;
  listSize: number;
  deckId: string | null;
};

export type SuggestedDeckDetail = SuggestedDeckMatch & {
  lines: (DeckLine & { leader: boolean })[];
};

export type PublicDeck = {
  owner: string;
  name: string;
  format: DeckFormat;
  rulesId: string | null;
  rulesLabel: string | null;
  don: number;
  leader: DeckCard | null;
  lines: (DeckCard & { quantity: number })[];
  construction: DeckDetail["construction"];
  legality: DeckLegality;
  summary: DeckSummaryStats;
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
