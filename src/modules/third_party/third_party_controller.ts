import axios from "axios";
import { config } from "../../config";
import { GasPrice } from "../../models/model/index";

const { ETH: ETH, BNB: BNB, POL: POL } = config.STATIC_COIN_FAMILY;

class ThirdPartyController {
  public updateGasPrice = async () => {
    // console.error("success ~ ~ updateGasPrice",);
    try {
      let url: string = `${config.ETH_GAS_FEE_URL}${config.ETH_GAS_FEE_API_KEY}`;
      await axios.get(url).then(async (responce) => {
        // console.log(' responce.data', responce);
        if (responce.status == 200) {
          await GasPrice.GasPriceWrite.update(
            {
              safe_gas_price: Math.floor(responce.data.result.SafeGasPrice),
              propose_gas_price: Math.floor(
                responce.data.result.ProposeGasPrice
              ),
              fast_gas_price: Math.floor(responce.data.result.FastGasPrice),
            },
            {
              where: { coin_family: ETH },
            }
          );
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
    // console.error("success ~ ~ updateBNBGasPrice");
    try {
      let url: string = `${config.BNB_GAS_FEE_URL}${config.BNB_GAS_FEE_API_KEY}`;
      await axios.get(url).then(async (responce) => {
        if (responce.status == 200) {
          await GasPrice.GasPriceWrite.update(
            {
              safe_gas_price: Math.floor(responce.data.result.SafeGasPrice),
              propose_gas_price: Math.floor(
                responce.data.result.ProposeGasPrice
              ),
              fast_gas_price: Math.floor(responce.data.result.FastGasPrice),
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
    // console.error("success ~ ~ updatePolGasPrice");
    try {
      let url: string = `${config.POL_GAS_FEE_URL}${config.POL_GAS_FEE_API_KEY}/networks/137/suggestedGasFees`;
      await axios.get(url).then(async (responce) => {
        // console.log('pol responce >>>', responce.data);
        if (responce.status == 200) {
          await GasPrice.GasPriceWrite.update(
            {
              safe_gas_price: Math.floor(
                responce.data.low.suggestedMaxFeePerGas
              ),
              propose_gas_price: Math.floor(
                responce.data.medium.suggestedMaxFeePerGas
              ),
              fast_gas_price: Math.floor(
                responce.data.high.suggestedMaxFeePerGas
              ),
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
