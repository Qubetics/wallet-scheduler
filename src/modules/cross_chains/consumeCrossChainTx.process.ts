import axios from "axios";
import { config } from "../../config";
import etherJs from "../../helpers/common/web3.helper";
import blockchain_helper from "../../helpers/common/blockchain.helper";
import non_evm_helper from "../../helpers/common/non.evm.helper";
import {
  Coins,
  Wallets,
  NotificationModel,
  CustomToken,
} from "../../models/model";
import { Op } from "sequelize";
import redisClient from "../../helpers/common/redis";
import TrnxHistoryModel from "../../models/model/model.trnxHistory";
import BigNumber from "bignumber.js";
import {
  bigNumberSafeMath,
  exponentialToDecimal,
  GetDeviceTokens,
} from "../../helpers/common/globalFunctions";
import { sendNotification } from "../../helpers/common/globalFunctions";
import SWFTCCoinsDataModel from "../../models/model/model.swftc_coins";
import { SWFTC, SWFTC_RESPONSE, SWFTC_STATUS } from "./enum";
import { Boolean, ADDED_BY, COINS, TOKENS } from "../../constants";
import { cross_chain_helper } from "./helper";
import kafkaHelper from "../../helpers/common/kafka.helper";
import NonEvmHelper from "../../helpers/common/non.evm.helper";
import { ethers } from "ethers";
import { MoralisData } from "./interface.consumer";

const COIN_FAMILY = config.STATIC_COIN_FAMILY;

class CosnumeCrossChainTxProcess {

  public ethEtherUrl: ethers.JsonRpcProvider;
  public bscEtherUrl: ethers.JsonRpcProvider;
  public polEtherUrl: ethers.JsonRpcProvider;
  public ticsEtherUrl: ethers.JsonRpcProvider;

  constructor() {
    this.ethEtherUrl = etherJs.etherEth;
    this.bscEtherUrl = etherJs.etherBsc;
    this.polEtherUrl = etherJs.etherPol;
    this.ticsEtherUrl = etherJs.etherTics;
  }

  public async startTxStatusUpdateQueue() {
    let consumer = await kafkaHelper.kafka.consumer({
      groupId: config.PENDING_CROSS_CHAIN_TX_GROUP_ID,
    });
    await consumer.subscribe({
      topic: config.PENDING_CROSS_CHAIN_TX_TOPIC,
      fromBeginning: true,
    });

    await consumer
      .run({
        eachMessage: ({
          topic,
          partition,
          message,
        }: {
          topic: any;
          partition: any;
          message: any;
        }) => {
          console.log("🚀 ~ cross chain startBlockTxQueue topic", topic);
          console.log(
            "🚀 ~ cross chain startBlockTxQueue message.value",
            message.value.toString()
          );
          this.getTx(JSON.parse(message.value.toString()));
        },
      })
      .catch((err: Error) => {
        console.log("🔥 ~ startBlockTxQueue consumer error", err);
      });
  }

  public async getTx(data: {
    id: number;
    from_adrs: string | null;
    to_adrs: string;
    order_id: string | null;
  }) {
    try {
      const params: any = {
        equipmentNo: SWFTC.EQUIPMENT,
        orderId: data.order_id,
        sourceType: SWFTC.IOS,
      };

      const response: any = await axios.post(
        "https://www.swftc.info/api/v2/queryOrderState",
        params
      );

      await cosnumeCrossChainTxProcess.getOrderDetail(
        response?.data.data,
        data
      );
    } catch (err: any) {
      console.error("💥 ~ ~ getTx error", err);
    }
  }

