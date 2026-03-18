export type Platform = "Windows" | "Xbox" | "PS" | "MacOS" | "Linux";

export interface Game {
  id: number;
  title: string;
  slug: string;
  short_description?: string | null;
  long_description?: string | null;
  developer?: string | null;
  publisher?: string | null;
  genres: string[];
  features: string[];
  platforms: Platform[];
  release_date?: string | null;
  steam_app_id?: string | null;
  cover_img_url?: string | null;
  trailer_video_url?: string | null;
  screenshots: string[];
  price_usd: number;
  price_lkr: number;
  fx_rate_used: number;
  discount_percent: number;
  price_updated_at: Date;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GameListItem {
  id: number;
  title: string;
  slug: string;
  short_description?: string | null;
  genres: string[];
  platforms: Platform[];
  price_usd: number;
  price_lkr: number;
  discount_percent: number;
  cover_img_url?: string | null;
}

export interface CatalogListResponse {
  data: GameListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CatalogFilters {
  genre?: string;
  features?: string; // comma-separated, e.g. "Single-player,Controller Support"
  platform?: string; // e.g. "Windows"
  minPrice?: number;
  maxPrice?: number;
  name?: string;
  sort?: "newest" | "alpha" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
}

export interface SystemRequirements {
  os?: string | null;
  cpu?: string | null;
  ram?: string | null;
  gpu?: string | null;
  storage?: string | null;
}

export interface CatalogSnapshot {
  id: number;
  title: string;
  slug: string;
  epic_product_id?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  developer_name?: string | null;
  publisher_name?: string | null;
  genres: string[];
  features: string[];
  platforms: Platform[];
  release_date?: string | null;
  age_rating?: string | null;
  critic_score?: number | null;
  user_score?: number | null;
  cover_img_url?: string | null;
  hero_image_url?: string | null;
  thumbnail_url?: string | null;
  trailer_video_url?: string | null;
  screenshots: string[];
  price_usd: number;
  price_lkr: number;
  original_price_usd: number;
  discount_percent: number;
  minimum_requirements?: SystemRequirements | null;
  recommended_requirements?: SystemRequirements | null;
}
