export interface NotificationInterface {
  notification_id?: number;
  message: string | null;
  amount: number;
  alert_price: number | null;
  fiat_type: string | null;
  from_user_id: number;
  to_user_id?: number | null;
  notification_type: string;
  tx_id?: number | null;
  tx_type?: string | null;
  coin_symbol: string | null;
  coin_id: number;
  coin_family: number;
  resent_count?: number | null;
  view_status?: number | null;
  state: string | null;
  coin_price_in_usd?: {} | null;
  wallet_address?: string | null;
  created_at: Date,
  updated_at: Date
}
