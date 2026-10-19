export interface ApitcgListResponse<T> {
  success: boolean;
  data: T[];
  total: number | null;
  fallback?: boolean;
}

export interface ApitcgItemResponse<T> {
  success: boolean;
  data: T;
}

export interface ApitcgMarketRef {
  id?: string;
  url?: string;
}

export interface ApitcgTcg {
  _id: string;
  name: string;
  description?: string;
  logo?: string;
  markets?: {
    tcgplayer?: ApitcgMarketRef;
    tcgmatch?: ApitcgMarketRef;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ApitcgSet {
  _id: string;
  name: string;
  slug: string;
  tcg: string | { _id: string };
  code?: string;
  release_date?: string;
  serie?: string | null;
  markets?: {
    tcgplayer?: ApitcgMarketRef;
    tcgmatch?: ApitcgMarketRef;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ApitcgImage {
  small?: string;
  medium?: string;
  large?: string;
}

export interface ApitcgPrices {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
}

export interface ApitcgProduct {
  _id: number;
  type: string;
  name: string;
  tcg: string | ApitcgTcg;
  set: string | ApitcgSet;
  code?: string;
  cardNumber?: string;
  images?: ApitcgImage[];
  attributes?: Record<string, string>;
  markets?: {
    tcgplayer?: ApitcgMarketRef & {
      prices?: ApitcgPrices;
      printing?: string;
      printings?: { subTypeName?: string; prices?: ApitcgPrices }[];
    };
    tcgmatch?: ApitcgMarketRef & { prices?: ApitcgPrices };
    tcgdex?: { id?: string };
  };
  createdAt?: string;
  updatedAt?: string;
}
