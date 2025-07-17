export interface CoinPriceInFiatGraphModel {
  id: number;
  cmc_id: number;
  fiat_type?: string;
  sparkline?: string;
  type?: string;
  latest_price_source?: string | null;
  created_at?: string;
  updated_at?: string;
}
