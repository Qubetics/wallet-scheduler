export interface CoinModel {
  coin_id: number;
  coin_name: string;
  coin_symbol: string;
  coin_image?: string | null;
  coin_family: number;
  coin_status: number | 0;
  is_token: number | 0;
  token_type?: string | null;
  decimals: number | 0;
  cmc_id?: number;
  token_abi?: string | null;
  token_address?: string | null;
  added_by?: string;
  is_on_cmc?: number;
  for_swap?: number;
  graph_source?: string | null;
  graph_pair?: string | null;
  pair_address?: string | null;
  is_on_trading_view?: number | null;
  is_on_moralis_inactive?: number | null;
}
