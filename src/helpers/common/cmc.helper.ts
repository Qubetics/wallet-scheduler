import axios from "axios";
import { config } from "../../config";
import { settings_queries } from "../dbHelper";

class CMCHelper {
  constructor() {}
  public async cmcApi(params: any) {
    try {
      console.log("Entered into cmcApi params params", params);
      let url: string = "";
      let header: any = {};
      let result: any;
      let cmc_result: any = await settings_queries.settings_find_one(
        ["id", "title", "value", "created_at", "updated_at"],
        { title: "CMC" }
      );
      // 1 means Coin Market Cap, 2 means Cmc Product
      if (cmc_result) {
        if (Number(cmc_result.value) == 1) {
          console.log("In use Coin Market Cap");
          url = `${config.CMC.CMC_URL}${params}`;
          header = { "X-CMC_PRO_API_KEY": `${config.CMC.CMC_KEY}` };
          result = await axios({
            method: "get",
            url: url,
            headers: header,
          });
        } else {
          console.log("In use Coinzone Cmc Product");

          url = `${config.CMC_PRODUCT.COIN_ZONE_URL}${params}`;
          header = { api_key: `${config.CMC_PRODUCT.COIN_ZONE_KEY}` };

          result = await axios({
            method: "get",
            url: url,
            headers: header,
          });
        }
      } else {
        result = [];
      }
      console.log("url >>> ", url, "header", header);

      return result;
    } catch (err: any) {
      console.error("Error in cmcApi cmcApi cmcApi >>>", err);
      throw err;
    }
  }
  public async cmcHistoricalData(
    ids: any,
    interval: any,
    startDate: any,
    endDate: any
  ) {
    try {
      console.log("Entered into cmcHistoricalData>>");
      let result: any;
      let cmc_result: any = await settings_queries.settings_find_one(
        ["id", "title", "value", "created_at", "updated_at"],
        { title: "CMC" }
      );
      if (cmc_result) {
        console.log(
          "Entered into condition whether cmc 1 or 2 cmc result true,cmc_historical_data"
        );
        // old cmc
        if (Number(cmc_result.value) == 1) {
          console.log(
            "Cmc result 1 it means old qubetic key,cmc_historical_data"
          );
          result = {
            method: "GET",
            uri: `${config.CMC.CMC_URL}quotes/historical?id=${ids}`,
            qs: {
              interval: interval,
              skip_invalid: true,
              convert: "USD",
              time_start: new Date(startDate).toISOString(),
              time_end: new Date(endDate).toISOString(),
            },
            headers: { "X-CMC_PRO_API_KEY": config.CMC.CMC_KEY },
            json: true,
            gzip: true,
          };
        } else {
          console.log(
            "Cmc result 2 it means CMC product key,cmc_historical_data"
          );
          result = {
            method: "GET",
            url: `${config.CMC_PRODUCT.COIN_ZONE_URL}quotes/historical?id=${ids}`,
            qs: {
              interval: interval,
              skip_invalid: true,
              convert: "USD",
              time_start: new Date(startDate).toISOString(),
              time_end: new Date(endDate).toISOString(),
            },
            headers: { api_key: `${config.CMC_PRODUCT.COIN_ZONE_KEY}` },
            json: true,
            gzip: true,
          };
        }
        console.log("working fine 1111,cmc_historical_data");
      } else {
        console.log("No cmc data in settings table,cmc_historical_data");
        result = [];
      }
      return result;
    } catch (err: any) {
      console.error("Error in getting cmc_historical_data>>", err);
      throw err;
    }
  }

  public async cmcFiatCurrencyData(cryptoSymbols: any) {
    try {
      console.log("Entered into cmcHistoricalData>>");
      let result: any;
      let cmc_result: any = await settings_queries.settings_find_one(
        ["id", "title", "value", "created_at", "updated_at"],
        { title: "CMC" }
      );
      if (cmc_result) {
        console.log(
          "Entered into condition whether cmc 1 or 2 cmc result true,cmc_historical_data"
        );
        // old cmc
        if (Number(cmc_result.value) == 1) {
          console.log(
            "Cmc result 1 it means old qubetic key,cmc_historical_data"
          );
          result = {
            method: "GET",
            uri: `${config.CMC.CMC_URL}quotes/latest`,
            qs: {
              id: 2781,
              convert: cryptoSymbols.toString(),
            },
            headers: { "X-CMC_PRO_API_KEY": config.CMC.CMC_KEY },
            json: true,
            gzip: true,
          };
        } else {
          console.log(
            "Cmc result 2 it means CMC product key,cmc_historical_data"
          );
          result = {
            method: "GET",
            url: `${config.CMC_PRODUCT.COIN_ZONE_URL}quotes/latest`,
            qs: {
              id: 2781,
              convert: cryptoSymbols.toString(),
            },
            headers: { api_key: `${config.CMC_PRODUCT.COIN_ZONE_KEY}` },
            json: true,
            gzip: true,
          };
        }
        console.log("working fine 1111,cmc_historical_data");
      } else {
        console.log("No cmc data in settings table,cmc_historical_data");
        result = [];
      }
      return result;
    } catch (err: any) {
      console.error("Error in getting cmc_historical_data>>", err);
      throw err;
    }
  }
  

