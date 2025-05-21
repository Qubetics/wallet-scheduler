import axios from "axios";
import { config } from "../../config";
import { GasPrice } from "../../models/model/index";

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
}

const third_party_controller = new ThirdPartyController();
export default third_party_controller;
