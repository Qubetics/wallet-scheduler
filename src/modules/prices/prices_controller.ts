import { config } from "../../config";
import {
  CoinPriceInFiat,
  CurrencyFiat,
  Coins,
  CoinPriceInFiatGraph,
  CMCDataNotExistModel,
  DayCoinPrice
} from "../../models/model/index";
import redisClient from "../../helpers/common/redis";
import { Op, Sequelize } from "sequelize";
import rp from "request-promise";
import price_alerts_controller from "../price_alerts/price_alerts.controller";
import sequelize from "sequelize";
import reset_graph_data from "../../models/model/reset_graph_data";
import { CoinModel } from "../../models/interface/interface.coins";
import dbHelper from "../../helpers/dbHelper";
import cmcHelper from "../../helpers/common/cmc.helper";
import globalHelper from "../../helpers/common/global.helper";
// import otcHelper from "../../modules/prices/helper";
import axios from "axios";
import { TimePeriods } from "../../constants";
import { bigNumberSafeMath, exponentialToDecimal } from "../../helpers/common/globalFunctions";

const {
  current_price_coin_counter: CURRENT_PRICE_COIN_COUNTER,
  current_price_currency_counter: CURRENT_PRICE_CURRENCY_COUNTER,
  graph_data_coin_counter: GRAPH_DATA_COIN_COUNTER,
  graph_data_currency_counter: GRAPH_DATA_CURRENCY_COUNTER,
  fetch_cmc_ids_counter: FETCH_CMC_IDS_COIN_COUNTER,
  delete_graph_coin_counter: DELETE_GRAPH_COIN_COUNTER,
} = config.REDISKEYS.COIN_LIMIT_COUNT_FIELD;
const COIN_FAMILY = config.STATIC_COIN_FAMILY;

