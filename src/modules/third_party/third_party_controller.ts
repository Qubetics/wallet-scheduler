import axios from "axios";
import { config } from "../../config";
import { Coins, GasPrice } from "../../models/model/index";
import SWFTCCoinsDataModel from "../../models/model/model.swftc_coins";
import { Op } from "sequelize";

const { ETH: ETH, BNB: BNB, POL: POL } = config.STATIC_COIN_FAMILY;

class ThirdPartyController {
  public updateGasPrice = async () => {
    try {
      let url: string = `${config.ETH_GAS_FEE_URL}${config.ETH_GAS_FEE_API_KEY}`;
      await axios.get(url).then(async (responce) => {
        if (responce.status == 200) {
          let SafeGasPrice = parseFloat(responce.data.result.SafeGasPrice);
          let ProposeGasPrice = parseFloat(
            responce.data.result.ProposeGasPrice
          );
          let FastGasPrice = parseFloat(responce.data.result.FastGasPrice);

          // Round to 6 decimal places if necessary
          if (SafeGasPrice.toString().split(".")[1]?.length > 6) {
            SafeGasPrice = parseFloat(SafeGasPrice.toFixed(6));
          }

          // Round to 6 decimal places if necessary
          if (ProposeGasPrice.toString().split(".")[1]?.length > 6) {
            ProposeGasPrice = parseFloat(ProposeGasPrice.toFixed(6));
          }

          // Round to 6 decimal places if necessary
          if (FastGasPrice.toString().split(".")[1]?.length > 6) {
            FastGasPrice = parseFloat(FastGasPrice.toFixed(6));
          }

          if(FastGasPrice>0){
            await GasPrice.GasPriceWrite.update(
              {
                safe_gas_price: SafeGasPrice,
                propose_gas_price: ProposeGasPrice,
                fast_gas_price: FastGasPrice,
              },
              {
                where: { coin_family: ETH },
              }
            );
          }
        }
      });
      return;
    } catch (err: any) {
      let message: any = (err as Error).message;
      console.error("🔥 ~ ~ updateGasPrice error", message);
      return;
    }
  };

  public updateBNBGasPrice = async () => {
    try {
      let url: string = `${config.BNB_GAS_FEE_URL}${config.BNB_GAS_FEE_API_KEY}`;
      await axios.get(url).then(async (responce) => {
        if (responce.status == 200) {
          let SafeGasPrice = parseFloat(responce.data.result.SafeGasPrice);
          let ProposeGasPrice = parseFloat(
            responce.data.result.ProposeGasPrice
          );
          let FastGasPrice = parseFloat(responce.data.result.FastGasPrice);

          // Round to 6 decimal places if necessary
          if (SafeGasPrice.toString().split(".")[1]?.length > 6) {
            SafeGasPrice = parseFloat(SafeGasPrice.toFixed(6));
          }

          // Round to 6 decimal places if necessary
          if (ProposeGasPrice.toString().split(".")[1]?.length > 6) {
            ProposeGasPrice = parseFloat(ProposeGasPrice.toFixed(6));
          }

          // Round to 6 decimal places if necessary
          if (FastGasPrice.toString().split(".")[1]?.length > 6) {
            FastGasPrice = parseFloat(FastGasPrice.toFixed(6));
          }
          await GasPrice.GasPriceWrite.update(
            {
              safe_gas_price: SafeGasPrice > 1 ? SafeGasPrice : 1,
              propose_gas_price: ProposeGasPrice > 1 ? ProposeGasPrice : 1,
              fast_gas_price: FastGasPrice > 1 ? FastGasPrice : 1,
            },
            {
              where: { coin_family: BNB },
            }
          );
        }
      });
      return;
    } catch (err: any) {
      let message: any = (err as Error).message;
      console.error("🔥 ~ ~ updateBNBGasPrice error", message);
      return;
    }
  };

  public updatePolGasPrice = async () => {
    try {
      let url: string = `${config.POL_GAS_FEE_URL}${config.POL_GAS_FEE_API_KEY}/networks/137/suggestedGasFees`;
      await axios.get(url).then(async (responce) => {
        if (responce.status == 200) {
          let lowSuggestedMaxFeePerGas = parseFloat(
            responce.data.low.suggestedMaxFeePerGas
          );
          let mediumSuggestedMaxFeePerGas = parseFloat(
            responce.data.medium.suggestedMaxFeePerGas
          );
          let highSuggestedMaxFeePerGas = parseFloat(
            responce.data.high.suggestedMaxFeePerGas
          );

          // Round to 6 decimal places if necessary
          if (lowSuggestedMaxFeePerGas.toString().split(".")[1]?.length > 6) {
            lowSuggestedMaxFeePerGas = parseFloat(
              lowSuggestedMaxFeePerGas.toFixed(6)
            );
          }

          // Round to 6 decimal places if necessary
          if (
            mediumSuggestedMaxFeePerGas.toString().split(".")[1]?.length > 6
          ) {
            mediumSuggestedMaxFeePerGas = parseFloat(
              mediumSuggestedMaxFeePerGas.toFixed(6)
            );
          }

          // Round to 6 decimal places if necessary
          if (highSuggestedMaxFeePerGas.toString().split(".")[1]?.length > 6) {
            highSuggestedMaxFeePerGas = parseFloat(
              highSuggestedMaxFeePerGas.toFixed(6)
            );
          }
          await GasPrice.GasPriceWrite.update(
            {
              safe_gas_price: lowSuggestedMaxFeePerGas,
              propose_gas_price: mediumSuggestedMaxFeePerGas,
              fast_gas_price: highSuggestedMaxFeePerGas,
            },
            {
              where: { coin_family: POL },
            }
          );
        }
      });
      return;
    } catch (err: any) {
      let message: any = (err as Error).message;
      console.error("🔥 ~ ~ updatePOLGasPrice error", message);
      return;
    }
  };

