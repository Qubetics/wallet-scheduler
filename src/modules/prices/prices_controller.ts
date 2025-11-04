import { config } from "../../config";
import {
  CoinPriceInFiat,
  CurrencyFiat,
  Coins,
  CoinPriceInFiatGraph,
  // CMCDataNotExistModel,
  // DayCoinPrice,
  // TicsPriceInFiatGraph
} from "../../models/model/index";
import redisClient from "../../helpers/common/redis";
import { Op, Sequelize } from "sequelize";
import rp from "request-promise";
// import price_alerts_controller from "../price_alerts/price_alerts.controller";
// import sequelize from "sequelize";
// import reset_graph_data from "../../models/model/reset_graph_data";
// import { CoinModel } from "../../models/interface/interface.coins";
// import dbHelper from "../../helpers/dbHelper";
import cmcHelper from "../../helpers/common/cmc.helper";
import globalHelper from "../../helpers/common/global.helper";
// import axios from "axios";
// import { TimePeriods } from "../../constants";
// import { bigNumberSafeMath, exponentialToDecimal } from "../../helpers/common/globalFunctions";

const {
  current_price_coin_counter: CURRENT_PRICE_COIN_COUNTER,
  // current_price_currency_counter: CURRENT_PRICE_CURRENCY_COUNTER,
  graph_data_coin_counter: GRAPH_DATA_COIN_COUNTER,
  // graph_data_currency_counter: GRAPH_DATA_CURRENCY_COUNTER,
  fetch_cmc_ids_counter: FETCH_CMC_IDS_COIN_COUNTER,
  // delete_graph_coin_counter: DELETE_GRAPH_COIN_COUNTER,
} = config.REDISKEYS.COIN_LIMIT_COUNT_FIELD;
// const COIN_FAMILY = config.STATIC_COIN_FAMILY;

class PricesController {

