export interface CoinPriceInFiatModel {
  id: number;
  coin_id: number;
  coin_symbol: string;
  coin_name: string;
  coin_family?: number;
  fiat_type: string;
  cmc_id?: number;
  token_address?: string | null;
  value: number | 0;
  price_change_24h?: number | 0;
  price_change_percentage_24h?: number | 0;
  market_cap: number;
  circulating: number;
  total_supply: number;
  rank: number;
  volume_24h: number;
  max_supply: number;
  latest_price: string | null;
  latest_price_source: string | null;
}
