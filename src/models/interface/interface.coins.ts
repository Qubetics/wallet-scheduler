export interface CoinModel {
  coin_id: number;
  coin_name: string;
  coin_symbol: string;
  coin_gicko_alias?: string | null;
  coin_image?: string | null;
  coin_family: number;
  coin_status: number | 0;
  is_token: number | 0;
  token_type?: string | null;
  decimals: number | 0;
  cmc_id?: number;
  usd_price?: number | 1;
  withdraw_limit?: number | 0;
  token_abi?: string | null;
  token_address?: string | null;
  mainnet_token_address?: string | null;

  uuid?: string | null;
  added_by?: string;
  is_on_cmc?: number;
  for_swap?: number
}