  public fetchCmcPriceV2 = async () => {
    try {
      console.log("********* fetchCmcPriceV2 *************");

      let coinLimitCount: number = 0;
      const limit: number = 100;

      // Get the current batch counter from Redis
      const findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${CURRENT_PRICE_COIN_COUNTER}`
      );

      // Parse counter if available
      if (findCoinCounter) {
        coinLimitCount = Number(findCoinCounter);
      }

      // Fetch list of coins with non-zero cmc_id from the database (paginated)
      const totalCmcIds: number = await Coins.CoinsRead.count({
        distinct: true,
        col: 'cmc_id',
        where: {
          cmc_id: {
            [Op.ne]: 0
          },
          [Op.and]: [
            Sequelize.literal('cmc_id IS NOT NULL')
          ]
        },
        // logging: true
      })

      const coinData: any = await Coins.CoinsRead.findAll({
        attributes: ['cmc_id'],
        where: {
          cmc_id: {
            [Op.ne]: 0
          },
          [Op.and]: [
            Sequelize.literal('cmc_id IS NOT NULL')
          ]
        },
        group: ["cmc_id"],
        order: [["coin_id", "asc"]],
        limit,
        offset: coinLimitCount,
        logging: true
      });

      // Extract CMC IDs from result
      const cmcIds: any[] = coinData ? coinData.map((row: any) => row.cmc_id) : [];
      // const coin_data_count = coinData.count;

      // Add each coin's cmc_id into the reset_graph_data table if not already present
      if (cmcIds.length > 0) {
        // for (let i: number = 0; i < cmcIds.length; i++) {
        //   let id_exist: any = await reset_graph_data.ResetGraphRead.findOne({
        //     attributes: ["id"],
        //     where: { cmc_id: cmcIds[i] },
        //     raw: true,
        //   });

        //   if (id_exist == null) {
        //     let currentUTCDate: string = new Date()
        //       .toISOString()
        //       .replace(/T/, " ")
        //       .replace(/\..+/, "");

        //     await reset_graph_data.ResetGraphWrite.create({
        //       cmc_id: cmcIds[i],
        //       graph_type: "1d",
        //       created_at: currentUTCDate,
        //       updated_at: null,
        //     });
        //   }
        // }

        // Fetch live market data for the coins from CMC API
        const cmcIdsParam = cmcIds.join(",");
        const result = await cmcHelper.cmcApi(`quotes/latest?id=${cmcIdsParam}&convert=USD`);
        const cmcData = result?.data?.data;

        // Fetch fiat currency conversion rates from database (excluding USD)
        const fiatRatesRaw = await CurrencyFiat.CurrencyFiatWrite.findAndCountAll({
          attributes: ["currency_code", "price_in_usd"],
          where: {
            currency_code: { [Op.ne]: "USD" },
          },
          raw: true,
          order: [["currency_id", "asc"]],
        });

        // Build a fiat rate map (including USD = 1)
        const fiatRateMap: Record<string, number> = {
          USD: 1,
        };
        for (const fiat of fiatRatesRaw.rows) {
          const code = fiat.currency_code.toUpperCase();
          const rate = fiat.price_in_usd;
          if (rate && rate > 0) {
            fiatRateMap[code] = rate;
          }
        }

        // Loop through each coin's market data from CMC
        for (const cmcId in cmcData) {
          const coinObj = cmcData[cmcId];
          const usdQuote = coinObj.quote?.USD;
          if (!usdQuote) continue;

          // Construct latest price object
          const latest_price_usd: any = {
            price: usdQuote.price || 0,
            timestamp: usdQuote.last_updated,
            price_change_24h: usdQuote.percent_change_24h || 0,
            volume_24h: usdQuote.volume_24h || 0,
            percent_change_7d: usdQuote.percent_change_7d || 0,
            percent_change_30d: usdQuote.percent_change_30d || 0,
          };

          // Update prices for each fiat currency
          for (const fiatCode in fiatRateMap) {
            const fiatRate = fiatRateMap[fiatCode];
            const fiatPrice = usdQuote.price * fiatRate;

            const where = { cmc_id: coinObj.id, fiat_type: fiatCode };

            // Check if price record already exists
            let existingPrice = await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
              attributes: ["id", "coin_id"],
              where,
              raw: true,
            });

            let coin_id: number = 0;

            if (!existingPrice) {
              // If not exists, fetch coin info and insert a new record
              const coin = await Coins.CoinsRead.findOne({
                attributes: ["coin_id", "coin_family", "cmc_id", "token_address"],
                where: { cmc_id: coinObj.id },
              });

              if (!coin) continue;
              coin_id = coin.coin_id;

              await CoinPriceInFiat.CoinPriceInFiatWrite.create({
                coin_id: coin.coin_id,
                coin_name: coinObj.name,
                coin_family: coin.coin_family,
                max_supply: coinObj.max_supply || 0,
                cmc_id: coinObj.id,
                circulating: coinObj.circulating_supply || 0,
                total_supply: coinObj.total_supply,
                rank: coinObj.cmc_rank || 0,
                market_cap: usdQuote.market_cap * fiatRate,
                fiat_type: fiatCode,
                coin_symbol: coinObj.symbol,
                value: fiatPrice,
                price_change_24h: usdQuote.percent_change_24h || 0,
                price_change_percentage_24h: usdQuote.percent_change_24h || 0,
                volume_24h: usdQuote.volume_24h * fiatRate,
                token_address: coin.token_address,
                latest_price: latest_price_usd,
                latest_price_source: "converted_from_usd",
              });
            } else {
              // If exists, update the record
              coin_id = existingPrice.coin_id;
              await CoinPriceInFiat.CoinPriceInFiatWrite.update(
                {
                  value: fiatPrice,
                  price_change_24h: usdQuote.percent_change_24h,
                  price_change_percentage_24h: usdQuote.percent_change_24h,
                  volume_24h: usdQuote.volume_24h * fiatRate,
                  total_supply: coinObj.total_supply,
                  latest_price: latest_price_usd,
                  latest_price_source: "converted_from_usd",
                },
                { where }
              );
            }

            // For USD, also update the price history table
            if (coin_id > 0 && fiatCode === "USD") {
              await this.updateHistoryLastPrice(latest_price_usd, coinObj.id, fiatCode, where);
            }
          }
        }
      }

      // Update the Redis counter for next batch; reset if finished
      coinLimitCount += limit;
      console.log('coinLimitCount >>>>', CURRENT_PRICE_COIN_COUNTER, 'dddddddddddddddddddddddddddddddddddddddd', coinLimitCount);
      console.log('totalCmcIds >>>>', 'dddddddddddddddddddddddddddddddddddddddd', totalCmcIds);
      const nextCoinCounter = coinLimitCount >= totalCmcIds ? 0 : coinLimitCount;

      await redisClient.setKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${CURRENT_PRICE_COIN_COUNTER}`,
        nextCoinCounter.toString()
      );
    } catch (error) {
      console.error("fetchCmcPrice error", error);
    }
  };
  // public fetchCmcPrice = async () => {
  //   try {
  //     console.log("********* fetchCmcPrice *************");
  //     /** coins pagination */
  //     let coin_limit_count: number = 0;
  //     let limit: number = 50;
  //     let findCoinCounter: any = await redisClient.getKeyValuePair(
  //       config.REDISKEYS.COIN_LIMIT_COUNTS,
  //       `${CURRENT_PRICE_COIN_COUNTER}`
  //     );
  //     if (findCoinCounter) {
  //       coin_limit_count = Number(findCoinCounter);
  //     }

  //     console.log("coin_limit_countcoin_limit_count", coin_limit_count);

  //     /** currencies pagination */
  //     let currency_limit_count: number = 0;
  //     let currency_limit: number = 10;

  //     let findCurrencyCounter: any = await redisClient.getKeyValuePair(
  //       config.REDISKEYS.COIN_LIMIT_COUNTS,
  //       `${CURRENT_PRICE_CURRENCY_COUNTER}`
  //     );
  //     if (findCurrencyCounter) {
  //       currency_limit_count = Number(findCurrencyCounter);
  //     }

  //     let currency_data: any =
  //       await CurrencyFiat.CurrencyFiatWrite.findAndCountAll({
  //         attributes: ["currency_code"],
  //         raw: true,
  //         offset: currency_limit_count,
  //         limit: currency_limit,
  //         order: [["currency_id", "asc"]],
  //       });
  //     let coin_data_count: number = 0;
  //     if (currency_data.count > 0) {
  //       const codes = currency_data.rows.map((el: any) => el.currency_code);
  //       const cmcIds: number[] = [];

  //       let data: any = await Coins.CoinsRead.findAndCountAll({
  //         attributes: ["cmc_id"],
  //         where: { cmc_id: { [Op.ne]: 0 } },

  //         order: [["coin_id", "asc"]],
  //         limit,
  //         offset: coin_limit_count,
  //       });
  //       coin_data_count = data.count;
  //       if (data.count > 0) {
  //         for await (const iterator of data.rows) {
  //           cmcIds.push(iterator?.cmc_id as number);
  //         }
  //       }
  //       // Inserting cmc_ids in reset graph data table
  //       if (cmcIds.length > 0) {
  //         for (let i: number = 0; i < cmcIds.length; i++) {
  //           let id_exist: any = await reset_graph_data.ResetGraphRead.findOne({
  //             attributes: ["id"],
  //             where: { cmc_id: cmcIds[i] },
  //             raw: true,
  //           });
  //           if (id_exist == null) {
  //             let currentUTCDate: string = new Date()
  //               .toISOString()
  //               .replace(/T/, " ")
  //               .replace(/\..+/, "");
  //             await reset_graph_data.ResetGraphWrite.create({
  //               cmc_id: cmcIds[i],
  //               graph_type: "1d",
  //               created_at: currentUTCDate,
  //               updated_at: null,
  //             });
  //           }
  //         }
  //       }

  //       // Fetch Prices from cmc and update in db
  //       if (cmcIds.length > 0) {
  //         const tokenFormat = cmcIds.toString().replace(/[\[\]']+/g, "");
  //         const currencyFormat = codes.toString().replace(/[\[\]']+/g, "");
  //         let result: any = await cmcHelper.cmcApi(
  //           `quotes/latest?id=${tokenFormat}&convert=${currencyFormat}`
  //         );

  //         const cmcData = result?.data?.data;
  //         for (const property in cmcData) {
  //           const obj = cmcData[property];
  //           for await (let code of codes) {
  //             let checkCMCValueExist: any = await CMCDataNotExistModel.findOne({
  //               attributes: ["cmc_id"],
  //               where: {
  //                 cmc_id: obj.id,
  //                 fiat_type: code,
  //               },
  //               raw: true,
  //             });
  //             if (obj.quote[code] != null) {
  //               if (checkCMCValueExist) {
  //                 await CMCDataNotExistModel.destroy({
  //                   where: {
  //                     cmc_id: obj.id,
  //                     fiat_type: code,
  //                   },
  //                 });
  //               }
  //               let latest_price: any = {
  //                 price: obj.quote[code].price || 0,
  //                 timestamp: obj.quote[code].last_updated,
  //                 price_change_24h: obj.quote[code].percent_change_24h || 0,
  //                 volume_24h: obj.quote[code].volume_24h || 0,
  //                 percent_change_7d: obj.quote[code].percent_change_7d || 0,
  //                 percent_change_30d: obj.quote[code].percent_change_30d || 0,
  //               };
  //               if (latest_price !== null && latest_price !== "null") {
  //                 let where: any = { cmc_id: obj.id, fiat_type: code };

  //                 let checkIfCoinExist: any =
  //                   await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
  //                     attributes: ["id", "coin_id"],
  //                     where: {
  //                       fiat_type: code,
  //                       cmc_id: obj.id,
  //                     },
  //                     raw: true,
  //                   });
  //                 /** check by cmc id */

  //                 if (!checkIfCoinExist) {
  //                   /** if by cmc id not exist then check by coin id */
  //                   let coin_data: CoinModel | null =
  //                     await Coins.CoinsRead.findOne({
  //                       attributes: ["coin_id"],
  //                       where: {
  //                         cmc_id: obj.id,
  //                       },
  //                     });
  //                   if (coin_data) {
  //                     checkIfCoinExist =
  //                       await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
  //                         attributes: ["id", "coin_id"],
  //                         where: {
  //                           fiat_type: code,
  //                           coin_id: coin_data?.coin_id,
  //                         },
  //                         raw: true,
  //                       });
  //                   }
  //                 }
  //                 let coin_id: number = 0;
  //                 if (checkIfCoinExist) {
  //                   coin_id = checkIfCoinExist.coin_id;
  //                   await CoinPriceInFiat.CoinPriceInFiatWrite.update(
  //                     {
  //                       value: obj?.quote[code]?.price || 0,
  //                       price_change_24h: obj.quote[code].percent_change_24h,
  //                       price_change_percentage_24h:
  //                         obj.quote[code].percent_change_24h,
  //                       volume_24h: obj.quote[code].volume_24h,
  //                       total_supply: obj.total_supply,
  //                       latest_price: latest_price,
  //                       latest_price_source: "current",
  //                     },
  //                     {
  //                       where: where,
  //                     }
  //                   );
  //                 } else {
  //                   let coin: any = await Coins.CoinsRead.findOne({
  //                     attributes: [
  //                       "coin_id",
  //                       "coin_family",
  //                       "cmc_id",
  //                       "token_address",
  //                     ],
  //                     where: {
  //                       cmc_id: obj.id,
  //                     },
  //                   });
  //                   if (coin) {
  //                     coin_id = coin.coin_id;
  //                     await CoinPriceInFiat.CoinPriceInFiatWrite.create({
  //                       coin_id: coin.coin_id,
  //                       coin_name: obj.name,
  //                       coin_family: coin.coin_family,
  //                       max_supply: obj.max_supply || 0,
  //                       cmc_id: coin.cmc_id,
  //                       circulating: obj.circulating_supply || 0,
  //                       total_supply: obj.total_supply,
  //                       rank: obj.cmc_rank || 0,
  //                       market_cap: obj?.quote[code]?.market_cap || 0,
  //                       fiat_type: code.toLowerCase(),
  //                       coin_symbol: obj.symbol,
  //                       value: obj?.quote[code].price || 0,
  //                       price_change_24h:
  //                         obj.quote[code].percent_change_24h || 0,
  //                       price_change_percentage_24h:
  //                         obj.quote[code].percent_change_24h || 0,
  //                       volume_24h: obj.quote[code].volume_24h || 0,
  //                       token_address: coin.token_address,
  //                       latest_price: latest_price,
  //                       latest_price_source: "current",
  //                     });
  //                   }
  //                 }
  //                 /** update latest record in history candle */
  //                 if (coin_id > 0 && code?.toLowerCase() == "usd") {
  //                   await this.updateHistoryLastPrice(
  //                     latest_price,
  //                     obj.id,
  //                     code,
  //                     where
  //                   );
  //                 }
  //               }
  //             } else {
  //               if (checkCMCValueExist) {
  //                 console.log(" CMC id Exist");
  //               } else {
  //                 const data = await Coins.CoinsRead.findOne({
  //                   attributes: ["cmc_id", "token_address"],
  //                   where: { cmc_id: obj.id },
  //                   raw: true,
  //                 });
  //                 await CMCDataNotExistModel.create({
  //                   cmc_id: obj.id,
  //                   token_address: data?.token_address
  //                     ? data?.token_address
  //                     : null,
  //                   fiat_type: code,
  //                 });
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //     currency_limit_count = currency_limit_count + currency_limit;
  //     let currency_counter =
  //       currency_limit_count >= currency_data.count ? 0 : currency_limit_count;

  //     if (currency_counter == 0) {
  //       /** update coins pagination */
  //       coin_limit_count = coin_limit_count + limit;
  //       let counter =
  //         coin_limit_count >= coin_data_count ? 0 : coin_limit_count;
  //       await redisClient.setKeyValuePair(
  //         config.REDISKEYS.COIN_LIMIT_COUNTS,
  //         `${CURRENT_PRICE_COIN_COUNTER}`,
  //         counter.toString()
  //       );
  //     }
  //     /** update currencies pagination */
  //     await redisClient.setKeyValuePair(
  //       config.REDISKEYS.COIN_LIMIT_COUNTS,
  //       `${CURRENT_PRICE_CURRENCY_COUNTER}`,
  //       currency_counter.toString()
  //     );
  //   } catch (error) {
  //     console.error("fffffetch_coin_price errorjsj", error);
  //   }
  // };

  private updateHistoryLastPrice = async (
    latest_price: any,
    id: number,
    code: string,
    where: any
  ) => {
    const historyExistData =
      await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findAndCountAll({
        attributes: [`id`, `sparkline`, `type`],
        where: where,
      });
    if (historyExistData.count > 0) {
      for (const history of historyExistData.rows) {
        const history_sparkline: any =
          history.sparkline !== null ? history.sparkline : [];
        if (history_sparkline.length > 0) {
          const cleanedData = history_sparkline.filter(
            (item: any) => item !== null
          );
          const lastRecord = cleanedData[cleanedData?.length - 1];
          const existingTimestamp = new Date(lastRecord?.timestamp).getTime();
          const latestTimestamp = new Date(latest_price?.timestamp).getTime();
          if (latestTimestamp > existingTimestamp) {
            cleanedData.push(latest_price);
            const history_data: any = await globalHelper.setGraphData(
              cleanedData
            );

            if (history_data.status) {
              const updateData: any = {
                sparkline: history_data.graphData,
                cmc_id: id,
                latest_price_source: "current",
              };
              await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.update(
                updateData,
                { where: { id: history.id } }
              );
            }
          }
        } else {
          history_sparkline.push(latest_price);
          const history_data: any = await globalHelper.setGraphData(
            history_sparkline
          ); // slicing the data
          if (history_data.status) {
            const updateData: any = {
              sparkline: history_data.graphData,
              cmc_id: id,
              latest_price_source: "current",
            };
            await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.update(
              updateData,
              { where: { id: history.id } }
            );
          }
        }
      }
    } else {
      const types = ["1d", "1w", "1m", "1y"];
      for (let i = 0; i < types.length; i++) {
        const create_data: any = {
          cmc_id: id,
          type: types[i],
          fiat_type: code,
          sparkline: [latest_price],
        };
        await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.create(
          create_data
        );
      }
    }
  };

  /**
   * graph data for coins
   * @param interval
   */
  public getCoinGraphData = async (
    startDate: string,
    endDate: string,
    interval: string,
    type: "1d" | "1w" | "1m" | "1y",
    coin_limit: number
  ) => {
    const cmcIds: any[] = [];
    try {
      console.log("********* fetchgraphdata *************");
      /** coins pagination */
      let coinLimitCount = 0;
      let limit = coin_limit;
      let findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${type}_${GRAPH_DATA_COIN_COUNTER}`
      );

      if (findCoinCounter) {
        coinLimitCount = Number(findCoinCounter);
      }
      // let now = new Date();
      // let subtractTime = new Date(now);
      // // Calculate different time ranges
      // if (type == "1d") {
      //   subtractTime.setHours(subtractTime.getHours() - 4);
      // } else if (type == "1w") {
      //   subtractTime.setHours(subtractTime.getHours() - 6);
      // } else if (type == "1m") {
      //   subtractTime.setDate(subtractTime.getDate() - 1);
      // } else {
      //   subtractTime.setDate(subtractTime.getDate() - 3);
      // }
      // console.log("subtractTime :>> ", subtractTime, "timeperiod :>>", type);
      /*let dbCoinrecords: any;

      dbCoinrecords =
        await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findAndCountAll({
          where: {
            // updated_at: { [Op.lt]: subtractTime },
            type: type,
            fiat_type: "USD",
          },
          order: [["cmc_id", "asc"]], // cmc_id replace with coin_id in order by
          limit: limit,
          offset: coin_limit_count,
          logging: true,
        });

      console.log(
        "dbCoinrecords.count :>> ",
        dbCoinrecords.count,
        "type :",
        type
      );
      let groupedCount = dbCoinrecords.count; // This is an array of grouped results
      let totalRecords = dbCoinrecords.rows.length; // Total number of unique groups (cmc_id)
      if (dbCoinrecords.count == 0) {*/
      const totalCmcIds: number = await Coins.CoinsRead.count({
        distinct: true,
        col: 'cmc_id',
        where: {
          cmc_id: {
            [Op.ne]: 0
          },
          [Op.and]: [
            Sequelize.literal('cmc_id IS NOT NULL')
          ]
        },
        // logging: true
      })
      const coinRecords: any = await Coins.CoinsRead.findAll({
        attributes: ["cmc_id"],
        where: {
          cmc_id: {
            [Op.ne]: 0
          },
          [Op.and]: [
            Sequelize.literal('cmc_id IS NOT NULL')
          ]
        },
        // where: {
        //   cmc_id: { [Op.ne]: 0, [Op.not]: null },
        //   // cmc_id: { [Op.ne]: 0, },
        //   // [Op.and]: [sequelize.literal(`(graph_data.updated_at IS NULL)`)],
        // },
        // include: [
        //   {
        //     model: CoinPriceInFiatGraph.CoinPriceInFiatGraphRead,
        //     attributes: ["type", "updated_at"], // Specify the columns to return from the graph_data table
        //     as: "graph_data",
        //     where: {
        //       type: type,
        //       fiat_type: "USD",
        //     },
        //     required: false, // Set to false for LEFT JOIN
        //   },
        // ],
        // raw: true,
        group: ["cmc_id"],
        order: [["cmc_id", "asc"]], // cmc_id replace with coin_id in order by
        limit: limit,
        offset: coinLimitCount,
        logging: true,
      });
      // const groupedCount: number = dbCoinrecords.count; // This is an array of grouped results
      const totalRecords: number = coinRecords ? coinRecords.length : 0; // Total number of unique groups (cmc_id)
      // }

      // if (!totalRecords) {
      //   let counter = 0;
      //   await redisClient.setKeyValuePair(
      //     config.REDISKEYS.COIN_LIMIT_COUNTS,
      //     `${type}_${GRAPH_DATA_COIN_COUNTER}`,
      //     counter.toString()
      //   );
      //   return;
      // }
      // Access grouped rows (the data)
      // const groupedRows = dbCoinrecords;

      // Example: Iterate over groups

      if (totalRecords > 0) {
        await coinRecords.forEach((coin: any) => {
          cmcIds.push(coin.cmc_id);
        });
      }



      if (totalRecords > 0) {
        const code = "USD";
        const requestOptionsForListing = await cmcHelper.cmcHistoricalData(
          cmcIds,
          interval,
          startDate,
          endDate
        );
        const data = await rp(requestOptionsForListing);
        if (data) {
          // let created_at;
          // const currentUTCDate: string = new Date()
          //   .toISOString()
          //   .replace(/T/, " ")
          //   .replace(/\..+/, "");
          for await (const id of cmcIds) {
            const fiat_type = code;
            let sparkline: any = [];

            if (data?.data[id]?.quotes && data?.data[id]?.quotes.length > 0) {
              sparkline = await data?.data[id]?.quotes.map(
                (data: any, index: number) => {
                  if (
                    data?.quote[code?.toUpperCase()] !== undefined &&
                    data?.quote[code?.toUpperCase()] !== null
                  ) {
                    // created_at = new Date(
                    //   data?.quote[code?.toUpperCase()]?.timestamp
                    // )
                    //   ?.toISOString()
                    //   ?.replace(/T/, " ")
                    //   ?.replace(/\..+/, "");
                    return {
                      price: data.quote[code.toUpperCase()].price || 0,
                      timestamp: data.quote[code.toUpperCase()].timestamp || 0,
                      percent_change_24h:
                        data.quote[code.toUpperCase()].percent_change_24h || 0,
                      volume_24h:
                        data.quote[code.toUpperCase()].volume_24h || 0,
                      percent_change_7d:
                        data.quote[code.toUpperCase()].percent_change_7d || 0,
                      percent_change_30d:
                        data.quote[code.toUpperCase()].percent_change_30d || 0,
                    };
                  }
                }
              );
            } else if (data?.data?.quotes && data?.data?.quotes.length > 0) {
              sparkline = data?.data?.quotes.map((data: any, index: number) => {
                if (
                  data?.quote[code?.toUpperCase()] !== undefined &&
                  data?.quote[code?.toUpperCase()] !== null
                ) {
                  // created_at = new Date(
                  //   data.quote[code?.toUpperCase()]?.timestamp
                  // )
                  //   .toISOString()
                  //   .replace(/T/, " ")
                  //   .replace(/\..+/, "");
                  return {
                    price: data.quote[code?.toUpperCase()].price || 0,
                    timestamp: data.quote[code?.toUpperCase()].timestamp || 0,
                    percent_change_24h:
                      data.quote[code?.toUpperCase()].percent_change_24h || 0,
                    volume_24h: data.quote[code?.toUpperCase()].volume_24h || 0,
                    percent_change_7d:
                      data.quote[code?.toUpperCase()].percent_change_7d || 0,
                    percent_change_30d:
                      data.quote[code?.toUpperCase()].percent_change_30d || 0,
                  };
                }
              });
            }
            if (sparkline.length > 0) {
              const where: any = {
                cmc_id: id,
                fiat_type: code,
                type: type,
              };
              const recordExist: any =
                await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findOne({
                  attributes: ["id", "sparkline"],
                  where: where,
                });

              if (recordExist) {
                const getGraphData: any = await globalHelper.setGraphData(
                  sparkline
                ); // slicing sparkline data

                if (getGraphData.status) {
                  const updateData = {
                    sparkline: getGraphData.graphData,
                    cmc_id: id,
                    latest_price_source: type,
                    // updated_at: currentUTCDate,
                  };

                  await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.update(
                    updateData,
                    {
                      where: where,
                    }
                  );
                }
              } else {
                await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.create({
                  sparkline: sparkline,
                  cmc_id: id,
                  latest_price_source: type,
                  fiat_type: fiat_type?.toUpperCase(),
                  type: type,
                  // created_at,
                  // updated_at: currentUTCDate,
                });
              }
            } else {
              console.log('empty sparkline >>>', sparkline);
              // const whereCond: any = {
              //   cmc_id: id,
              //   fiat_type: code,
              //   type: type,
              // };
              // await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.update(
              //   {
              //     updated_at: currentUTCDate,
              //   },
              //   {
              //     where: whereCond,
              //   }
              // );
            }
          }
        }
      }

      /** update coins pagination */

      coinLimitCount = coinLimitCount + limit;
      console.log('coinLimitCount >>>>', `${type}_${GRAPH_DATA_COIN_COUNTER}`, 'dddddddddddddddddddddddddddddddddddddddd', coinLimitCount);
      console.log('totalCmcIds >>>>', 'dddddddddddddddddddddddddddddddddddddddd', totalCmcIds);

      const nextCoinCounter = coinLimitCount >= totalCmcIds ? 0 : coinLimitCount;
      await redisClient.setKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${type}_${GRAPH_DATA_COIN_COUNTER}`,
        nextCoinCounter.toString()
      );

      return;
    } catch (error: any) {
      console.error(
        `err`,
        "historical data type",
        cmcIds,
        type,
        "error =>",
        error?.message
      );
      if (error?.response?.data?.status?.error_message) {
        const message = error.response.data.status.error_message;
        const position = message.includes('No data found for "id"');
        const position1 = message.includes("No items found");

        if (position || position1) {
          const updateGraphNotFound =
            await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.destroy({
              where: {
                cmc_id: {
                  [Op.in]: cmcIds,
                },
              },
            });

          console.log("updateGraphNotFound :>> ", updateGraphNotFound);

          const updateCoinNotFound = await Coins.CoinsWrite.update(
            { cmc_id: 0 },
            {
              where: {
                cmc_id: {
                  [Op.in]: cmcIds,
                },
              },
            }
          );
          console.log("updateCoinNotFound :>> ", updateCoinNotFound);
        }
      }
      return;
    }
  };

  // private compare_update_prices = async (
  //   sparkline: any,
  //   recordExist: any,
  //   id: number,
  //   code: string,
  //   type: string
  // ) => {
  //   if (!sparkline?.length) return sparkline;

  //   const sparklineLatestRecord = sparkline[sparkline.length - 1]
  //     ? sparkline[sparkline.length - 1]
  //     : null;

  //   const existingSparkline = recordExist.sparkline || [];
  //   const cleanedData = existingSparkline.filter((item: any) => item !== null);
  //   const existingLastRecord =
  //     cleanedData.length > 0 ? cleanedData[cleanedData.length - 1] : null;
  //   if (existingLastRecord && sparklineLatestRecord) {
  //     const existingTimestamp = new Date(
  //       existingLastRecord.timestamp
  //     ).getTime();
  //     const latestTimestamp = new Date(
  //       sparklineLatestRecord.timestamp
  //     ).getTime();

  //     if (existingTimestamp > latestTimestamp) {
  //       sparkline.push(existingLastRecord);
  //       return sparkline; // Early return if we push existing record
  //     }

  //     const coinData = await Coins.CoinsRead.findOne({
  //       attributes: ["coin_id"],
  //       where: { cmc_id: id },
  //     });

  //     await CoinPriceInFiat.CoinPriceInFiatWrite.update(
  //       {
  //         coin_id: coinData?.coin_id,
  //         value: sparklineLatestRecord?.price || 0,
  //         price_change_24h: sparklineLatestRecord?.percent_change_24h || 0,
  //         price_change_percentage_24h:
  //           sparklineLatestRecord?.percent_change_24h || 0,
  //         volume_24h: sparklineLatestRecord?.volume_24h || 0,
  //         latest_price: sparklineLatestRecord,
  //         latest_price_source: type,
  //       },
  //       {
  //         where: {
  //           cmc_id: id,
  //           fiat_type: code,
  //         },
  //       }
  //     );
  //   }

  //   return sparkline;
  // };

  public fetchCmcIds = async () => {
    try {
      const BATCH_SIZE = 10;
      let coin_limit_count = 0;

      // Get current counter from Redis
      const findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        FETCH_CMC_IDS_COIN_COUNTER
      );

      if (findCoinCounter) {
        coin_limit_count = Number(findCoinCounter);
      }

      // Fetch coins that need CMC IDs
      const data = await Coins.CoinsWrite.findAndCountAll({
        attributes: [
          "coin_id",
          "token_address",
          "coin_symbol",
          "coin_image"
        ],
        where: {
          coin_status: 1,
          is_on_cmc: 1,
          [Op.or]: [
            {
              cmc_id: {
                [Op.eq]: 0,
              },
            },
            {
              coin_image: null,
            },
          ],
        },
        raw: true,
        limit: BATCH_SIZE,
        offset: coin_limit_count,
      });

      if (data?.count > 0) {
        // Process coins in parallel with error handling for each
        await Promise.all(data.rows.map(async (coin) => {
          try {
            // const query_data = coin.token_address
            //   ? `?address=${coin.token_address}`
            //   : `?symbol=${coin.coin_symbol}`;

            const query_data = `?address=${coin.token_address}`;

            const result = await cmcHelper.cmcApi(`info${query_data}`);

            if (!result?.data?.data) {
              console.warn(`No CMC data found for coin ${coin.coin_symbol}`);
              return;
            }

            let cmcId: number;
            let image: string | null = null;

            if (query_data.startsWith('?symbol=')) {
              const symbolData = result.data.data[coin.coin_symbol];
              if (!symbolData?.[0]?.id) {
                console.warn(`Invalid CMC response format for symbol ${coin.coin_symbol}`);
                return;
              }

              cmcId = symbolData[0].id;

              if (!coin.coin_image || coin.coin_image === 'null') {
                image = symbolData[0].logo;
              }
            } else {
              const dataKeys = Object.keys(result.data.data);
              if (!dataKeys.length) {
                console.warn(`No CMC data found for address ${coin.token_address}`);
                return;
              }

              cmcId = Number(dataKeys[0]);
              if (!coin.coin_image || coin.coin_image === 'null') {
                image = result.data.data[cmcId]?.logo || null;
              }
            }

            if (!cmcId) {
              console.warn(`Failed to extract CMC ID for coin ${coin.coin_symbol}`);
              return;
            }

            // Standardize image resolution to 200x200 if needed
            if (image && !image.includes("img/coins/200x200/")) {
              const resolutions = ['16x16', '32x32', '64x64', '128x128'];
              for (const resolution of resolutions) {
                if (image.includes(`img/coins/${resolution}/`)) {
                  image = image.replace(resolution, '200x200');
                  break;
                }
              }
            }

            const updateData: any = {
              cmc_id: cmcId,
              is_on_cmc: 1,
            };

            if (image) {
              updateData.coin_image = image;
            }

            await Coins.CoinsWrite.update(
              updateData,
              {
                where: {
                  coin_id: coin.coin_id,
                },
              }
            );

          } catch (error: any) {
            console.error(`Error processing coin ${coin.coin_symbol}:`, error.message);

            // Mark coin as not on CMC if we failed to fetch data
            await Coins.CoinsWrite.update(
              { is_on_cmc: 0 },
              {
                where: {
                  coin_id: coin.coin_id,
                },
              }
            );
          }
        }));
      }

      // Update pagination counter
      const nextCounter = coin_limit_count + BATCH_SIZE >= data?.count
        ? 0
        : coin_limit_count + BATCH_SIZE;

      await redisClient.setKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        FETCH_CMC_IDS_COIN_COUNTER,
        nextCounter.toString()
      );

    } catch (error: any) {
      console.error("Error in fetchCmcIds:", error.message);
      throw error; // Re-throw to allow caller to handle
    }
  };

  public fetchCmcIdsBySymbol = async () => {
    try {
      const BATCH_SIZE = 10;
      let coin_limit_count = 0;

      // Get current counter from Redis
      const findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        FETCH_CMC_IDS_COIN_COUNTER
      );

      if (findCoinCounter) {
        coin_limit_count = Number(findCoinCounter);
      }

      // Fetch coins that need CMC IDs
      const data: any = await Coins.CoinsWrite.findAndCountAll({
        attributes: [
          "coin_id",
          "token_address",
          "coin_symbol",
          "coin_image",
          "coin_family"
        ],
        where: {
          coin_status: 1,
          is_on_cmc: 1,
          [Op.or]: [
            {
              cmc_id: {
                [Op.eq]: 0,
              },
            },
            {
              coin_image: null,
            },
          ],
        },
        raw: true,
        limit: BATCH_SIZE,
        offset: coin_limit_count,
      });
      

      if (data?.count > 0) {
        // Process coins in parallel with error handling for each
        await Promise.all(data.rows.map(async (coin: any) => {
          try {
            
            let cmcId: number = 0;
            let image: string | null = null;

            const cmcPayload: any = {
              symbol: coin.coin_symbol,
              coinFamily: coin.coin_family,
              tokenAddress: coin.token_address,
            }
            const cmcResData: any = await cmcHelper.getCmcDataBySymbol(cmcPayload);

            //if cmcResData is null then fallback to getCmcTokenDataByAddress
            if(cmcResData?.id == null || cmcResData?.image == null){
               
              const fallbackPayload: any = {
                token_address: coin.token_address,
              }
              const fallbackData: any = await cmcHelper.getCmcTokenDataByAddress(fallbackPayload);
              if(fallbackData?.id || fallbackData?.image){
                cmcId = fallbackData?.id;
                image = fallbackData?.image;
              }
            }else{
              cmcId = cmcResData?.id;
              image = cmcResData?.image;
            }
    
            //if cmcId is not 0 and image is not null then update
            if(cmcId !== 0 && image !== null){
              const updateData: any = {
                cmc_id: cmcId,
                is_on_cmc: 1,
                coin_image: image,
              };
  
              await Coins.CoinsWrite.update(
                updateData,
                {
                  where: {
                    coin_id: coin.coin_id,
                  },
                }
              );
            }else{
              //means coin is not on cmc 
              await Coins.CoinsWrite.update(
                { is_on_cmc: 0 },
                {
                  where: {
                    coin_id: coin.coin_id,
                  },
                }
              );
            }


          } catch (error: any) {
            console.error(`Error processing coin ${coin.coin_symbol}:`, error.message);

            // Mark coin as not on CMC if we failed to fetch data
            await Coins.CoinsWrite.update(
              { is_on_cmc: 0 },
              {
                where: {
                  coin_id: coin.coin_id,
                },
              }
            );
          }
        }));
      }

      // Update pagination counter
      const nextCounter = coin_limit_count + BATCH_SIZE >= data?.count
        ? 0
        : coin_limit_count + BATCH_SIZE;

      await redisClient.setKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        FETCH_CMC_IDS_COIN_COUNTER,
        nextCounter.toString()
      );

    } catch (error: any) {
      console.error("Error in fetchCmcIds:", error.message);
      throw error; // Re-throw to allow caller to handle
    }
  };

  public async updateFiatPrice() {
    try {
      const findFiat = await CurrencyFiat.CurrencyFiatWrite.findAll();
  
      if (!findFiat.length) {
        console.log("No fiat currencies found in DB.");
        return;
      }
  
      const cryptoSymbols = findFiat.map((coin) => coin.currency_code);
  
      const requestOptionsForListing = await cmcHelper.cmcFiatCurrencyData(cryptoSymbols);
      const result = await rp(requestOptionsForListing);
  
      if (result && result.data) {
        const response = result.data["2781"];
  
        for (const data of cryptoSymbols) {
          const price = response?.quote?.[data]?.price;
  
          if (price != null) {
            await CurrencyFiat.CurrencyFiatWrite.update(
              { price_in_usd: price },
              { where: { currency_code: data } }
            );
          } else {
            console.log(`Skipping ${data} — price is null or undefined`);
          }
        }
      } else {
        console.log("No Fiat Currency data returned from provider.");
      }
    } catch (error) {
      console.log("::Error log:: updateFiatPrice :>> ", error);
      return false;
    }
  }
  
  
  //old code  logic
  // public async updateFiatPrice() {
  //   try {
  //     let findFiat = await CurrencyFiat.CurrencyFiatWrite.findAll();

  //     let cryptoSymbols = [];
  //     if (findFiat.length) {
  //       for await (let coin of findFiat) {
  //         let cmdId = coin.currency_code;
  //         cryptoSymbols.push(cmdId);
  //       }
  //     }

  //     let requestOptionsForListing = await cmcHelper.cmcFiatCurrencyData(
  //       cryptoSymbols
  //     );
  //     const result = await rp(requestOptionsForListing);

  //     if (result && result.data) {
  //       const response = result.data["2781"];
  //       for (let data of cryptoSymbols) {
  //         await CurrencyFiat.CurrencyFiatWrite.update(
  //           { price_in_usd: response.quote[`${data}`]?.price },
  //           {
  //             where: { currency_code: data },
  //           }
  //         );
  //       }
  //     } else {
  //       console.log("No Fiat Currency Found..");
  //     }
  //   } catch (error) {
  //     console.log("::Error log:: updateFiatPrice :>> ", error);
  //     return false;
  //   }
  // }

  // public delete_graph_old_data = async (
  //   coin_family: string,
  //   compare_date: string,
  //   graph_type: string
  // ) => {
  //   try {
  //     let family_data = Object.keys(COIN_FAMILY).find(
  //       (key) => COIN_FAMILY[key] === coin_family
  //     );

  //     console.log("********* DeleteGraph data *************", family_data);
  //     /** coins pagination */
  //     let coin_limit_count = 0;
  //     let limit = 1;
  //     let findCoinCounter = await redisClient.getKeyValuePair(
  //       config.REDISKEYS.COIN_LIMIT_COUNTS,
  //       `${family_data}_${graph_type}_${DELETE_GRAPH_COIN_COUNTER}`
  //     );
  //     if (findCoinCounter) {
  //       coin_limit_count = Number(findCoinCounter);
  //     }

  //     const currency_data =
  //       await CurrencyFiat.CurrencyFiatWrite.findAndCountAll({
  //         attributes: ["currency_code"],
  //         raw: true,
  //       });
  //     let currencies: string[] = [];
  //     if (currency_data.count > 0) {
  //       currencies = currency_data.rows.map((el) => el.currency_code);
  //     }

  //     const coin_data: any = await Coins.CoinsRead.findAndCountAll({
  //       attributes: ["cmc_id"],
  //       where: { cmc_id: { [Op.ne]: 0 }, coin_family: coin_family },
  //       raw: true,
  //       limit,
  //       offset: coin_limit_count,
  //     });
  //     let cmcIds: number[] = [];
  //     if (coin_data.count > 0) {
  //       for await (const iterator of coin_data.rows) {
  //         cmcIds.push(iterator?.cmc_id as number);
  //       }
  //     }

  //     if (coin_data.count > 0) {
  //       let historyExistData =
  //         await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findAndCountAll({
  //           attributes: [`id`, `sparkline`, `type`],
  //           where: {
  //             cmc_id: { [Op.in]: cmcIds },
  //             fiat_type: { [Op.in]: currencies },
  //             type: graph_type,
  //           },
  //           limit: 1,
  //         });
  //       if (historyExistData.count > 0) {
  //         for (let history of historyExistData.rows) {
  //           let history_sparkline: any =
  //             history.sparkline !== null ? history.sparkline : [];
  //           let latest_sparkline: any = [];
  //           let last_time_stamp: any = "";
  //           let minutes: number = 0;
  //           if (history_sparkline.length > 0) {
  //             for (let sparkline of history_sparkline) {
  //               if (last_time_stamp !== "") {
  //                 let diff: any = Math.abs(
  //                   new Date(last_time_stamp).getTime() -
  //                   new Date(sparkline?.timestamp).getTime()
  //                 );
  //                 minutes = Math.floor(diff / 1000 / 60);
  //                 if (minutes >= 5) {
  //                   last_time_stamp = sparkline?.timestamp;
  //                 }
  //               } else {
  //                 last_time_stamp = sparkline?.timestamp;
  //               }

  //               if (
  //                 new Date(sparkline?.timestamp).getTime() >=
  //                 new Date(compare_date).getTime() &&
  //                 minutes >= 5
  //               ) {
  //                 latest_sparkline.push(sparkline);
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }

  //     /** update coins pagination */
  //     coin_limit_count = coin_limit_count + limit;
  //     let counter =
  //       coin_limit_count >= coin_data.count ? 0 : coin_limit_count + limit;

  //     await redisClient.setKeyValuePair(
  //       config.REDISKEYS.COIN_LIMIT_COUNTS,
  //       `${family_data}_${graph_type}_${DELETE_GRAPH_COIN_COUNTER}`,
  //       counter.toString()
  //     );
  //   } catch (error) {
  //     console.error("fetchhhhhh_coin_price errorjsj", error);
  //   }
  // };

  // Utility function to format exchange names
  // public formatExchangeName = (exchangeName: string): string => {
  //   return exchangeName
  //     .split(" ") // Split the string by spaces
  //     .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
  //     .join("") // Join without spaces
  //     .replace(/v(\d+)/gi, "V$1"); // Handle 'v3' to 'V3'
  // };

  // public async moralisTradingviewChartWidget(
  //   chain: string,
  //   coinFamily: number,
  //   tokenType: string
  // ) {
  //   try {
  //     const tradingviewTokens = await Coins.CoinsRead.findAll({
  //       attributes: [
  //         "coin_id",
  //         "coin_symbol",
  //         "coin_family",
  //         "is_token",
  //         "token_address",
  //         "graph_source",
  //         "graph_pair",
  //         "pair_address",
  //       ],
  //       where: {
  //         // is_token: { [Op.ne]: null },     //      old check
  //         is_token: 1,
  //         coin_family: coinFamily,
  //         token_type: tokenType,
  //         pair_address: { [Op.eq]: null },
  //       },
  //     });

  //     const BATCH_SIZE = 20;
  //     const delay = (ms: number) =>
  //       new Promise((resolve) => setTimeout(resolve, ms));

  //     for (let i = 0; i < tradingviewTokens.length; i += BATCH_SIZE) {
  //       const batch = tradingviewTokens.slice(i, i + BATCH_SIZE);

  //       // Process each batch
  //       const batchPromises = batch.map(async (token) => {
  //         const { coin_id, token_address, coin_symbol } = token;

  //         if (!token_address) {
  //           console.warn(
  //             `Skipping token with ID: ${coin_id}, as it has no token_address`
  //           );
  //           return;
  //         }

  //         const url = `https://deep-index.moralis.io/api/v2.2/erc20/${token_address}/pairs?chain=${chain}`;

  //         try {
  //           // Delay 1 second before each request
  //           await delay(1000);

  //           // Fetch data from Moralis API
  //           const response = await axios.get(url, {
  //             headers: { "x-api-key": config.MORALIS_KEY },
  //           });

  //           const pairs = response?.data?.pairs;
  //           if (pairs?.length > 0) {
  //             const activePair = await pairs.find(
  //               (pair: any) =>
  //                 pair?.inactive_pair === false || pair?.inactivePair === false
  //             );
  //             if (activePair) {
  //               const pairAddress = activePair?.pair_address || null;
  //               const rawExchangeName = activePair?.exchange_name || null;
  //               const graphSource = rawExchangeName
  //                 ? this.formatExchangeName(rawExchangeName)
  //                 : null;

  //               if (pairAddress) {
  //                 // Update the database with graph source and pair
  //                 await Coins.CoinsWrite.update(
  //                   {
  //                     graph_source: graphSource,
  //                     graph_pair: activePair.pair_label,
  //                     pair_address: pairAddress,
  //                   },
  //                   { where: { coin_id } }
  //                 );
  //               }
  //             }
  //           } else {
  //             console.warn(
  //               `No pairs found for coin ID: ${coin_id}, Symbol: ${coin_symbol} Token address: ${token_address}`
  //             );
  //           }
  //         } catch (err: any) {
  //           console.error(
  //             `Error processing coin ID: ${coin_id}, Symbol: ${coin_symbol} Token address: ${token_address}`,
  //             err?.message || err
  //           );
  //         }
  //       });

  //       // Wait for the current batch to complete before moving to the next
  //       await Promise.allSettled(batchPromises);
  //     }
  //   } catch (error) {
  //     console.log(
  //       "::Error log:: 🔥 ~ moralisTradingviewChartWidget error",
  //       error
  //     );
  //     return false;
  //   }
  // }

  // public async moralisTradingviewChartWidgetSOL() {
  //   try {
  //     const tradingviewTokens = await Coins.CoinsRead.findAll({
  //       attributes: [
  //         "coin_id",
  //         "coin_symbol",
  //         "coin_family",
  //         "is_token",
  //         "token_address",
  //         "graph_source",
  //         "graph_pair",
  //         "pair_address",
  //       ],
  //       where: {
  //         is_token: 1,
  //         coin_family: COIN_FAMILY.SOL,
  //         pair_address: { [Op.eq]: null },
  //       },
  //     });

  //     const BATCH_SIZE = 20;
  //     const delay = (ms: number) =>
  //       new Promise((resolve) => setTimeout(resolve, ms));

  //     for (let i = 0; i < tradingviewTokens.length; i += BATCH_SIZE) {
  //       const batch = tradingviewTokens.slice(i, i + BATCH_SIZE);

  //       // Process each batch
  //       const batchPromises = batch.map(async (token) => {
  //         const { coin_id, token_address, coin_symbol } = token;

  //         if (!token_address) {
  //           console.warn(
  //             `Skipping token with ID: ${coin_id}, as it has no token_address`
  //           );
  //           return;
  //         }

  //         const url = `https://solana-gateway.moralis.io/token/mainnet/${token_address}/pairs`;

  //         try {
  //           // Delay 1 second before each request
  //           await delay(1000);

  //           // Fetch data from Moralis API
  //           const response = await axios.get(url, {
  //             headers: { "x-api-key": config.MORALIS_KEY },
  //           });

  //           const pairs = response?.data?.pairs;
  //           if (pairs?.length > 0) {
  //             const activePair = await pairs.find(
  //               (pair: any) =>
  //                 pair?.inactive_pair === false || pair?.inactivePair === false
  //             );
  //             if (activePair) {
  //               const pairAddress = activePair?.pairAddress || null;
  //               const rawExchangeName = activePair?.exchangeName || null;
  //               const graphSource = rawExchangeName
  //                 ? this.formatExchangeName(rawExchangeName)
  //                 : null;

  //               if (pairAddress) {
  //                 // Update the database with graph source and pair
  //                 await Coins.CoinsWrite.update(
  //                   {
  //                     graph_source: graphSource,
  //                     graph_pair: activePair.pairLabel,
  //                     pair_address: pairAddress,
  //                   },
  //                   { where: { coin_id } }
  //                 );
  //               }
  //             }
  //           } else {
  //             console.warn(
  //               `No pairs found for coin ID: ${coin_id}, Symbol: ${coin_symbol} Token address: ${token_address}`
  //             );
  //           }
  //         } catch (err: any) {
  //           console.error(
  //             `Error processing coin ID: ${coin_id}, Symbol: ${coin_symbol} Token address: ${token_address}`,
  //             err?.message || err
  //           );
  //         }
  //       });

  //       // Wait for the current batch to complete before moving to the next
  //       await Promise.allSettled(batchPromises);
  //     }
  //   } catch (error) {
  //     console.log(
  //       "::Error log:: 🔥 ~ moralisTradingviewChartWidgetSOL error",
  //       error
  //     );
  //     return false;
  //   }
  // }



  // public async updateTicsPrice() {
  //   try {
  //     const currency_data = await CurrencyFiat.CurrencyFiatWrite.findAndCountAll({
  //       attributes: ["currency_code", "price_in_usd"],
  //       where: {
  //         currency_code: { [Op.ne]: "USD" },
  //       },
  //       raw: true,
  //       order: [["currency_id", "asc"]],
  //     });

  //     if (currency_data.count === 0) return;

  //     const result = await axios.get('https://evm-api.qubetics.com/qubetics/explorer/current-token-price');
  //     const ticsUsdPrice = result?.data?.data || 0;
  //     const coin_family = COIN_FAMILY?.TICS ? COIN_FAMILY?.TICS : 7

  //     const coin_data = await Coins.CoinsRead.findOne({
  //       attributes: ["coin_id", "cmc_id"],
  //       where: {
  //         coin_name: { [Op.like]: 'Qubetics' },
  //         coin_symbol: { [Op.like]: 'tics' },
  //         coin_family: coin_family,
  //       },
  //     });

  //     if (!coin_data || coin_data === null) {
  //       console.log("TICS coin not found");
  //       return;
  //     }

  //     const coin_id = coin_data.coin_id;
  //     let price_change_percentage_24h = 0;

  //     const usdRecord = await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
  //       where: { fiat_type: 'usd', coin_id },
  //     });
  //     if (usdRecord) {
  //       let compare_price: number | string = await exponentialToDecimal(usdRecord?.value);
  //       let dayPrice = await this.coinCompareDayPrice(coin_id);
  //       if (dayPrice > 0) {
  //         compare_price = dayPrice;
  //       }
  //       price_change_percentage_24h = await this.percentageCalulator(ticsUsdPrice, compare_price);

  //       await CoinPriceInFiat.CoinPriceInFiatWrite.update(
  //         { value: ticsUsdPrice, price_change_24h: price_change_percentage_24h, price_change_percentage_24h: price_change_percentage_24h },
  //         { where: { fiat_type: 'usd', coin_id } }
  //       );

  //       const timestamp: string = new Date().toISOString();
  //       await this.saveDayCoinPrice(coin_id, ticsUsdPrice, coin_family);
  //       await this.saveTicsGraphPrice(ticsUsdPrice, timestamp, coin_id);
  //     } else {
  //       await CoinPriceInFiat.CoinPriceInFiatWrite.create({
  //         coin_id,
  //         fiat_type: 'usd',
  //         coin_symbol: 'TICS',
  //         coin_name: 'Qubetics',
  //         coin_family: coin_family,
  //         cmc_id: coin_data?.cmc_id,
  //         value: ticsUsdPrice,
  //         price_change_24h: 0,
  //         price_change_percentage_24h: 0,
  //         market_cap: 0,
  //         circulating: 0,
  //         total_supply: 0,
  //         rank: 0,
  //         volume_24h: 0,
  //         max_supply: 0,
  //         latest_price: null,
  //         latest_price_source: null,
  //       });
  //     }

  //     for (const currency of currency_data.rows) {
  //       const { currency_code, price_in_usd }: any = currency;
  //       const fiat_type = currency_code.toLowerCase();
  //       const convertedValue = ticsUsdPrice * parseFloat(price_in_usd);

  //       const existingRecord = await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
  //         where: { fiat_type, coin_id },
  //       });

  //       if (existingRecord) {
  //         await CoinPriceInFiat.CoinPriceInFiatWrite.update(
  //           { value: convertedValue, price_change_24h: price_change_percentage_24h, price_change_percentage_24h: price_change_percentage_24h },
  //           { where: { fiat_type, coin_id } }
  //         );
  //       } else {
  //         await CoinPriceInFiat.CoinPriceInFiatWrite.create({
  //           coin_id,
  //           fiat_type,
  //           coin_symbol: 'TICS',
  //           coin_name: 'Qubetics',
  //           coin_family: coin_family,
  //           cmc_id: coin_data?.cmc_id,
  //           value: convertedValue,
  //           price_change_24h: 0,
  //           price_change_percentage_24h: 0,
  //           market_cap: 0,
  //           circulating: 0,
  //           total_supply: 0,
  //           rank: 0,
  //           volume_24h: 0,
  //           max_supply: 0,
  //           latest_price: null,
  //           latest_price_source: null,
  //         });
  //       }
  //     }

  //   } catch (error) {
  //     console.log("::Error log:: updateTicsPrice :>> ", error);
  //     return false;
  //   }
  // }

  // private saveDayCoinPrice = async (coin_id: number, price: number, coin_family: number) => {
  //   let dataToSave: any = {
  //     coin_id: coin_id,
  //     coin_family: coin_family,
  //     price: price,
  //   }
  //   await DayCoinPrice.DayCoinPriceWrite.create(dataToSave);
  // }

  // public deleteTicsDailyTablePrice = async () => {
  //   await DayCoinPrice.DayCoinPriceWrite.destroy({
  //     where: Sequelize.literal(`created_at < DATE_SUB(NOW(), INTERVAL 25 HOUR) AND coin_family = ${config.STATIC_COIN_FAMILY.TICS}`),
  //   });
  //   return true;
  // }

  // private saveTicsGraphPrice = async (price: number, timestamp: string, coin_id: number) => {
  //   let dataToSave: any = {
  //     coin_id: coin_id,
  //     price: price,
  //     timestamp: timestamp
  //   }
  //   await TicsPriceInFiatGraph.TicsPriceInFiatGraphWrite.create(dataToSave);
  // }

  // private coinCompareDayPrice = async (coin_id: number) => {
  //   let result = await DayCoinPrice.DayCoinPriceRead.findOne({
  //     attributes: ['price'],
  //     where: Sequelize.literal(`created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) AND coin_id = :coin_id`),
  //     order: [['id', 'desc']],
  //     replacements: { coin_id },
  //     raw: true
  //   });
  //   let price = result?.price ? result.price : 0;
  //   if (price <= 0) {
  //     result = await DayCoinPrice.DayCoinPriceRead.findOne({
  //       attributes: ['price'],
  //       where: { coin_id },
  //       order: [['id', 'desc']],
  //       raw: true
  //     });
  //     price = result?.price ?? 0;
  //   }
  //   return price;
  // }

  // private percentageCalulator = async (new_price: any, original_price: any) => {
  //   let price_change_percentage_24h = await bigNumberSafeMath(new_price, '-', original_price);
  //   price_change_percentage_24h = await bigNumberSafeMath(price_change_percentage_24h, '/', original_price);
  //   price_change_percentage_24h = await bigNumberSafeMath(price_change_percentage_24h, '*', 100);
  //   return price_change_percentage_24h.toString();
  // }



  // public fetchCmcPriceTics = async () => {
  //   try {
  //     console.log("********* fetchCmcPriceTics *************");

  //     const coinData = await Coins.CoinsRead.findOne({
  //       attributes: ["cmc_id"],
  //       where: { coin_id: 161 },
  //       raw: true,
  //     });

  //     if (!coinData?.cmc_id) {
  //       console.warn("CMC ID not found for coin_id 161");
  //       return;
  //     }

  //     const cmcId = coinData.cmc_id;

  //     // Fetch market data from CMC (only USD)
  //     const result = await axios.get(
  //       `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest`,
  //       {
  //         params: { id: cmcId, convert: "USD" },
  //         headers: { "X-CMC_PRO_API_KEY": "REDACTED" },
  //       }
  //     );

  //     const coinObj = result?.data?.data?.[cmcId];
  //     const usdQuote = coinObj?.quote?.USD;

  //     if (!coinObj || !usdQuote) {
  //       console.warn("CMC data not found for cmc_id:", cmcId);
  //       return;
  //     }

  //     // Build latest USD price
  //     const latest_price_usd: any = {
  //       price: usdQuote.price || 0,
  //       timestamp: usdQuote.last_updated,
  //       price_change_24h: usdQuote.percent_change_24h || 0,
  //       volume_24h: usdQuote.volume_24h || 0,
  //       percent_change_7d: usdQuote.percent_change_7d || 0,
  //       percent_change_30d: usdQuote.percent_change_30d || 0,
  //     };

  //     // Fetch fiat conversion rates from DB (excluding USD)
  //     const fiatRatesRaw = await CurrencyFiat.CurrencyFiatWrite.findAndCountAll({
  //       attributes: ["currency_code", "price_in_usd"],
  //       where: { currency_code: { [Op.ne]: "USD" } },
  //       raw: true,
  //       order: [["currency_id", "asc"]],
  //     });

  //     // Build fiat map with USD = 1
  //     const fiatRateMap: Record<string, number> = { USD: 1 };
  //     for (const fiat of fiatRatesRaw.rows) {
  //       const code = fiat.currency_code.toUpperCase();
  //       const rate = fiat.price_in_usd;
  //       if (rate && rate > 0) fiatRateMap[code] = rate;
  //     }

  //     // Loop through each fiat and insert/update
  //     for (const fiatCode in fiatRateMap) {
  //       const fiatRate = fiatRateMap[fiatCode];
  //       const fiatPrice = usdQuote.price * fiatRate;
  //       const marketCap = usdQuote.market_cap * fiatRate;
  //       const volume24h = usdQuote.volume_24h * fiatRate;

  //       const where = { cmc_id: coinObj.id, fiat_type: fiatCode };

  //       let existingPrice = await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
  //         attributes: ["id", "coin_id"],
  //         where,
  //         raw: true,
  //       });

  //       let coin_id: number = 0;

  //       if (!existingPrice) {
  //         const coin = await Coins.CoinsRead.findOne({
  //           attributes: ["coin_id", "coin_family", "cmc_id", "token_address"],
  //           where: { cmc_id: coinObj.id },
  //         });

  //         if (!coin) continue;

  //         coin_id = coin.coin_id;

  //         await CoinPriceInFiat.CoinPriceInFiatWrite.create({
  //           coin_id: coin.coin_id,
  //           coin_name: coinObj.name,
  //           coin_family: coin.coin_family,
  //           max_supply: coinObj.max_supply || 0,
  //           cmc_id: coinObj.id,
  //           circulating: coinObj.circulating_supply || 0,
  //           total_supply: coinObj.total_supply,
  //           rank: coinObj.cmc_rank || 0,
  //           market_cap: marketCap,
  //           fiat_type: fiatCode,
  //           coin_symbol: coinObj.symbol,
  //           value: fiatPrice,
  //           price_change_24h: usdQuote.percent_change_24h || 0,
  //           price_change_percentage_24h: usdQuote.percent_change_24h || 0,
  //           volume_24h: volume24h,
  //           token_address: coin.token_address,
  //           latest_price: latest_price_usd,
  //           latest_price_source: "converted_from_usd",
  //         });
  //       } else {
  //         coin_id = existingPrice.coin_id;

  //         await CoinPriceInFiat.CoinPriceInFiatWrite.update(
  //           {
  //             value: fiatPrice,
  //             price_change_24h: usdQuote.percent_change_24h,
  //             price_change_percentage_24h: usdQuote.percent_change_24h,
  //             volume_24h: volume24h,
  //             total_supply: coinObj.total_supply,
  //             latest_price: latest_price_usd,
  //             latest_price_source: "converted_from_usd",
  //           },
  //           { where }
  //         );
  //       }

  //       if (coin_id > 0 && fiatCode === "USD") {
  //         await this.updateHistoryLastPrice(latest_price_usd, coinObj.id, fiatCode, where);
  //       }
  //     }
  //   } catch (error) {
  //     console.error("fetchCmcPriceTics error", error);
  //   }
  // };
}

const third_party_controller = new PricesController();
export default third_party_controller;