  public async getOrderDetail(resData: any, data: any) {
    try {
      if (
        resData !== null &&
        resData.detailState == SWFTC_RESPONSE.RECEIVE &&
        resData.tradeState == SWFTC_RESPONSE.COMPLETE
      ) {
        const oldCoinSymbol = resData.receiveCoinCode;
        let coinSymbol: string = oldCoinSymbol.split(/[\(\)]/);
        coinSymbol = coinSymbol[Boolean.false];
        const destinationAddr = resData.destinationAddr;
        const swftcCoin: any = await SWFTCCoinsDataModel.findOne({
          attributes: [
            "id",
            "coinId",
            "coinName",
            "coinCode",
            "coinImageUrl",
            "mainNetwork",
            "contact",
            "coinDecimal",
            "noSupportCoin",
            "coinCodeShow",
            "status",
          ],
          where: { coinCode: { [Op.like]: oldCoinSymbol } },
          raw: true,
        });
        if (swftcCoin) {
          let coinFamily: number = Boolean.false;
          let tokenType: string = TOKENS.ERC20;
          if (swftcCoin.mainNetwork == COINS.ETH) {
            coinFamily = COIN_FAMILY.ETH;
            tokenType = TOKENS.ERC20;
          } else if (swftcCoin.mainNetwork == COINS.BTC) {
            coinFamily = COIN_FAMILY.BTC;
          } else if (
            swftcCoin.mainNetwork == COINS.POL ||
            swftcCoin.mainNetwork == COINS.POLYGON
          ) {
            coinFamily = COIN_FAMILY.POL;
            tokenType = TOKENS.ERC20;
          } else if (swftcCoin.mainNetwork == COINS.SOL) {
            coinFamily = COIN_FAMILY.SOL;
            tokenType = TOKENS.SPL;
          } else if (swftcCoin.mainNetwork == COINS.TRX) {
            coinFamily = COIN_FAMILY.TRX;
            tokenType = TOKENS.TRC20;
          } else if (swftcCoin.mainNetwork == COINS.BSC) {
            coinFamily = COIN_FAMILY.BNB;
            tokenType = TOKENS.BEP20;
          } else if (swftcCoin.mainNetwork == COINS.TICS) {
            coinFamily = COIN_FAMILY.TICS;
            tokenType = TOKENS.ERC20;
          }

          console.log("cross chain >>>>>>>>>>>>>>>>>.", coinFamily);

          let coinsData: any = await Coins.CoinsRead.findOne({
            attributes: [
              "coin_id",
              "coin_symbol",
              "is_token",
              "token_type",
              "token_address",
              "added_by",
            ],
            where: { coin_id: swftcCoin.coinId, coin_family: coinFamily },
            raw: true,
          });
          if (!coinsData) {
            coinsData = await Coins.CoinsWrite.create({
              coin_name: swftcCoin.coinName,
              coin_symbol: coinSymbol,
              coin_image: swftcCoin.coinImageUrl,
              coin_family: coinFamily,
              coin_status: Boolean.true,
              is_token: Boolean.true,
              token_type: tokenType,
              decimals: Math.pow(10, parseInt(swftcCoin.coinDecimal)),
              cmc_id: Boolean.false,
              is_on_cmc: Boolean.true,
              token_address: swftcCoin.contact,
              for_swap: Boolean.true,
              added_by: ADDED_BY.admin,
            });
            console.log("Update in redis");


            const redisCoinData = {
              coin_id: coinsData?.coin_id,
              is_token: coinsData?.is_token,
              token_address: coinsData?.token_address,
              coin_family: coinsData?.coin_family,
              decimals: coinsData?.decimals,
              token_type: coinsData?.token_type,
              coin_symbol: coinsData?.coin_symbol,
              added_by: coinsData?.added_by,
              for_swap: coinsData?.for_swap
            }
            console.log("Finded all coins successfully.");
            const setCoins: any =
              coinFamily == 1
                ? config.TOKENS.BSC_TOKEN_TYPE
                : coinFamily == 2
                  ? config.TOKENS.ETH_TOKEN_TYPE
                  : coinFamily == 4
                    ? config.TOKENS.POL_TOKEN_TYPE
                    : coinFamily == 5
                      ? config.TOKENS.SOL_TOKEN_TYPE
                      : coinFamily == 6
                        ? config.TOKENS.TRX_TOKEN_TYPE
                        : config.TOKENS.TICS_TOKEN_TYPE;

            await redisClient.setKeyValuePair(
              setCoins || "",
              coinsData?.token_address,
              JSON.stringify(redisCoinData)
            );
            console.log("Updated successfully.");
          } else {
            await Coins.CoinsWrite.update(
              {
                added_by: ADDED_BY.admin,
              },
              {
                where: {
                  coin_id: coinsData.coin_id,
                },
              }
            );
          }

          let etherObject: ethers.JsonRpcProvider = this.ethEtherUrl;
          let depositQuery: any = null;
          if (coinFamily == COIN_FAMILY.ETH) {
            etherObject = this.ethEtherUrl;
            depositQuery = await redisClient.getKeyValuePair(
              `${config.ETH_WALLET_ADDRESS}`,
              destinationAddr.toUpperCase()
            );
          } else if (coinFamily == COIN_FAMILY.POL) {
            etherObject = this.polEtherUrl;
            depositQuery = await redisClient.getKeyValuePair(
              `${config.POL_WALLET_ADDRESS}`,
              destinationAddr.toUpperCase()
            );
          } else if (coinFamily == COIN_FAMILY.TRX) {
            depositQuery = await redisClient.getKeyValuePair(
              `${config.TRON_WALLET_ADDRESS}`,
              destinationAddr.toUpperCase()
            );
          } else if (coinFamily == COIN_FAMILY.SOL) {
            depositQuery = await redisClient.getKeyValuePair(
              `${config.SOL_WALLET_ADDRESS}`,
              destinationAddr.toUpperCase()
            );
          } else if (coinFamily == COIN_FAMILY.BTC) {
            depositQuery = await redisClient.getKeyValuePair(
              `${config.BTC_WALLET_ADDRESS}`,
              destinationAddr.toUpperCase()
            );
          } else if (coinFamily == COIN_FAMILY.BNB) {
            etherObject = this.bscEtherUrl;
            depositQuery = await redisClient.getKeyValuePair(
              `${config.BSC_WALLET_ADDRESS}`,
              destinationAddr.toUpperCase()
            );
          } else if (coinFamily == COIN_FAMILY.TICS) {
            etherObject = this.ticsEtherUrl;
            depositQuery = await redisClient.getKeyValuePair(
              `${config.TICS_WALLET_ADDRESS}`,
              destinationAddr.toUpperCase()
            );
          }
          console.log("cross chain  123>>>>>>>>>>>>>>>>>.");

          if (depositQuery) {
            console.log("cross chain  456>>>>>>>>>>>>>>>>>.", depositQuery);
            const amount = resData.receiveCoinAmt;
            const transactionId = resData.transactionId;
            const tranExist: any = await TrnxHistoryModel.findOne({
              attributes: ["id", "to_adrs"],
              where: {
                tx_id: transactionId,
              },
              raw: true,
            });
            const walletData: any = await Wallets.WalletRead.findOne({
              attributes: ["user_id"],
              where: {
                wallet_address: destinationAddr,
              },
              raw: true,
            });
            const toUserId: any = walletData.user_id;
            if (tranExist == null) {
              let fromAddress = "";
              let gasReverted: number = 0;
              let gasPrice: number = 0;
              let blockId: number = 0;
              let transactionFee: number = 0;
              let userBalance: number | null = 0;
              let transStatus: any = false;
              /** for ETH/BSC/POL */
              console.log("coin_family >>>", coinFamily);
              if (
                coinFamily == COIN_FAMILY.ETH ||
                coinFamily == COIN_FAMILY.BNB ||
                coinFamily == COIN_FAMILY.POL ||
                coinFamily == COIN_FAMILY.TICS
              ) {
                const transactionReceipt = await etherObject.getTransactionReceipt(
                  transactionId
                );
                if (
                  transactionReceipt &&
                  transactionReceipt?.status &&
                  transactionReceipt?.blockHash != null
                ) {
                  transStatus = true;
                  const transaction: any = await etherObject.getTransaction(transactionId);

                  if (transaction) {
                    fromAddress = transactionReceipt.from || '';

                    const gasUsed: BigNumber = new BigNumber(transactionReceipt?.gasUsed?.toString() || "0");
                    const tranGasPrice: BigNumber = new BigNumber(transaction.gasPrice?.toString() || "0");
                    const gasTotal: BigNumber = new BigNumber(transaction?.gasLimit?.toString() || "0");

                    if (gasTotal.isGreaterThan(0) && gasUsed.isGreaterThan(0)) {
                      const gasDiff = gasTotal.minus(gasUsed);
                      const reverted = tranGasPrice.multipliedBy(gasDiff);
                      gasReverted = Number(ethers.formatEther(reverted.toString()));
                    }
                    gasPrice = Number(ethers.formatUnits(tranGasPrice.toString(), 9));
                    blockId = transaction.blockNumber
                  }
                }
                if (swftcCoin.contact !== null && swftcCoin.contact !== "") {
                  /** User ERC-20 token Balance */
                  const balance =
                    await blockchain_helper.getUserERC20TokenBalance(
                      swftcCoin.contact,
                      config.CONTRACT_ABI,
                      destinationAddr,
                      etherObject
                    );

                  userBalance = balance !== null ? Number(balance) : null;
                } else {
                  /** User Native Coin Balance */
                  const balance = await blockchain_helper.get_balance(
                    destinationAddr,
                    etherObject,
                    true
                  );
                  userBalance = balance !== null ? Number(balance) : null;
                }
                /** for BTC */
              } else if (coinFamily == COIN_FAMILY.BTC) {
                const transaction = await non_evm_helper.getTransactionById(
                  transactionId
                );

                if (
                  transaction.confirmations != undefined &&
                  transaction.confirmations !== 2
                ) {
                  transStatus = true;
                  fromAddress = transaction?.vin[0]?.addresses[0] ?? '';
                  const userBtcBaldata: number | null =
                  await non_evm_helper.get_user_btc_balance(destinationAddr);

                userBalance = userBtcBaldata ? Number(userBtcBaldata) : null;
                }
                /** for Tron */
              } else if (coinFamily == COIN_FAMILY.SOL) {
                console.log("solana transaction");
                const transaction = await NonEvmHelper.getTransaction(
                  transactionId
                );
                console.log("transaction >>>.", transaction);
                if (transaction) {
                  if (transaction.meta.err == null) {
                    transStatus = true;
                    fromAddress =
                      transaction.transaction.message.accountKeys[0];
                    blockId = transaction?.slot;
                    transactionFee = Number(
                      await exponentialToDecimal(
                        await bigNumberSafeMath(
                          transaction.meta.fee,
                          "/",
                          Math.pow(10, 9)
                        )
                      )
                    );
                  }
                }
                if (swftcCoin.contact !== null && swftcCoin.contact !== "") {
                  /** User Solana token Balance */
                  userBalance = await NonEvmHelper.getUserCRC20TokenBalance(
                    swftcCoin.contact,
                    destinationAddr
                  );
                } else {
                  /** User Solana Balance */
                  userBalance = Number(
                    await NonEvmHelper.getUserSolanaBalance(
                      destinationAddr,
                      true
                    )
                  );
                }
              } else if (coinFamily == COIN_FAMILY.TRX) {
                const transactionData: {
                  status: boolean;
                  fromAddress: string;
                  blockId: number;
                } = await non_evm_helper.getTransactionInfo(transactionId);
                if (transactionData.status) {
                  fromAddress = transactionData.fromAddress;
                  blockId = transactionData.blockId;
                  if (
                    swftcCoin.contact !== null &&
                    swftcCoin.contact !== ""
                  ) {
                    console.log("swftc_coin.contact >>>>>", swftcCoin.contact);
                    const tronBal = await non_evm_helper.Fetch_Balance(
                      destinationAddr,
                      Boolean.true,
                      swftcCoin.contact
                    );
                    userBalance = tronBal !== null ? Number(tronBal) : null;
                  } else {
                    const tronBal = await non_evm_helper.Fetch_Balance(
                      destinationAddr,
                      Boolean.false,
                      swftcCoin.contact
                    );
                    userBalance = tronBal !== null ? Number(tronBal) : null;
                  }
                  transStatus = true;
                }
              }
              console.log("trans_status >>>", transStatus);
              if (transStatus) {
                const trnxType: string = "deposit";
                const historyData: any = {
                  user_id: 0,
                  to_user_id: toUserId,
                  type: trnxType,
                  req_type: "EXNG",
                  from_adrs: fromAddress,
                  to_adrs: destinationAddr,
                  tx_id: transactionId,
                  status: "completed",
                  blockchain_status: "confirmed",
                  coin_id: coinsData.coin_id,
                  coin_family: coinFamily,
                  amount: amount,
                  fiat_price: null,
                  fiat_type: "USD",
                  gas_limit: null,
                  gas_price: gasPrice,
                  gas_reverted: gasReverted,
                  block_id: blockId,
                  tx_fee: transactionFee !== 0 ? transactionFee : null,
                };
                const historyCreatedData = await TrnxHistoryModel.create(
                  historyData
                );
                const rowId = historyCreatedData.id;
                await TrnxHistoryModel.update(
                  {
                    order_status: SWFTC_STATUS.COMPLETED,
                    order_failed_reason: null,
                  },
                  { where: { id: data.id } }
                );
                console.log("in create order id >>>", data.order_id);

                await cross_chain_helper.insert_profit_in_admin_table(
                  resData,
                  data.order_id,
                  toUserId
                );
                const walletDataExist: any = await Wallets.WalletRead.findOne({
                  attributes: ["wallet_id"],
                  where: {
                    coin_id: coinsData.coin_id,
                    wallet_address: destinationAddr,
                  },
                  raw: true,
                });
                console.log("walletDataExist>>>>", walletDataExist);
                if (!walletDataExist) {
                  const walletData: any = await Wallets.WalletRead.findOne({
                    where: {
                      wallet_address: destinationAddr,
                    },
                    limit: 1,
                    raw: true,
                  });
                  await Wallets.WalletWrite.create({
                    user_id: walletData.user_id,
                    wallet_name: walletData.wallet_name,
                    wallet_address: walletData.wallet_address,
                    coin_id: coinsData.coin_id,
                    coin_family: coinFamily,
                    balance: userBalance || 0,
                    default_wallet: walletData.default_wallet,
                    status: 1,
                    sort_order: null,
                    is_private_wallet: walletData.is_private_wallet,
                  });

                  if (coinsData.added_by) {
                    if (coinsData.added_by == "user") {
                      console.log("added by user");
                      const userExist: any =
                        await CustomToken.CustomTokenRead.findOne({
                          attributes: ["id"],
                          where: {
                            user_id: walletData.user_id,
                            coin_id: coinsData.coin_id,
                          },
                          raw: true,
                        });
                      if (userExist) {
                        console.log("custom token already exist");
                      } else {
                        console.log("custom token not exist");
                        const currentUTCDate: string = new Date()
                          .toISOString()
                          .replace(/T/, " ")
                          .replace(/\..+/, "");
                        await CustomToken.CustomTokenWrite.create({
                          coin_id: coinsData.coin_id,
                          user_id: walletData.user_id,
                          created_at: currentUTCDate,
                          updated_at: currentUTCDate,
                        });
                      }
                    }
                  } else {
                    console.log("coin added by admin");
                  }
                } else {
                  if (userBalance !== null) {
                    await Wallets.WalletWrite.update(
                      {
                        balance: userBalance,
                      },
                      {
                        where: {
                          coin_id: coinsData.coin_id,
                          wallet_address: destinationAddr,
                        },
                      }
                    );
                  }
                }
                /** save notification */
                const depositNotificationExist: any =
                  await NotificationModel.findOne({
                    attributes: ["notification_id", "tx_type"],
                    where: {
                      wallet_address: { [Op.like]: destinationAddr },
                      tx_id: rowId,
                      tx_type: "deposit",
                    },
                  });
                if (!depositNotificationExist) {
                  const am = amount.toString();
                  let value: any = new BigNumber(am);
                  value = value.toFixed();
                  const notiMsg = `Deposit of ${value} ${coinSymbol} has been confirmed.`;
                  const notificationData: any = {
                    message: notiMsg,
                    amount: Number(amount),
                    from_user_id: 0,
                    to_user_id: toUserId,
                    notification_type: "Deposit",
                    tx_id: rowId,
                    tx_type: "deposit",
                    coin_symbol: coinSymbol,
                    coin_family: coinFamily,
                    coin_id: coinsData.coin_id,
                    view_status: null,
                    state: "sent",
                    wallet_address: destinationAddr,
                    created_at: new Date(),
                    updated_at: new Date(),
                  };
                  await NotificationModel.create(notificationData);
                  /** send push notification */
                  const deviceTokenData: any = await GetDeviceTokens(
                    toUserId,
                    destinationAddr,
                    coinFamily
                  );
                  if (deviceTokenData?.length > 0) {
                    let dataNoti: any = {
                      token: deviceTokenData,
                      title: "DEPOSIT",
                      message: notiMsg,
                      notification_type: "deposit",
                      tx_id: rowId,
                      tx_type: "DEPOSIT",
                    };
                    await sendNotification(dataNoti);
                  }
                }
              } else {
                console.log("Transaction not getting from blockchain");
              }
            } else {
              await TrnxHistoryModel.update(
                {
                  order_status: SWFTC_STATUS.COMPLETED,
                  order_failed_reason: null,
                },
                { where: { id: data.id } }
              );
              console.log("in update order id >>>", data.order_id);
              await cross_chain_helper.insert_profit_in_admin_table(
                resData,
                data.order_id,
                toUserId
              );
            }
          } else {
            console.log("depositQuery address found >>>>>>>>>.", depositQuery);
          }
        } else {
        }
      } else {
        if (
          resData?.detailState == SWFTC_RESPONSE.WAIT_DEPOSIT ||
          resData?.detailState == SWFTC_RESPONSE.WAIT_PUSH ||
          resData?.detailState == SWFTC_RESPONSE.WAIT_RETURN ||
          resData?.detailState == SWFTC_RESPONSE.WAIT_REC_SEND ||
          resData?.detailState == SWFTC_RESPONSE.WAIT_REC_CONFIRM ||
          resData?.detailState == SWFTC_RESPONSE.WAIT_SEND ||
          resData?.detailState == SWFTC_RESPONSE.WAIT_CONFIRM ||
          resData?.detailState == SWFTC_RESPONSE.ERROR
        ) {
          await TrnxHistoryModel.update(
            {
              order_status: SWFTC_STATUS.PENDING,
              order_failed_reason: resData?.detailState,
            },
            { where: { id: data.id } }
          );
        } else if (
          resData?.detailState == SWFTC_RESPONSE.REFRESH_COMPLETE ||
          resData?.detailState == SWFTC_RESPONSE.WAIT_KYC ||
          resData?.detailState == SWFTC_RESPONSE.TIMEOUT ||
          resData?.detailState == SWFTC_RESPONSE.REFUND_COMPLETE
        ) {
          await TrnxHistoryModel.update(
            {
              order_status: SWFTC_STATUS.FAILED,
              order_failed_reason: resData?.detailState,
            },
            { where: { id: data.id } }
          );
        }
      }
    } catch (err: any) {
      console.error("💥 ~ ~ getOrderDetail error", err);
    }
  }