class PricesController {
  public fetchCmcPrice = async () => {
    try {
      // let family_data: any = Object.keys(COIN_FAMILY).find(
      //   (key) => COIN_FAMILY[key] === coin_family
      // );
      console.log("********* fetchCmcPrice *************");
      /** coins pagination */
      let coin_limit_count: number = 0;
      let limit: number = 50;
      let findCoinCounter: any = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${CURRENT_PRICE_COIN_COUNTER}`
      );
      if (findCoinCounter) {
        coin_limit_count = Number(findCoinCounter);
      }

      console.log("coin_limit_countcoin_limit_count", coin_limit_count);

      /** currencies pagination */
      let currency_limit_count: number = 0;
      // let currency_limit: number = 3;
      let currency_limit: number = 10;

      let findCurrencyCounter: any = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${CURRENT_PRICE_CURRENCY_COUNTER}`
      );
      if (findCurrencyCounter) {
        currency_limit_count = Number(findCurrencyCounter);
      }

      let currency_data: any =
        await CurrencyFiat.CurrencyFiatWrite.findAndCountAll({
          attributes: ["currency_code"],
          raw: true,
          offset: currency_limit_count,
          limit: currency_limit,
          order: [["currency_id", "asc"]],
          // logging: true,
        });
      let coin_data_count: number = 0;
      // console.log('currency_data >>>', currency_data);
      if (currency_data.count > 0) {
        const codes = currency_data.rows.map((el: any) => el.currency_code);
        const cmcIds: number[] = [];

        let data: any = await Coins.CoinsRead.findAndCountAll({
          attributes: ["cmc_id"],
          // where: { cmc_id: { [Op.ne]: 0 }, coin_family: coin_family },
          where: { cmc_id: { [Op.ne]: 0 } },

          order: [["coin_id", "asc"]],
          limit,
          offset: coin_limit_count,
        });
        coin_data_count = data.count;
        if (data.count > 0) {
          for await (const iterator of data.rows) {
            cmcIds.push(iterator?.cmc_id as number);
          }
        }
        // console.log(
        //   // `${coin_family} >>>>cmcIds====================================================+++++`,
        //   cmcIds,
        //   currency_data.rows
        // );
        // Inserting cmc_ids in reset graph data table
        if (cmcIds.length > 0) {
          for (let i: number = 0; i < cmcIds.length; i++) {
            let id_exist: any = await reset_graph_data.ResetGraphRead.findOne({
              attributes: ["id"],
              where: { cmc_id: cmcIds[i] },
              raw: true,
            });
            if (id_exist == null) {
              let currentUTCDate: string = new Date()
                .toISOString()
                .replace(/T/, " ")
                .replace(/\..+/, "");
              await reset_graph_data.ResetGraphWrite.create({
                cmc_id: cmcIds[i],
                graph_type: "1d",
                created_at: currentUTCDate,
                updated_at: null,
              });
            }
          }
        }

        // Fetch Prices from cmc and update in db
        if (cmcIds.length > 0) {
          const tokenFormat = cmcIds.toString().replace(/[\[\]']+/g, "");
          const currencyFormat = codes.toString().replace(/[\[\]']+/g, "");
          // console.log("Entered into condition whether cmc 1 or 2");
          let result: any = await cmcHelper.cmcApi(
            `quotes/latest?id=${tokenFormat}&convert=${currencyFormat}`
          );

          // console.log('result >>>', result);
          const cmcData = result?.data?.data;
          for (const property in cmcData) {
            const obj = cmcData[property];
            for await (let code of codes) {
              // code = code.toLowerCase()
              // console.log("code>>", code, "cmc_id>>", obj.id);
              let checkCMCValueExist: any = await CMCDataNotExistModel.findOne({
                attributes: ["cmc_id"],
                where: {
                  cmc_id: obj.id,
                  fiat_type: code,
                },
                raw: true,
              });
              if (obj.quote[code] != null) {
                if (checkCMCValueExist) {
                  await CMCDataNotExistModel.destroy({
                    where: {
                      cmc_id: obj.id,
                      fiat_type: code,
                    },
                  });
                }
                // console.log("price is coming correctly");
                let latest_price: any = {
                  price: obj.quote[code].price || 0,
                  timestamp: obj.quote[code].last_updated,
                  price_change_24h: obj.quote[code].percent_change_24h || 0,
                  volume_24h: obj.quote[code].volume_24h || 0,
                  percent_change_7d: obj.quote[code].percent_change_7d || 0,
                  percent_change_30d: obj.quote[code].percent_change_30d || 0,
                };
                if (latest_price !== null && latest_price !== "null") {
                  let where: any = { cmc_id: obj.id, fiat_type: code };
                  // console.log("where>>", where);

                  let checkIfCoinExist: any =
                    await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
                      attributes: ["id", "coin_id"],
                      where: {
                        fiat_type: code,
                        cmc_id: obj.id,
                      },
                      raw: true,
                    });
                  /** check by cmc id */

                  if (!checkIfCoinExist) {
                    /** if by cmc id not exist then check by coin id */
                    let coin_data: CoinModel | null =
                      await Coins.CoinsRead.findOne({
                        attributes: ["coin_id"],
                        where: {
                          cmc_id: obj.id,
                        },
                      });
                    if (coin_data) {
                      // where.coin_id = coin_data?.coin_id;
                      // delete where.cmc_id;
                      checkIfCoinExist =
                        await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
                          attributes: ["id", "coin_id"],
                          where: {
                            fiat_type: code,
                            coin_id: coin_data?.coin_id,
                          },
                          raw: true,
                        });
                    }
                  }
                  let coin_id: number = 0;
                  if (checkIfCoinExist) {
                    coin_id = checkIfCoinExist.coin_id;
                    // console.log(
                    //   "obj?.quote[code]?.price",
                    //   obj?.quote[code]?.price
                    // );

                    await CoinPriceInFiat.CoinPriceInFiatWrite.update(
                      {
                        value: obj?.quote[code]?.price || 0,
                        price_change_24h: obj.quote[code].percent_change_24h,
                        price_change_percentage_24h:
                          obj.quote[code].percent_change_24h,
                        volume_24h: obj.quote[code].volume_24h,
                        total_supply: obj.total_supply,
                        latest_price: latest_price,
                        latest_price_source: "current",
                      },
                      {
                        where: where,
                      }
                    );
                  } else {
                    let coin: any = await Coins.CoinsRead.findOne({
                      attributes: [
                        "coin_id",
                        "coin_family",
                        "cmc_id",
                        "token_address",
                      ],
                      where: {
                        cmc_id: obj.id,
                      },
                    });
                    if (coin) {
                      coin_id = coin.coin_id;
                      // console.log(
                      //   "aaaobj?.quote[code].price",
                      //   obj?.quote[code].price
                      // );

                      await CoinPriceInFiat.CoinPriceInFiatWrite.create({
                        coin_id: coin.coin_id,
                        coin_name: obj.name,
                        coin_family: coin.coin_family,
                        max_supply: obj.max_supply || 0,
                        cmc_id: coin.cmc_id,
                        circulating: obj.circulating_supply || 0,
                        total_supply: obj.total_supply,
                        rank: obj.cmc_rank || 0,
                        market_cap: obj?.quote[code]?.market_cap || 0,
                        fiat_type: code.toLowerCase(),
                        coin_symbol: obj.symbol,
                        value: obj?.quote[code].price || 0,
                        price_change_24h:
                          obj.quote[code].percent_change_24h || 0,
                        price_change_percentage_24h:
                          obj.quote[code].percent_change_24h || 0,
                        volume_24h: obj.quote[code].volume_24h || 0,
                        token_address: coin.token_address,
                        latest_price: latest_price,
                        latest_price_source: "current",
                      });
                    }
                  }
                  // if (coin_id > 0) {
                  //     await price_alerts_controller.sendPriceAlerts(coin_id, code, latest_price.price);
                  // }
                  /** update latest record in history candle */
                  // console.log('code >>>', code, 'coin_id >>>', coin_id);
                  if (coin_id > 0 && code?.toLowerCase() == "usd") {
                    // console.log('code >>>', code, 'coin_id >>>', coin_id);
                    await this.update_history_last_price(
                      latest_price,
                      obj.id,
                      code,
                      where
                    );
                  }
                } else {
                  // console.log('latest_price >>>.', latest_price);
                }
              } else {
                // console.log("no price for this >>", code, obj.id);
                if (checkCMCValueExist) {
                  console.log(" CMC id Exist");
                } else {
                  const data = await Coins.CoinsRead.findOne({
                    attributes: ["cmc_id", "token_address"],
                    where: { cmc_id: obj.id },
                    raw: true,
                  });
                  await CMCDataNotExistModel.create({
                    cmc_id: obj.id,
                    token_address: data?.token_address
                      ? data?.token_address
                      : null,
                    fiat_type: code,
                  });
                }
              }
            }
          }
        }
      }
      currency_limit_count = currency_limit_count + currency_limit;
      let currency_counter =
        currency_limit_count >= currency_data.count ? 0 : currency_limit_count;
      // console.log(
      //   "currency_counter >>>",
      //   currency_counter,
      //   " >>>>>>",
      //   family_data
      // );

      if (currency_counter == 0) {
        /** update coins pagination */
        coin_limit_count = coin_limit_count + limit;
        let counter =
          coin_limit_count >= coin_data_count ? 0 : coin_limit_count;
        // console.log("coin counter >>>", counter, " >>>>>>", family_data);
        await redisClient.setKeyValuePair(
          config.REDISKEYS.COIN_LIMIT_COUNTS,
          `${CURRENT_PRICE_COIN_COUNTER}`,
          counter.toString()
        );
      }
      /** update currencies pagination */
      await redisClient.setKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${CURRENT_PRICE_CURRENCY_COUNTER}`,
        currency_counter.toString()
      );
    } catch (error) {
      console.error("fffffetch_coin_price errorjsj", error);
    }
  };

  private update_history_last_price = async (
    latest_price: any,
    id: number,
    code: string,
    where: any
  ) => {
    // console.log(
    //   "---------------------update history last price--------------",
    //   id,
    //   "------",
    //   code,
    //   "where >>>>>",
    //   where
    // );
    // if (where.fiat_type != "USD") return;
    // console.log(
    //   "--------------------- update history last price--------------",
    //   id,
    //   "------",
    //   code,
    //   "where >>>>>",
    //   where
    // );
    const historyExistData =
      await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findAndCountAll({
        attributes: [`id`, `sparkline`, `type`],
        where: where,
      });
    if (historyExistData.count > 0) {
      for (let history of historyExistData.rows) {
        let history_sparkline: any =
          history.sparkline !== null ? history.sparkline : [];
        // console.log('history_sparkline >>>>', history_sparkline?.length);
        if (history_sparkline.length > 0) {
          const cleanedData = history_sparkline.filter(
            (item: any) => item !== null
          );
          // console.log('cleanedData >>>>', cleanedData?.length);
          let last_record = cleanedData[cleanedData?.length - 1];
          // console.log('last_record >>>', last_record);
          // console.log('latest_price >>>', latest_price);

          const existingTimestamp = new Date(last_record?.timestamp).getTime();
          const latestTimestamp = new Date(latest_price?.timestamp).getTime();
          // console.log(
          //   "sparkline333 >>>>",
          //   latestTimestamp >
          //   existingTimestamp
          // );
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
              // if (history?.coin_type == null) {
              //   updateData.coin_type = coin_type;
              // }
              // console.log('history_data.graphData >>>', history_data?.graphData?.length);
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
            // if (history?.coin_type == null) {
            //   updateData.coin_type = coin_type;
            // }
            await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.update(
              updateData,
              { where: { id: history.id } }
            );
          }
        }
      }
    } else {
      let types = ["1d", "1w", "1m", "1y"];
      for (let i = 0; i < types.length; i++) {
        let create_data: any = {
          // coin_id: coin_id,
          // coin_type: coin_type ? coin_type : null,
          cmc_id: id,
          type: types[i],
          fiat_type: code,
          // volume_24h: latest_price.volume_24h,
          // price_change_24h: latest_price.price_change_24h,
          // price_change_percentage_24h: latest_price.price_change_24h,
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
    let ids: any[] = [];

    try {
      // let currencyCount = await modelCounter.CounterRead.count();
      // let family_data = Object.keys(COIN_FAMILY).find(
      //   (key) => COIN_FAMILY[key] === coin_family
      // );

      console.log("********* fetchgraphdata *************");
      /** coins pagination */
      let coin_limit_count = 0;
      let limit = coin_limit;
      let findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${type}_${GRAPH_DATA_COIN_COUNTER}`
      );

