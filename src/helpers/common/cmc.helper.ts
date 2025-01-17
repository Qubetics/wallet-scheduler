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
            // timeout: 5000,
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
          // new cmc product
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
            // timeout: 5000,
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
          // new cmc product
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
            // timeout: 5000,
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
}

const cmcHelper = new CMCHelper();
export default cmcHelper;
