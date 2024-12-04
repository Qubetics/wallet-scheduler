export interface CoinPriceInFiatGraphModel {
  id: number;
  coin_id: number | null;
  cmc_id: number;
  coin_type?: string;
  fiat_type?: string;
  sparkline?: string;
  value?: number | 0;
  type?: string;
  price_change_24h?: number | 0;
  price_change_percentage_24h?: number | 0;
  volume_24h?: number | 0;
  // created_at?: string;
  // updated_at?: string;
}
