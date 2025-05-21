export interface TicsPriceInFiatGraphModel {
  id: number;
  coin_id: number;
  timestamp: string;
  price: string | null;
  created_at?: string;
  updated_at?: string;
}
