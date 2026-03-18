export interface CartItem {
  game_id: number;
  title: string;
  slug: string;
  price_lkr: number;
  cover_img_url: string | null;
  discount_percent: number;
  short_description: string | null;
}
