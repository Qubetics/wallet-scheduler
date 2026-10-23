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
import cmcHelper from "../../helpers/common/cmc.helper";
import globalHelper from "../../helpers/common/global.helper";

const {
  current_price_coin_counter: CURRENT_PRICE_COIN_COUNTER,
  graph_data_coin_counter: GRAPH_DATA_COIN_COUNTER,
  fetch_cmc_ids_counter: FETCH_CMC_IDS_COIN_COUNTER,
} = config.REDISKEYS.COIN_LIMIT_COUNT_FIELD;

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
        group: ["cmc_id"],
        order: [["cmc_id", "asc"]], // cmc_id replace with coin_id in order by
        limit: limit,
        offset: coinLimitCount,
        logging: true,
      });
      const totalRecords: number = coinRecords ? coinRecords.length : 0; // Total number of unique groups (cmc_id)


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
                });
              }
            } else {
              console.log('empty sparkline >>>', sparkline);
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
  
  
}

const third_party_controller = new PricesController();
export default third_party_controller;
