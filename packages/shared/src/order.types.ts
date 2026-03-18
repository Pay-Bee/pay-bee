export type OrderStatus = "PENDING" | "CONFIRM" | "CANCELED" | "DONE";

export interface OrderItem {
  id: number;
  order_id: number;
  game_id: number;
  price_usd: number;
  price_lkr: number;
  discount_percent: number;
  title: string;
  cover_img_url: string | null;
  created_at: Date;
}

export interface Order {
  id: number;
  customer_id: number;
  status: OrderStatus;
  billing_first_name: string;
  billing_last_name: string;
  billing_mobile: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  steam_profile: string;
  steam_friend_code: string;
  created_at: Date;
  updated_at: Date;
  items?: OrderItem[];
}

export interface OrdersListResponse {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrderRequest {
  game_ids: number[];
  billing_first_name: string;
  billing_last_name: string;
  billing_mobile: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  steam_profile: string;
  steam_friend_code: string;
}
