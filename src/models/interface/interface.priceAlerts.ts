export interface PriceAlertsModel {
  id: number;
  fiat_type: string;
  coin_symbol?: string;
  coin_name?: string;
  percentage?: number | 0;
  wallet_address?: string;
  user_id?: number;
  price_in_usd_per_unit?: number | 0;
  status?: string;
  alert_price?: number;
  is_active?: number;
  coin_image?: string;
  coin_id: number | undefined;
  coin_family?: number;
  token_address?: string | undefined | null;
}
