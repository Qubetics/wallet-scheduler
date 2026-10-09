import { config } from "../../config";
import {
  CoinPriceInFiat,
  CurrencyFiat,
  Coins,
  CoinPriceInFiatGraph,
  // TicsPriceInFiatGraph
} from "../../models/model/index";
import redisClient from "../../helpers/common/redis";
import { Op, Sequelize } from "sequelize";
import rp from "request-promise";
import sequelize from "sequelize";
import cmcHelper from "../../helpers/common/cmc";
import globalHelper from "../../helpers/common/global";

const {
  current_price_coin_counter: CURRENT_PRICE_COIN_COUNTER,
  graph_data_coin_counter: GRAPH_DATA_COIN_COUNTER,
  fetch_cmc_ids_counter: FETCH_CMC_IDS_COIN_COUNTER,
} = config.REDISKEYS.COIN_LIMIT_COUNT_FIELD;

class PricesController {


  private updateHistoryLastPrice = async (
    latestPrice: any,
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
        const historySparkline: any =
          history.sparkline !== null ? history.sparkline : [];
        if (historySparkline.length > 0) {
          const cleanedData = historySparkline.filter(
            (item: any) => item !== null
          );
          const lastRecord = cleanedData[cleanedData?.length - 1];
          const existingTimestamp = new Date(lastRecord?.timestamp).getTime();
          const latestTimestamp = new Date(latestPrice?.timestamp).getTime();
          if (latestTimestamp > existingTimestamp) {
            cleanedData.push(latestPrice);
            const historyData: any = await globalHelper.setGraphData(
              cleanedData
            );

            if (historyData.status) {
              const updateData: any = {
                sparkline: historyData.graphData,
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
          historySparkline.push(latestPrice);
          const historyData: any = await globalHelper.setGraphData(
            historySparkline
          ); // slicing the data
          if (historyData.status) {
            const updateData: any = {
              sparkline: historyData.graphData,
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
        const coinPayload: any = {
          cmc_id: id,
          type: types[i],
          fiat_type: code,
          sparkline: [latestPrice],
        };
        await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.create(
          coinPayload
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
    coinLimit: number
  ) => {
    const ids: any[] = [];

    try {
      console.log("********* fetchgraphdata *************");
      /** coins pagination */
      let coinLimitCount = 0;
      const limit = coinLimit;
      const findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${type}_${GRAPH_DATA_COIN_COUNTER}`
      );

      if (findCoinCounter) {
        coinLimitCount = Number(findCoinCounter);
      }
      let dbCoinRecords: any;

      dbCoinRecords =
        await CoinPriceInFiatGraph.CoinPriceInFiatGraphRead.findAndCountAll({
          where: {
            type: type,
            fiat_type: "USD",
          },
          order: [["cmc_id", "asc"]], // cmc_id replace with coin_id in order by
          limit: limit,
          offset: coinLimitCount,
          logging: true,
        });

      console.log(
        "dbCoinrecords.count :>> ",
        dbCoinRecords.count,
        "type :",
        type
      );
      let groupedCount = dbCoinRecords.count; // This is an array of grouped results
      let totalRecords = dbCoinRecords.rows.length; // Total number of unique groups (cmc_id)
      if (dbCoinRecords.count == 0) {
        dbCoinRecords = await Coins.CoinsRead.findAndCountAll({
          attributes: ["cmc_id"],
          where: {
            cmc_id: { [Op.ne]: 0, [Op.lt]: 50000 },
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
          group: ["cmc_id"],
          order: [["cmc_id", "asc"]], // cmc_id replace with coin_id in order by
          limit: limit,
          offset: coinLimitCount,
          logging: true,
        });
        groupedCount = dbCoinRecords.count; // This is an array of grouped results
        totalRecords = groupedCount.length; // Total number of unique groups (cmc_id)
      }

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
      const groupedRows = dbCoinRecords.rows;

      // Example: Iterate over groups
      if (totalRecords > 0) {
        await groupedRows.forEach((group: any) => {
          if (group.cmc_id < 50000) {
            ids.push(group.cmc_id);
          }
        });
      }

      console.log("ids,  :>> ", ids, "type :", type);

      if (totalRecords > 0 && ids.length > 0) {
        const code = "USD";
        const requestOptionsForListing = await cmcHelper.cmcHistoricalData(
          ids,
          interval,
          startDate,
          endDate
        );
        const data = await rp(requestOptionsForListing);
        if (data) {
          let createdAt;
          const currentUTCDate: string = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          for await (const id of ids as any) {
            const fiatType = code;
            let sparkline: any = [];

            if (data?.data[id]?.quotes && data?.data[id]?.quotes.length > 0) {
              sparkline = await data?.data[id]?.quotes.map(
                (data: any, index: number) => {
                  if (
                    data?.quote[code?.toUpperCase()] !== undefined &&
                    data?.quote[code?.toUpperCase()] !== null
                  ) {
                    createdAt = new Date(
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
                  createdAt = new Date(
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
                    updated_at: currentUTCDate,
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
                  fiat_type: fiatType?.toUpperCase(),
                  type: type,
                  created_at: createdAt,
                  updated_at: currentUTCDate,
                });
              }
            } else {
              const whereCond: any = {
                cmc_id: id,
                fiat_type: code,
                type: type,
              };
              await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.update(
                {
                  updated_at: currentUTCDate,
                },
                {
                  where: whereCond,
                }
              );
            }
          }
        }
      }

      /** update coins pagination */
      coinLimitCount = coinLimitCount + limit;

      const counter = coinLimitCount >= groupedCount ? 0 : coinLimitCount;
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
        const message = error.response.data.status.error_message;
        const position = message.includes('No data found for "id"');
        const position1 = message.includes("No items found");

        if (position || position1) {
          const updateGraphNotFound =
            await CoinPriceInFiatGraph.CoinPriceInFiatGraphWrite.destroy({
              where: {
                cmc_id: {
                  [Op.in]: ids,
                },
              },
            });

          console.log("updateGraphNotFound :>> ", updateGraphNotFound);

          const updateCoinNotFound = await Coins.CoinsWrite.update(
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


  public fetchCmcIds = async () => {
    try {
      const BATCH_SIZE = 10;
      let coinLimitCount = 0;

      // Get current counter from Redis
      const findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        FETCH_CMC_IDS_COIN_COUNTER
      );

      if (findCoinCounter) {
        coinLimitCount = Number(findCoinCounter);
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
        offset: coinLimitCount,
      });

      if (data?.count > 0) {
        // Process coins in parallel with error handling for each
        await Promise.all(data.rows.map(async (coin) => {
          try {

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
      const nextCounter = coinLimitCount + BATCH_SIZE >= data?.count
        ? 0
        : coinLimitCount + BATCH_SIZE;

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

      const cryptoSymbols = [];
      if (findFiat.length) {
        for await (const coin of findFiat) {
          const cmdId = coin.currency_code;
          cryptoSymbols.push(cmdId);
        }
      }

      const requestOptionsForListing = await cmcHelper.cmcFiatCurrencyData(
        cryptoSymbols
      );
      const result = await rp(requestOptionsForListing);

      if (result && result.data) {
        const response = result.data["2781"];
        for (const data of cryptoSymbols) {
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
      const coinData = await Coins.CoinsRead.findAndCountAll({
        attributes: ["cmc_id"],
        where: { cmc_id: { [Op.ne]: 0 } },
        order: [["coin_id", "asc"]],
        limit,
        offset: coinLimitCount,
      });

      // Extract CMC IDs from result
      const cmcIds: any[] = coinData.rows.map((row) => row.cmc_id);
      const coinDataCount = coinData.count;

      // Add each coin's cmc_id into the reset_graph_data table if not already present
      if (cmcIds.length > 0) {


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
          const latestPriceUsd: any = {
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
            const existingPrice = await CoinPriceInFiat.CoinPriceInFiatWrite.findOne({
              attributes: ["id", "coin_id"],
              where,
              raw: true,
            });

            let coind: number = 0;

            if (!existingPrice) {
              // If not exists, fetch coin info and insert a new record
              const coin = await Coins.CoinsRead.findOne({
                attributes: ["coin_id", "coin_family", "cmc_id", "token_address"],
                where: { cmc_id: coinObj.id },
              });

              if (!coin) continue;
              coind = coin.coin_id;

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
                latest_price: latestPriceUsd,
                latest_price_source: "converted_from_usd",
              });
            } else {
              // If exists, update the record
              coind = existingPrice.coin_id;
              await CoinPriceInFiat.CoinPriceInFiatWrite.update(
                {
                  value: fiatPrice,
                  price_change_24h: usdQuote.percent_change_24h,
                  price_change_percentage_24h: usdQuote.percent_change_24h,
                  volume_24h: usdQuote.volume_24h * fiatRate,
                  total_supply: coinObj.total_supply,
                  latest_price: latestPriceUsd,
                  latest_price_source: "converted_from_usd",
                },
                { where }
              );
            }

            // For USD, also update the price history table
            if (coind > 0 && fiatCode === "USD") {
              await this.updateHistoryLastPrice(latestPriceUsd, coinObj.id, fiatCode, where);
            }
          }
        }
      }

      // Update the Redis counter for next batch; reset if finished
      coinLimitCount += limit;
      const nextCoinCounter = coinLimitCount >= coinDataCount ? 0 : coinLimitCount;

      await redisClient.setKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        `${CURRENT_PRICE_COIN_COUNTER}`,
        nextCoinCounter.toString()
      );
    } catch (error) {
      console.error("fetchCmcPrice error", error);
    }
  };

  
  
  
}

const pricesController = new PricesController();
export default pricesController;