      // let findCoinCounter = await redisClient.getKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, `${type}_${GRAPH_DATA_COIN_COUNTER}`);
      if (findCoinCounter) {
        coin_limit_count = Number(findCoinCounter);
      }
      let now = new Date();
      let subtractTime = new Date(now);
      // Calculate different time ranges
      if (type == "1d") {
        subtractTime.setHours(subtractTime.getHours() - 4);
      } else if (type == "1w") {
        subtractTime.setHours(subtractTime.getHours() - 6);
      } else if (type == "1m") {
        subtractTime.setDate(subtractTime.getDate() - 1);
      } else {
        subtractTime.setDate(subtractTime.getDate() - 3);
      }
      console.log("subtractTime :>> ", subtractTime, "timeperiod :>>", type);
      let dbCoinrecords: any;

      // console.log("endDate>>>>>>>>>>>", endDate);
      dbCoinrecords =
        await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findAndCountAll({
          where: {
            updated_at: { [Op.lt]: subtractTime },
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
      if (dbCoinrecords.count == 0) {
        dbCoinrecords = await Coins.CoinsRead.findAndCountAll({
          attributes: ["cmc_id"],
          where: {
            cmc_id: { [Op.ne]: 0, [Op.lt]: 50000 },
            // graph_source: { [Op.is]: null },     // not in use
            // coin_family: coin_family
            [Op.and]: [sequelize.literal(`(graph_data.updated_at IS NULL)`)],
          },
          include: [
            {
              model: CoinPriceInFiatGraph.CoinPriceInFiatGraphRead,
              attributes: ["type", "updated_at"], // Specify the columns to return from the graph_data table
              as: "graph_data",
              where: {
                type: type,
                fiat_type: "USD",
              },
              required: false, // Set to false for LEFT JOIN
            },
          ],
          // raw: true,
          group: ["cmc_id"],
          order: [["cmc_id", "asc"]], // cmc_id replace with coin_id in order by
          limit: limit,
          offset: coin_limit_count,
          logging: true,
        });

        // console.log(
        //   "dbCoinrecords.count inside:>> ",
        //   dbCoinrecords.count,
        //   "type :",
        //   type
        // );
        groupedCount = dbCoinrecords.count; // This is an array of grouped results
        totalRecords = groupedCount.length; // Total number of unique groups (cmc_id)
      }

      /********************************BACKUP CODE ********************************/
      // let dbCoinrecords: any = await Coins.CoinsRead.findAndCountAll({
      //   attributes: ["cmc_id"],
      //   where: {
      //     cmc_id: { [Op.ne]: 0 },
      // graph_source: { [Op.is]: null },     // not in use
      // coin_family: coin_family
      // },
      // include: [
      //   {
      //     model: reset_graph_data.ResetGraphRead,
      //     attributes: ["graph_type", "updated_at"],
      //     as: "reset_graph_data",
      //     where: sequelize.literal(
      //       `(reset_graph_data.updated_at IS NULL OR DATE(reset_graph_data.updated_at) != CURRENT_DATE OR reset_graph_data.graph_type!="${type}")`
      //     ),
      //     required: true,
      //   },
      // ],
      // raw: true,
      //   group: ["cmc_id"],
      //   order: [["cmc_id", "asc"]], // cmc_id replace with coin_id in order by
      //   limit: limit,
      //   offset: coin_limit_count,
      //   logging: true,
      // });
      /********************************BACKUP CODE ********************************/

      // console.log("totalRecords :>> ", totalRecords);
      if (!totalRecords) {
        let counter = 0;
        await redisClient.setKeyValuePair(
          config.REDISKEYS.COIN_LIMIT_COUNTS,
          `${type}_${GRAPH_DATA_COIN_COUNTER}`,
          counter.toString()
        );
        return;
      }
      // Access grouped rows (the data)
      const groupedRows = dbCoinrecords.rows;

      // Example: Iterate over groups
      if (totalRecords > 0) {
        await groupedRows.forEach((group: any) => {
          if (group.cmc_id < 50000) {
            // console.log(`cmc_id: ${group.cmc_id}}`);
            ids.push(group.cmc_id);
          }
        });
      }

      console.log("ids,  :>> ", ids, "type :", type);

      /** currencies pagination */
      // let currency_limit_count = 0;
      // let findCurrencyCounter = await redisClient.getKeyValuePair(
      //   config.REDISKEYS.COIN_LIMIT_COUNTS,
      //   `${type}_${GRAPH_DATA_CURRENCY_COUNTER}`
      // );
      //let findCurrencyCounter = await redisClient.getKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, `${type}_${GRAPH_DATA_CURRENCY_COUNTER}`);

      // if (findCurrencyCounter) {
      //   currency_limit_count = Number(findCurrencyCounter);
      // }

      if (totalRecords > 0 && ids.length > 0) {
        const code = "USD";
        const requestOptionsForListing = await cmcHelper.cmcHistoricalData(
          ids,
          interval,
          startDate,
          endDate
        );
        let data = await rp(requestOptionsForListing);
        if (data) {
          let created_at;
          let currentUTCDate: string = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          for await (let id of ids as any) {
            let fiat_type = code;
            let sparkline: any = [];

            if (data?.data[id]?.quotes && data?.data[id]?.quotes.length > 0) {
              sparkline = await data?.data[id]?.quotes.map(
                (data: any, index: number) => {
                  if (
                    data?.quote[code?.toUpperCase()] !== undefined &&
                    data?.quote[code?.toUpperCase()] !== null
                  ) {
                    created_at = new Date(
                      data?.quote[code?.toUpperCase()]?.timestamp
                    )
                      ?.toISOString()
                      ?.replace(/T/, " ")
                      ?.replace(/\..+/, "");
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
                  //console.log('data data22222 >>>>>>', data);
                  created_at = new Date(
                    data.quote[code?.toUpperCase()]?.timestamp
                  )
                    .toISOString()
                    .replace(/T/, " ")
                    .replace(/\..+/, "");
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
            // console.log("sparkline=====================", code, sparkline);
            if (sparkline.length > 0) {
              let where: any = {
                cmc_id: id,
                fiat_type: code,
                type: type,
              };
              let recordExist: any =
                await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findOne({
                  attributes: ["id", "sparkline"],
                  where: where,
                  // logging: true
                });

              // if (!recordExist) {
              //   /** if by cmc id not exist then check by coin id */
              //   // let coin_data: CoinModel | null = await Coins.CoinsRead.findOne(
              //   //   {
              //   //     attributes: ["coin_id"],
              //   //     where: {
              //   //       cmc_id: id,
              //   //     },
              //   //   }
              //   // );
              //   // if (coin_data) {
              //   // where.coin_id = coin_data?.coin_id;
              //   // delete where.cmc_id;
              //   recordExist =
              //     await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findOne({
              //       attributes: [`id`, "sparkline", "coin_type"],
              //       where: where,
              //       // logging: true
              //     });
              //   // }
              // }
              // console.log("recordExist >>>>", "where", where);
              // console.log("recordExist >>>>", recordExist);

              if (recordExist) {
                // sparkline = await this.compare_update_prices(
                //   sparkline,
                //   recordExist,
                //   id,
                //   code,
                //   type
                // );

                let getGraphData: any = await globalHelper.setGraphData(
                  sparkline
                ); // slicing sparkline data

                if (getGraphData.status) {
                  // let currentUTCDate: string = new Date()
                  //   .toISOString()
                  //   .replace(/T/, " ")
                  //   .replace(/\..+/, "");
                  const updateData = {
                    sparkline: getGraphData.graphData,
                    cmc_id: id,
                    latest_price_source: type,
                    updated_at: currentUTCDate,
                  };
                  // if (recordExist?.coin_type == null) {
                  //   updateData.coin_type = recordExist?.coin_type;
                  // }

                  await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.update(
                    updateData,
                    {
                      where: where,
                    }
                  );
                  // console.log("sparkline_Updated:::", updated);
                }
              } else {
                // let coin_data: any = await Coins.CoinsRead.findOne({
                //   attributes: ["coin_id", "coin_symbol"],
                //   where: {
                //     cmc_id: id,
                //   },
                //   raw: true,
                // });
                // if (coin_data) {
                await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.create({
                  // coin_id: coin_data.coin_id,
                  // coin_type: coin_data.coin_symbol,
                  sparkline: sparkline,
                  cmc_id: id,
                  latest_price_source: type,
                  fiat_type: fiat_type?.toUpperCase(),
                  type: type,
                  created_at,
                  updated_at: currentUTCDate,
                });
                // }
              }
            } else {
              let whereCond: any = {
                cmc_id: id,
                fiat_type: code,
                type: type,
              };
              // console.log("sparkline length zero :>> ", where);

              // console.log("sparkline length zero :>> ", whereCond);

              // if (recordExist?.coin_type == null) {
              //   updateData.coin_type = recordExist?.coin_type;
              // }

              // let updateQuery =
              await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.update(
                {
                  updated_at: currentUTCDate,
                },
                {
                  where: whereCond,
                  // logging: true, // Enable logging
                }
              );

              // console.log("updateQuery :>> ", updateQuery);
            }

            // let reset_data_exist: any =
            //   await reset_graph_data.ResetGraphWrite.findOne({
            //     where: { cmc_id: id, graph_type: type },
            //   });
            // let currentUTCDate: string = new Date()
            //   .toISOString()
            //   .replace(/T/, " ")
            //   .replace(/\..+/, "");
            // if (!reset_data_exist) {
            //   await reset_graph_data.ResetGraphWrite.create({
            //     cmc_id: id,
            //     graph_type: type,
            //     created_at: currentUTCDate,
            //     updated_at: currentUTCDate,
            //   });
            // } else {
            //   await reset_graph_data.ResetGraphWrite.update(
            //     {
            //       graph_type: type,
            //       updated_at: currentUTCDate,
            //     },
            //     {
            //       where: { cmc_id: id },
            //     }
            //   );
            // }
          }
        }
      }

      /** update coins pagination */
      coin_limit_count = coin_limit_count + limit;

      let counter = coin_limit_count >= totalRecords ? 0 : coin_limit_count;
      // console.log("graph coin counter >>>", counter, " >>>>>>", family_data);

      await redisClient.setKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${type}_${GRAPH_DATA_COIN_COUNTER}`,
        counter.toString()
      );

      return;
    } catch (error: any) {
      console.error(
        `err`,
        "historical data type",
        ids,
        type,
        "error =>",
        error?.message
      );
      if (error?.response?.data?.status?.error_message) {
        let message = error.response.data.status.error_message;
        let position = message.includes('No data found for "id"');
        let position1 = message.includes("No items found");

        if (position || position1) {
          let updateGraphNotFound =
            await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.destroy({
              where: {
                cmc_id: {
                  [Op.in]: ids,
                },
              },
            });

          console.log("updateGraphNotFound :>> ", updateGraphNotFound);

          let updateCoinNotFound = await Coins.CoinsWrite.update(
            { cmc_id: 0 },
            {
              where: {
                cmc_id: {
                  [Op.in]: ids,
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

  private compare_update_prices = async (
    sparkline: any,
    recordExist: any,
    id: number,
    code: string,
    type: string
  ) => {
    if (!sparkline?.length) return sparkline;

    const sparklineLatestRecord = sparkline[sparkline.length - 1]
      ? sparkline[sparkline.length - 1]
      : null;

    const existingSparkline = recordExist.sparkline || [];
    const cleanedData = existingSparkline.filter((item: any) => item !== null);
    const existingLastRecord =
      cleanedData.length > 0 ? cleanedData[cleanedData.length - 1] : null;
    if (existingLastRecord && sparklineLatestRecord) {
      const existingTimestamp = new Date(
        existingLastRecord.timestamp
      ).getTime();
      const latestTimestamp = new Date(
        sparklineLatestRecord.timestamp
      ).getTime();

      if (existingTimestamp > latestTimestamp) {
        sparkline.push(existingLastRecord);
        return sparkline; // Early return if we push existing record
      }

      const coinData = await Coins.CoinsRead.findOne({
        attributes: ["coin_id"],
        where: { cmc_id: id },
      });

      // console.log(
      //   "Updating with latest sparkline record:",
      //   sparklineLatestRecord
      // );

      await CoinPriceInFiat.CoinPriceInFiatWrite.update(
        {
          coin_id: coinData?.coin_id,
          value: sparklineLatestRecord?.price || 0,
          price_change_24h: sparklineLatestRecord?.percent_change_24h || 0,
          price_change_percentage_24h:
            sparklineLatestRecord?.percent_change_24h || 0,
          volume_24h: sparklineLatestRecord?.volume_24h || 0,
          latest_price: sparklineLatestRecord,
          latest_price_source: type,
        },
        {
          where: {
            cmc_id: id,
            fiat_type: code,
          },
        }
      );
    }

    return sparkline;
    // if (sparkline?.length > 0) {
    //   let sparkline_latest_record = sparkline[sparkline?.length - 1];

    //   let existing_last_record: any =
    //     recordExist.sparkline !== null && recordExist.sparkline.length > 0
    //       ? recordExist?.sparkline[recordExist.sparkline.length - 1]
    //       : "";
    //   // console.log("existing_last_record>>>>>>>>>>>>>>>>>>>>>>>>", existing_last_record)

    //   if (existing_last_record !== "" && existing_last_record != null && existing_last_record != 'null') {
    //     if (
    //       new Date(existing_last_record?.timestamp).getTime() >
    //       new Date(sparkline_latest_record?.timestamp).getTime()
    //     ) {
    //       console.log('sparkline_latest_record22 >>>>>>>>', sparkline_latest_record);
    //       sparkline.push(existing_last_record);
    //     } else {
    //       let coin_data: CoinModel | null = await Coins.CoinsRead.findOne({
    //         attributes: ["coin_id"],
    //         where: {
    //           cmc_id: id,
    //         },
    //       });
    //       /** update new sparkline latest price */
    //       console.log('sparkline_latest_record 11>>>>>>>>', sparkline_latest_record);
    //       // console.log(
    //       //   "ddddddsparkline_latest_record?.price",
    //       //   sparkline_latest_record?.price
    //       // );
    //       await CoinPriceInFiat.CoinPriceInFiatWrite.update(
    //         {
    //           coin_id: coin_data?.coin_id,
    //           value: sparkline_latest_record?.price || 0,
    //           price_change_24h: sparkline_latest_record?.percent_change_24h || 0,
    //           price_change_percentage_24h:
    //             sparkline_latest_record?.percent_change_24h || 0,
    //           volume_24h: sparkline_latest_record?.volume_24h || 0,
    //           latest_price: sparkline_latest_record,
    //           latest_price_source: type,
    //         },
    //         {
    //           where: {
    //             cmc_id: id,
    //             fiat_type: code,
    //           },
    //         }
    //       );

    //     }
    //   }
    // }
    // return sparkline;
  };

  public fetchCmcIds = async () => {
    try {
      let coin_limit_count: number = 0;
      let limit: number = 10;
      let findCoinCounter: any = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        FETCH_CMC_IDS_COIN_COUNTER
      );
      if (findCoinCounter) {
        coin_limit_count = Number(findCoinCounter);
      }
      console.log("coin_limit_count>>>>", coin_limit_count);
      let data: any = await Coins.CoinsWrite.findAndCountAll({
        attributes: [
          "coin_id",
          // "mainnet_token_address",
          "token_address",
          "coin_symbol",
        ],
        where: {
          coin_status: 1,
          is_on_cmc: 1,
          cmc_id: {
            [Op.eq]: 0,
          },
        },
        raw: true,
        limit,
        offset: coin_limit_count,
        logging: true,
      });
      console.log("data >>.", data);
      if (data?.count > 0) {
        console.log("data.rows >>.", data.rows);
        for await (const iterator of data.rows) {
          let query_data: string = iterator?.token_address
            ? `?address=${iterator.token_address}`
            : `?symbol=${iterator.coin_symbol}`;
          try {
            let result: any = await cmcHelper.cmcApi(`info${query_data}`);
            if (result && result.data) {
              let cmcId: any;
              if (query_data == `?symbol=${iterator.coin_symbol}`) {
                let cmc_result: any = await dbHelper.find_one_settings(
                  ["id", "title", "value", "created_at", "updated_at"],
                  { title: "CMC" }
                );
                if (Number(cmc_result.value) == 1) {
                  cmcId =
                    result.data.data[
                      iterator.coin_symbol as keyof typeof String
                    ][0].id;
                } else {
                  cmcId =
                    result.data.data[
                      iterator.coin_symbol as keyof typeof String
                    ][0].id;
                }
                console.log("cmcmcmcmcm id >>", cmcId);
              } else {
                cmcId = Object.keys(result.data.data)[0];
              }

              await Coins.CoinsWrite.update(
                {
                  cmc_id: +cmcId,
                  is_on_cmc: 1,
                },
                {
                  where: {
                    coin_id: iterator.coin_id,
                  },
                }
              );
            }
          } catch (err: any) {
            await Coins.CoinsWrite.update(
              {
                is_on_cmc: 0,
              },
              {
                where: {
                  coin_id: iterator.coin_id,
                },
              }
            );
          }
        }
      }

      /** update coins pagination */
      coin_limit_count = coin_limit_count + limit;

      let counter: any = coin_limit_count >= data?.count ? 0 : coin_limit_count;

      await redisClient.setKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        FETCH_CMC_IDS_COIN_COUNTER,
        counter.toString()
      );
    } catch (err: any) {
      console.error("err in fetchCmcIds", err);
    }
  };

  public delete_graph_old_data = async (
    coin_family: string,
    compare_date: string,
    graph_type: string
  ) => {
    try {
      let family_data = Object.keys(COIN_FAMILY).find(
        (key) => COIN_FAMILY[key] === coin_family
      );

      console.log("********* DeleteGraph data *************", family_data);
      /** coins pagination */
      let coin_limit_count = 0;
      let limit = 1;
      let findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${family_data}_${graph_type}_${DELETE_GRAPH_COIN_COUNTER}`
      );
      if (findCoinCounter) {
        coin_limit_count = Number(findCoinCounter);
      }

      const currency_data =
        await CurrencyFiat.CurrencyFiatWrite.findAndCountAll({
          attributes: ["currency_code"],
          raw: true,
        });
      let currencies: string[] = [];
      if (currency_data.count > 0) {
        currencies = currency_data.rows.map((el) => el.currency_code);
      }

      const coin_data: any = await Coins.CoinsRead.findAndCountAll({
        attributes: ["cmc_id"],
        where: { cmc_id: { [Op.ne]: 0 }, coin_family: coin_family },
        raw: true,
        limit,
        offset: coin_limit_count,
      });
      let cmcIds: number[] = [];
      if (coin_data.count > 0) {
        for await (const iterator of coin_data.rows) {
          cmcIds.push(iterator?.cmc_id as number);
        }
      }

      if (coin_data.count > 0) {
        let historyExistData =
          await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findAndCountAll({
            attributes: [`id`, `sparkline`, `type`],
            where: {
              cmc_id: { [Op.in]: cmcIds },
              fiat_type: { [Op.in]: currencies },
              type: graph_type,
            },
            // logging: true,
            limit: 1,
          });
        if (historyExistData.count > 0) {
          for (let history of historyExistData.rows) {
            let history_sparkline: any =
              history.sparkline !== null ? history.sparkline : [];
            let latest_sparkline: any = [];
            let last_time_stamp: any = "";
            let minutes: number = 0;
            if (history_sparkline.length > 0) {
              // console.log("sparkline >>>>>", history_sparkline.length);
              for (let sparkline of history_sparkline) {
                // console.log("compare_date >>>>>", compare_date);
                // console.log("compare_date >>>>>", sparkline?.timestamp);
                if (last_time_stamp !== "") {
                  let diff: any = Math.abs(
                    new Date(last_time_stamp).getTime() -
                    new Date(sparkline?.timestamp).getTime()
                  );
                  minutes = Math.floor(diff / 1000 / 60);
                  if (minutes >= 5) {
                    last_time_stamp = sparkline?.timestamp;
                  }
                } else {
                  last_time_stamp = sparkline?.timestamp;
                }

                if (
                  new Date(sparkline?.timestamp).getTime() >=
                  new Date(compare_date).getTime() &&
                  minutes >= 5
                ) {
                  latest_sparkline.push(sparkline);
                  // console.log('minutes >>>>>', minutes);
                }
              }
              // console.log('latest_sparkline >>>>>', latest_sparkline.length);
            }
            /*if (latest_sparkline.length > 0) {
                            await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.update({ sparkline: latest_sparkline }, { where: { id: history.id } });
                        }*/
          }
        }
      }

      /** update coins pagination */
      coin_limit_count = coin_limit_count + limit;
      // console.log('coin_limit_count >>>', coin_limit_count, ' >>>>>>', family_data);
      // console.log('total_count >>>', coin_data, ' >>>>>>', family_data);

      let counter =
        coin_limit_count >= coin_data.count ? 0 : coin_limit_count + limit;
      // console.log('counter >>>', counter, ' >>>>>>', family_data);

      await redisClient.setKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${family_data}_${graph_type}_${DELETE_GRAPH_COIN_COUNTER}`,
        counter.toString()
      );
    } catch (error) {
      console.error("fetchhhhhh_coin_price errorjsj", error);
    }
  };

  // Utility function to format exchange names
  public formatExchangeName = (exchangeName: string): string => {
    return exchangeName
      .split(" ") // Split the string by spaces
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join("") // Join without spaces
      .replace(/v(\d+)/gi, "V$1"); // Handle 'v3' to 'V3'
  };

  public async moralisTradingviewChartWidget(
    chain: string,
    coinFamily: number,
    tokenType: string
  ) {
    try {
      const tradingviewTokens = await Coins.CoinsRead.findAll({
        attributes: [
          "coin_id",
          "coin_symbol",
          "coin_family",
          "is_token",
          "token_address",
          "graph_source",
          "graph_pair",
          "pair_address",
        ],
        where: {
          // is_token: { [Op.ne]: null },     //      old check
          is_token: 1,
          coin_family: coinFamily,
          token_type: tokenType,
          pair_address: { [Op.eq]: null },
        },
      });

      const BATCH_SIZE = 20;
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      for (let i = 0; i < tradingviewTokens.length; i += BATCH_SIZE) {
        const batch = tradingviewTokens.slice(i, i + BATCH_SIZE);

        // Process each batch
        const batchPromises = batch.map(async (token) => {
          const { coin_id, token_address, coin_symbol } = token;

          if (!token_address) {
            console.warn(
              `Skipping token with ID: ${coin_id}, as it has no token_address`
            );
            return;
          }

          const url = `https://deep-index.moralis.io/api/v2.2/erc20/${token_address}/pairs?chain=${chain}`;

          try {
            // Delay 1 second before each request
            await delay(1000);

            // Fetch data from Moralis API
            const response = await axios.get(url, {
              headers: { "x-api-key": config.MORALIS_KEY },
            });

            const pairs = response?.data?.pairs;
            if (pairs?.length > 0) {
              // const firstPair = pairs[0];
              const activePair = await pairs.find(
                (pair: any) =>
                  pair?.inactive_pair === false || pair?.inactivePair === false
              );
              if (activePair) {
                const pairAddress = activePair?.pair_address || null;
                const rawExchangeName = activePair?.exchange_name || null;
                const graphSource = rawExchangeName
                  ? this.formatExchangeName(rawExchangeName)
                  : null;

                if (pairAddress) {
                  // Update the database with graph source and pair
                  await Coins.CoinsWrite.update(
                    {
                      graph_source: graphSource,
                      graph_pair: activePair.pair_label,
                      pair_address: pairAddress,
                    },
                    { where: { coin_id } }
                  );
                }
              }
            } else {
              console.warn(
                `No pairs found for coin ID: ${coin_id}, Symbol: ${coin_symbol} Token address: ${token_address}`
              );
            }
          } catch (err: any) {
            console.error(
              `Error processing coin ID: ${coin_id}, Symbol: ${coin_symbol} Token address: ${token_address}`,
              err?.message || err
            );
          }
        });

        // Wait for the current batch to complete before moving to the next
        await Promise.allSettled(batchPromises);
      }
    } catch (error) {
      console.log(
        "::Error log:: 🔥 ~ moralisTradingviewChartWidget error",
        error
      );
      return false;
    }
  }

  public async moralisTradingviewChartWidgetSOL() {
    try {
      const tradingviewTokens = await Coins.CoinsRead.findAll({
        attributes: [
          "coin_id",
          "coin_symbol",
          "coin_family",
          "is_token",
          "token_address",
          "graph_source",
          "graph_pair",
          "pair_address",
        ],
        where: {
          is_token: 1,
          coin_family: COIN_FAMILY.SOL,
          // token_type: "CRC20",
          pair_address: { [Op.eq]: null },
        },
      });

      const BATCH_SIZE = 20;
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      for (let i = 0; i < tradingviewTokens.length; i += BATCH_SIZE) {
        const batch = tradingviewTokens.slice(i, i + BATCH_SIZE);

        // Process each batch
        const batchPromises = batch.map(async (token) => {
          const { coin_id, token_address, coin_symbol } = token;

          if (!token_address) {
            console.warn(
              `Skipping token with ID: ${coin_id}, as it has no token_address`
            );
            return;
          }

          const url = `https://solana-gateway.moralis.io/token/mainnet/${token_address}/pairs`;

          try {
            // Delay 1 second before each request
            await delay(1000);

            // Fetch data from Moralis API
            const response = await axios.get(url, {
              headers: { "x-api-key": config.MORALIS_KEY },
            });

            const pairs = response?.data?.pairs;
            if (pairs?.length > 0) {
              // const activePair = pairs[0];
              const activePair = await pairs.find(
                (pair: any) =>
                  pair?.inactive_pair === false || pair?.inactivePair === false
              );
              if (activePair) {
                const pairAddress = activePair?.pairAddress || null;
                const rawExchangeName = activePair?.exchangeName || null;
                const graphSource = rawExchangeName
                  ? this.formatExchangeName(rawExchangeName)
                  : null;

                if (pairAddress) {
                  // Update the database with graph source and pair
                  await Coins.CoinsWrite.update(
                    {
                      graph_source: graphSource,
                      graph_pair: activePair.pairLabel,
                      pair_address: pairAddress,
                    },
                    { where: { coin_id } }
                  );
                }
              }
            } else {
              console.warn(
                `No pairs found for coin ID: ${coin_id}, Symbol: ${coin_symbol} Token address: ${token_address}`
              );
            }
          } catch (err: any) {
            console.error(
              `Error processing coin ID: ${coin_id}, Symbol: ${coin_symbol} Token address: ${token_address}`,
              err?.message || err
            );
          }
        });

        // Wait for the current batch to complete before moving to the next
        await Promise.allSettled(batchPromises);
      }
    } catch (error) {
      console.log(
        "::Error log:: 🔥 ~ moralisTradingviewChartWidgetSOL error",
        error
      );
      return false;
    }
  }

  public async updateFiatPrice() {
    try {
      let findFiat = await CurrencyFiat.CurrencyFiatWrite.findAll();

      let cryptoSymbols = [];
      if (findFiat.length) {
        for await (let coin of findFiat) {
          let cmdId = coin.currency_code;
          cryptoSymbols.push(cmdId);
        }
      }

      let requestOptionsForListing = await cmcHelper.cmcFiatCurrencyData(
        cryptoSymbols
      );
      // let result = await axios
      //   .request(requestOptionsForListing)
      //   .then((response) => {
      //     // console.log(JSON.stringify(response.data));
      //     return response.data;
      //   })
      //   .catch((error) => {
      //     console.log("::Error log:: updateFiatPrice catch", error);
      //     return false;
      //   });
      var result = await rp(requestOptionsForListing);

      if (result && result.data) {
        const response = result.data["2781"];
        for (let data of cryptoSymbols) {
          await CurrencyFiat.CurrencyFiatWrite.update(
            { price_in_usd: response.quote[`${data}`]?.price },
            {
              where: { currency_code: data },
            }
          );
        }
      } else {
        console.log("No Fiat Currency Found..");
      }
    } catch (error) {
      console.log("::Error log:: updateFiatPrice :>> ", error);
      return false;
    }
  }

  public async updateTicsPrice() {
    try {
      const currency_data = await CurrencyFiat.CurrencyFiatWrite.findAndCountAll({
        attributes: ["currency_code", "price_in_usd"],
        where: {
          currency_code: { [Op.ne]: "USD" },
        },
        raw: true,
        order: [["currency_id", "asc"]],
      });
      
      if (currency_data.count === 0) return;
  
      const result = await axios.get('https://api-testnet.qubetics.work/qubetics/explorer/current-token-price');
      const ticsUsdPrice = result?.data?.data || 0;
      const coin_family = COIN_FAMILY?.TICS ? COIN_FAMILY?.TICS : 7
  
      const coin_data = await Coins.CoinsRead.findOne({
        attributes: ["coin_id", "cmc_id"],
        where: {
          coin_name: { [Op.like]: 'Qubetics' },
          coin_symbol: { [Op.like]: 'tics' },
          coin_family: coin_family,
        },
      });
  
      if (!coin_data || coin_data === null) {
        console.log("TICS coin not found");
        return;
      }
  
      const coin_id = coin_data.coin_id;
      let price_change_percentage_24h = 0;
  
      const usdRecord = await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
        where: { fiat_type: 'usd', coin_id },
      });
      if (usdRecord) {
        let compare_price: number | string = await exponentialToDecimal(usdRecord?.value);
        let dayPrice = await this.coinCompareDayPrice(coin_id);
        if (dayPrice > 0) {
            compare_price = dayPrice;
        }
        price_change_percentage_24h = await this.percentageCalulator(ticsUsdPrice, compare_price);

        await CoinPriceInFiat.CoinPriceInFiatWrite.update(
          { value: ticsUsdPrice, price_change_24h: price_change_percentage_24h ,price_change_percentage_24h: price_change_percentage_24h },
          { where: { fiat_type: 'usd', coin_id } }
        );

        await this.saveDayCoinPrice(coin_id, ticsUsdPrice, coin_family);

      } else {
        await CoinPriceInFiat.CoinPriceInFiatWrite.create({
          coin_id,
          fiat_type: 'usd',
          coin_symbol: 'TICS',
          coin_name: 'Qubetics',
          coin_family: coin_family,
          cmc_id: coin_data?.cmc_id,
          value: ticsUsdPrice,
          price_change_24h: 0,
          price_change_percentage_24h: 0,
          market_cap: 0,
          circulating: 0,
          total_supply: 0,
          rank: 0,
          volume_24h: 0,
          max_supply: 0,
          latest_price: null,
          latest_price_source: null,
        });
      }

      for (const currency of currency_data.rows) {
        const { currency_code, price_in_usd }: any = currency;
        const fiat_type = currency_code.toLowerCase();
        const convertedValue = ticsUsdPrice * parseFloat(price_in_usd);
  
        const existingRecord = await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
          where: { fiat_type, coin_id },
        });
  