  /* MORALIS TRADINGVIEW */
  public moralisTradingviewChartWidgets = async () => {
    let consumer = await kafkaHelper.kafka.consumer({
      groupId: config.MORALIS_TRADINGVIEW_GROUP_ID,
    });
    await consumer.subscribe({
      topic: config.MORALIS_TRADINGVIEW_TOPIC,
      fromBeginning: true,
    });

    await consumer
      .run({
        eachMessage: ({
          topic,
          partition,
          message,
        }: {
          topic: any;
          partition: any;
          message: any;
        }) => {
          console.log("🚀 ~ ~ moralis_tradingview topic", topic);
          console.log(
            "🚀 ~ ~ moralis_tradingview message.value",
            message.value.toString()
          );
          this.moralisTradingview(JSON.parse(message.value.toString()));
        },
      })
      .catch((err: Error) => {
        console.log(
          "💥 ~ ~ moralisTradingviewChartWidgets consumer error",
          err
        );
      });
  };

  private buildApiUrl(
    coinFamily: number,
    tokenAddress: string,
    chain: string | null
  ): string | null {
    if (coinFamily === 5) {
      return `https://solana-gateway.moralis.io/token/mainnet/${tokenAddress}/pairs`;
    }
    if (chain) {
      return `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/pairs?chain=${chain}`;
    }
    return null;
  }

