export interface CoinPriceInFiatGraphModel {
  id: number;
  cmc_id: number;
  fiat_type?: string;
  sparkline?: string;
  // value?: number | 0;
  type?: string;
  // price_change_24h?: number | 0;
  // price_change_percentage_24h?: number | 0;
  // volume_24h?: number | 0;
  latest_price_source?: string | null;
  created_at?: string;
  updated_at?: string;
}