        if (existingRecord) {
          await CoinPriceInFiat.CoinPriceInFiatWrite.update(
            { value: convertedValue , price_change_24h: price_change_percentage_24h ,price_change_percentage_24h: price_change_percentage_24h },
            { where: { fiat_type, coin_id } }
          );
        } else {
          await CoinPriceInFiat.CoinPriceInFiatWrite.create({
            coin_id,
            fiat_type,
            coin_symbol: 'TICS',
            coin_name: 'Qubetics',
            coin_family: coin_family,
            cmc_id: coin_data?.cmc_id,
            value: convertedValue,
            price_change_24h: 0,
            price_change_percentage_24h: 0,
            market_cap: 0,
            circulating: 0,
            total_supply: 0,
            rank: 0,
            volume_24h: 0,
            max_supply: 0,
            latest_price: null,
            latest_price_source: null,
          });
        }
      }
  
    } catch (error) {
      console.log("::Error log:: updateTicsPrice :>> ", error);
      return false;
    }
  }
  
  private saveDayCoinPrice = async (coin_id: number, price: number, coin_family: number) => {
    let dataToSave: any = {
        coin_id: coin_id,
        coin_family: coin_family,
        price: price,
    }
    await DayCoinPrice.DayCoinPriceWrite.create(dataToSave);
  }

  private coinCompareDayPrice = async (coin_id: number) => {
    let result = await DayCoinPrice.DayCoinPriceRead.findOne({
        attributes: ['price'],
        where: Sequelize.literal(`created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) AND coin_id = :coin_id`),
        order: [['id', 'desc']],
        replacements: { coin_id },
        raw: true
    });
    let price = result?.price ? result.price : 0;
    if (price <= 0) {
      result = await DayCoinPrice.DayCoinPriceRead.findOne({
          attributes: ['price'],
          where: { coin_id },
          order: [['id', 'desc']],
          raw: true
      });
      price = result?.price ?? 0;
  }
    return price;
  }

  private percentageCalulator = async (new_price: any, original_price: any) => {
    let price_change_percentage_24h = await bigNumberSafeMath(new_price, '-', original_price);
    price_change_percentage_24h = await bigNumberSafeMath(price_change_percentage_24h, '/', original_price);
    price_change_percentage_24h = await bigNumberSafeMath(price_change_percentage_24h, '*', 100);
    return price_change_percentage_24h.toString();
  }
}

const third_party_controller = new PricesController();
export default third_party_controller;