  private getChainName(coinFamily: number): string | null {
    const chains: Record<number, string> = {
      1: "bsc",
      2: "eth",
      4: "polygon",
    };
    return chains[coinFamily] || null;
  }

  public async moralisTradingview(data: MoralisData): Promise<void> {
    try {
      const chain = this.getChainName(data.coin_family);
      const apiUrl = this.buildApiUrl(
        data.coin_family,
        data.token_address,
        chain
      );

      if (!apiUrl) {
        console.warn(`Unsupported coin family: ${data.coin_family}`);
        return;
      }

      const response = await axios.get(apiUrl, {
        headers: { "x-api-key": config.MORALIS_KEY },
      });

      const pairs = response?.data?.pairs;
      if (!pairs?.length) {
        console.warn(`No pairs found for Token address: ${data.token_address}`);
        await this.updateCoinStatus(data, 2);
        return;
      }

      const activePair = pairs.find(
        (pair: any) =>
          pair?.inactive_pair === false || pair?.inactivePair === false
      );

      if (!activePair) {
        const firstPair = pairs[0];
        let pairAddress: string | null = null;
        let rawExchangeName: string | null = null;
        let graph_pair: string | null = null;
        if (data?.coin_family == 4) {
          pairAddress = firstPair?.pairAddress || null;
          rawExchangeName = firstPair?.exchangeName || null;
          graph_pair = firstPair?.pairLabel || null;
        } else {
          pairAddress = firstPair?.pair_address || null;
          rawExchangeName = firstPair?.exchange_name || null;
          graph_pair = firstPair?.pair_label || null;
        }
        const graphSource = rawExchangeName
          ? this.formatExchangeName(rawExchangeName)
          : null;

        if (pairAddress) {
          await Coins.CoinsWrite.update(
            {
              graph_source: graphSource,
              graph_pair: graph_pair,
              pair_address: pairAddress,
              is_on_trading_view: 3,
              is_on_moralis_inactive: 1
            },
            {
              where: {
                token_address: data.token_address,
                coin_family: data.coin_family,
              },
            }
          );
          console.warn(
            `Pair address found for Token address: ${data?.token_address}`
          );
        } else {
          console.warn(
            ` pairAddress not found, Token address: ${data.token_address}`
          );
          await this.updateCoinStatus(data, 2);
        }
        return;
      }

      const pairAddress =
        activePair?.pair_address || activePair?.pairAddress || null;
      const rawExchangeName =
        activePair?.exchange_name || activePair?.exchangeName || null;
      const graphSource = rawExchangeName
        ? this.formatExchangeName(rawExchangeName)
        : null;

      if (pairAddress) {
        await Coins.CoinsWrite.update(
          {
            graph_source: graphSource,
            graph_pair: activePair?.pair_label || activePair?.pairLabel || null,
            pair_address: pairAddress,
            is_on_trading_view: 3,
          },
          {
            where: {
              token_address: data.token_address,
              coin_family: data.coin_family,
            },
          }
        );
        console.warn(
          `Pair address 22 found for Token address: ${data?.token_address}`
        );
      } else {
        console.warn(
          ` pairAddress not found, Token address: ${data.token_address}`
        );
        await this.updateCoinStatus(data, 2);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error in moralisTradingview: ${errMsg}`, error);
      await this.updateCoinStatus(data, 1);
      return;
    }
  }

  private async updateCoinStatus(data: MoralisData, status: number): Promise<void> {
    await Coins.CoinsWrite.update(
      {
        is_on_trading_view: status,
      },
      {
        where: {
          token_address: data.token_address,
          coin_family: data.coin_family,
        },
      }
    );
  }

  // Utility function to format exchange names
  public formatExchangeName = (exchangeName: string): string => {
    return exchangeName
      .split(" ") // Split the string by spaces
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join("") // Join without spaces
      .replace(/v(\d+)/gi, "V$1"); // Handle 'v3' to 'V3'
  };
}

const cosnumeCrossChainTxProcess = new CosnumeCrossChainTxProcess();
export default cosnumeCrossChainTxProcess;