  public async updateCmcImgUrl(image_url: string) {
    try {
        console.log('image_url >>>', image_url);
        if (image_url?.includes("img/coins/16x16/")) {
            image_url = image_url.replace('16x16', '200x200');
        } else if (image_url?.includes("img/coins/32x32/")) {
            image_url = image_url.replace('32x32', '200x200');
        } else if (image_url?.includes("img/coins/64x64/")) {
            image_url = image_url.replace('64x64', '200x200');
        } else if (image_url?.includes("img/coins/128x128/")) {
            image_url = image_url.replace('128x128', '200x200');
        }
        return image_url;
    } catch (err: any) {
        console.error(`UpdateCmcImgUrl error>>> `, err)
        return null;
    }
}

public async getCmcTokenDataByAddress(data: any) {
  try {
     console.log('getCmcTokenDataByAddress data >>>', data);
      let params: any = `info?address=${data.token_address}`;
      let result: any = await cmcHelper.cmcApi(params);
      let id: any = null;
      let imageUrl: any = null;
      if (result.data) {
          let image: any;
              const firstKey =  Object.keys(result.data.data)[0];
              if (firstKey) {
                  id = result.data.data[firstKey].id;
                  image = result.data.data[firstKey].logo;  
              }
              if (image) {
                  imageUrl = await this.updateCmcImgUrl(image);
              }
      }
      return { image: imageUrl, id: id };
  } catch (err: any) {
      console.error("Error in get_token_image_from_cmc", err);
      return null;
  }
}

  private STATIC_COIN_FAMILY_SYMBOL = {
    1: "BNB",
    2: "ETH",
    3: "BTC",
    4: "POL",
    5: "SOL",
    6: "TRX",
    7: "TICS"
  }

  private STATIC_COIN_FAMILY_NAME = {
    1: ["BNB"],
    2: ["Ethereum"],
    3: ["BTC"],
    4: ["POL (prev. MATIC)", "Polygon", "MATIC"], 
    5: ["Solana"],
    6: ["TRON", "Tron"],
    7: ["TICS"]
  }


  public async getCmcDataBySymbol(data: any) {
    try {
      const tokenAddress = data.tokenAddress;
      const coinFamily = data.coinFamily as keyof typeof this.STATIC_COIN_FAMILY_SYMBOL;
      const PlatformName = this.STATIC_COIN_FAMILY_NAME[coinFamily];

      if (PlatformName == null) {
        return { image: null, id: null };
      }

      let params: any = `info?symbol=${data.symbol}`;

      let result: any = await cmcHelper.cmcApi(params);
      let id: any = null;
      let imageUrl: any = null;

      if (result.data && result.data.data) {
        let image: any;
        const symbolKey = Object.keys(result.data.data)[0];

        if (symbolKey) {
          // Get all tokens with this symbol
          const tokens = result.data.data[symbolKey];

          // Find the token that matches both symbol and token address
          for (const token of tokens) {

            if (token.contract_address) {
              // Check each contract address entry
              for (const contract of token.contract_address) {

                if (contract?.platform &&
                  contract?.platform?.coin &&
                  PlatformName.includes(contract?.platform?.coin?.name) &&
                  contract?.contract_address?.toLowerCase() == tokenAddress.toLowerCase()) {
                  id = token.id;
                  image = token.logo;
                  break;
                }
              }
              if (id) break; // Break outer loop if match found
            }
          }

          if (image) {
            imageUrl = await this.updateCmcImgUrl(image);
          }
        }
      }

      return { image: imageUrl, id: id };
    } catch (err: any) {
      console.error("Error in getTokenImageFromCmcBySymbol", err);
      return null;
    }
  }

}

const cmcHelper = new CMCHelper();
export default cmcHelper;