  public addSwftcCoinList = async () => {
    try {
      console.log("🚀 ~ ThirdPartyController ~ addSwftcCoinList= ~ addSwftcCoinList:")
      const params = { supportType: "advanced", sourceFlag: "qubetics" };
      const result = await axios.post(
        "https://www.swftc.info/api/v1/queryCoinList",
        params
      );
      if (result && result?.data) {
        let data = result?.data.data;
        let networks: any = [
          "ETH",
          "BTC",
          "BSC",
          "SOL",
          "POLYGON",
          "TRX"
        ];
        let coinFamily: any = {
          1: "BSC",
          2: "ETH",
          3: "BTC",
          4: "POLYGON",
          5: "SOL",
          6: "TRX",
        };
        let TBL_SWFTC_COINS_ALIAS = SWFTCCoinsDataModel;
        let TBL_COINS_ALIAS_READ = Coins.CoinsRead;
        let TBL_COINS_ALIAS_WRITE = Coins.CoinsWrite;
        let swftc_coins_table_ids: any = [];
        for await (let coin of data) {
          if (networks.indexOf(coin.mainNetwork) !== -1) {
            let coin_family: any = Object.keys(coinFamily).find(
              (key) => coinFamily[key] === coin.mainNetwork
            );
            if (coin.mainNetwork === 'POLYGON' && !coin.coinCode.includes('(POL)')) {
              continue;
            }
            let token_type = null;
            
            if (coin.mainNetwork === "ETH" || coin.mainNetwork === "POLYGON") {
              token_type = "ERC20";
            } else if (coin.mainNetwork === "BSC") {
              token_type = "BEP20";
            } else if (coin.mainNetwork === "SOL") {
              token_type = "SPL";
            } else if (coin.mainNetwork === "TRX") {
              token_type = "TRX20";
            }
            let findSWFTCCoin = await TBL_SWFTC_COINS_ALIAS.findOne({
              attributes: ["id", "coinId", "coinCode"],
              where: { coinCode: coin.coinCode },
              raw: true,
            });
            if (!findSWFTCCoin) {
              let coinSymbolCode = coin.coinCode.split("(");
              let findCoin: any = await TBL_COINS_ALIAS_READ.findOne({
                attributes: ["coin_id", "coin_image"],
                where: {
                  coin_symbol: coinSymbolCode[0],
                  coin_family: coin_family,
                  token_address: coin?.contact
                    ? { [Op.like]: coin.contact }
                    : null,
                },
                raw: true,
              });
              if (findCoin) {
                let save_data: any = {
                  coinName: coin.coinAllCode,
                  coinCode: coin.coinCode,
                  coinImageUrl: findCoin?.coin_image,
                  mainNetwork: coin?.mainNetwork,
                  contact: coin?.contact || null,
                  coinDecimal: coin?.coinDecimal,
                  noSupportCoin: coin.noSupportCoin,
                  isSupportAdvanced: coin.isSupportAdvanced,
                  isSupportMemo: coin.isSupportMemo,
                  coinCodeShow: coin.coinCodeShow,
                  coinId: findCoin?.coin_id,
                  status: 1,
                };
                findSWFTCCoin = await TBL_SWFTC_COINS_ALIAS.create(
                  save_data
                );
              } else {
                let coin_data_to_save: any = {
                  coin_name: coin.coinAllCode,
                  coin_symbol: coinSymbolCode[0]?.toUpperCase(),
                  coin_family: coin_family,
                  is_token: coin?.contact ? 1 : null,
                  token_address: coin?.contact,
                  token_type: token_type,
                  decimals:
                    coin?.coinDecimal !== 0
                      ? Math.pow(10, parseInt(coin?.coinDecimal))
                      : 0,
                  coin_status: 0,
                };
                let findCoin: any = await TBL_COINS_ALIAS_WRITE.create(
                  coin_data_to_save
                );

                let save_data: any = {
                  coinName: coin.coinAllCode,
                  coinCode: coin.coinCode,
                  coinImageUrl: findCoin?.coin_image,
                  mainNetwork: coin?.mainNetwork,
                  contact: coin?.contact || null,
                  coinDecimal: coin?.coinDecimal,
                  noSupportCoin: coin.noSupportCoin,
                  isSupportAdvanced: coin.isSupportAdvanced,
                  isSupportMemo: coin.isSupportMemo,
                  coinCodeShow: coin.coinCodeShow,
                  coinId: findCoin?.coin_id,
                  status: 1,
                };
                findSWFTCCoin = await TBL_SWFTC_COINS_ALIAS.create(
                  save_data
                );
              }
            } else {
              await TBL_SWFTC_COINS_ALIAS.update(
                { noSupportCoin: coin.noSupportCoin, status: 1 },
                {
                  where: { coinCode: coin.coinCode },
                }
              );
            }
            swftc_coins_table_ids.push(findSWFTCCoin?.id);
          }
        }
        if (swftc_coins_table_ids?.length > 0) {
          await TBL_SWFTC_COINS_ALIAS.update(
            { status: 0 },
            { where: { id: { [Op.notIn]: swftc_coins_table_ids } } }
          );
        }
      }
      return;
    } catch (err) {
      let message: any = (err as Error).message;
      console.log("🔥 ~ ~ addSwftcCoinList error", message);
      return;
    }
  };
}

const third_party_controller = new ThirdPartyController();
export default third_party_controller;
