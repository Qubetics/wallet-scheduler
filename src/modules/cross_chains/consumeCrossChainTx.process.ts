import axios from 'axios';
import { config } from '../../config';
// import { RabbitMq } from '../../helpers/common/rabbitmq.helper';
import eth_web3 from "../../helpers/common/web3.helper";
import blockchain_helper from "../../helpers/common/blockchain.helper";
import non_evm_helper from "../../helpers/common/non.evm.helper";
import { Coins, Wallets, NotificationModel } from '../../models/model';
import { Op } from 'sequelize';
import redisClient from '../../helpers/common/redis';
import TrnxHistoryModel from '../../models/model/model.trnxHistory';
import { AbiItem } from 'web3-utils';
import BigNumber from 'bignumber.js';
import { bigNumberSafeMath, exponentialToDecimal, GetDeviceTokens } from '../../helpers/common/globalFunctions';
import { sendNotification } from '../../helpers/common/globalFunctions';
import SWFTCCoinsDataModel from '../../models/model/model.swftc_coins';
import { SWFTC, SWFTC_RESPONSE, SWFTC_STATUS } from './enum';
import { Boolean, ADDED_BY, COINS, TOKENS } from '../../constants'
import { cross_chain_helper } from './helper';
import kafkaHelper from '../../helpers/common/kafka.helper';
import NonEvmHelper from '../../helpers/common/non.evm.helper';

const COIN_FAMILY = config.STATIC_COIN_FAMILY;

class CosnumeCrossChainTxProcess {
    public Eth_Web3_Url: any;
    // public Matic_Web3_Url: any;
    public Bnb_Web3_Url: any;
    public Pol_Web3_Url: any;
    public Abi: any;
    constructor() {
        this.Eth_Web3_Url = eth_web3.eth_web3;
        this.Bnb_Web3_Url = eth_web3.bsc_web3
        this.Pol_Web3_Url = eth_web3.pol_web3
    }

    public async startTxStatusUpdateQueue() {
        let consumer = await kafkaHelper.kafka.consumer({ groupId: config.PENDING_CROSS_CHAIN_TX_GROUP_ID });
        await consumer.subscribe({ topic: config.PENDING_CROSS_CHAIN_TX_TOPIC, fromBeginning: true });

        await consumer.run({
            eachMessage: ({ topic, partition, message }: { topic: any, partition: any, message: any }) => {
                console.log("🚀 ~ cross chain startBlockTxQueue topic", topic);
                console.log("🚀 ~ cross chain startBlockTxQueue message.value", message.value.toString());
                this.getTx(JSON.parse(message.value.toString()))
            }
        }).catch((err: Error) => {
            console.log("🔥 ~ startBlockTxQueue consumer error", err);
        });

        // await RabbitMq.consumeQueue(
        //     config.PENDING_CROSS_CHAIN_TX_TOPIC || '',
        //     this.getTx
        // )
    }
    public async getTx(data: {
        id: number,
        from_adrs: string | null,
        to_adrs: string,
        order_id: string | null
    }) {
        try {
            const params: any = {
                equipmentNo: SWFTC.EQUIPMENT,
                orderId: data.order_id,
                sourceType: SWFTC.IOS
            }
            let success: number = Boolean.false;
            let response: any = await axios.post('https://www.swftc.info/api/v2/queryOrderState', params)
            success = Boolean.true;
            await cosnumeCrossChainTxProcess.getOrderDetail(response?.data.data, data)
        } catch (err: any) {
            console.error('💥 ~ ~ getTx error', err)
        }
    }
    public async getOrderDetail(res_data: any, data: any) {
        try {
            if (res_data !== null && res_data.detailState == SWFTC_RESPONSE.RECEIVE && res_data.tradeState == SWFTC_RESPONSE.COMPLETE) {

                let old_coin_symbol = res_data.receiveCoinCode;
                let coin_symbol: string = old_coin_symbol.split(/[\(\)]/)
                coin_symbol = coin_symbol[Boolean.false]
                let destinationAddr = res_data.destinationAddr;
                let swftc_coin: any = await SWFTCCoinsDataModel.findOne({
                    attributes: ["id", "coinId", "coinName", "coinCode", "coinImageUrl", "mainNetwork", "contact", "coinDecimal", "noSupportCoin", "coinCodeShow", "status"],
                    where: { coinCode: { [Op.like]: old_coin_symbol } },
                    raw: true
                })
                if (swftc_coin) {
                    let coin_family: number = Boolean.false;
                    let token_type: string = TOKENS.ERC20;
                    if (swftc_coin.mainNetwork == COINS.ETH) {
                        coin_family = COIN_FAMILY.ETH;
                        token_type = TOKENS.ERC20
                    } else if (swftc_coin.mainNetwork == COINS.BTC) {
                        coin_family = COIN_FAMILY.BTC
                    } else if (swftc_coin.mainNetwork == COINS.POL || swftc_coin.mainNetwork == COINS.POLYGON) {
                        coin_family = COIN_FAMILY.POL
                        token_type = TOKENS.ERC20
                    } else if (swftc_coin.mainNetwork == COINS.SOL) {
                        coin_family = COIN_FAMILY.SOL
                        token_type = TOKENS.SPL
                    } else if (swftc_coin.mainNetwork == COINS.TRX) {
                        coin_family = COIN_FAMILY.TRX
                        token_type = TOKENS.TRC20
                    } else if (swftc_coin.mainNetwork == COINS.BSC) {
                        coin_family = COIN_FAMILY.BNB
                        token_type = TOKENS.BEP20
                    }

                    console.log("cross chain >>>>>>>>>>>>>>>>>.", coin_family)

                    let coins_data: any = await Coins.CoinsRead.findOne({
                        attributes: ["coin_id", "coin_symbol", "is_token", "token_type", "token_address"],
                        where: { coin_id: swftc_coin.coinId, coin_family: coin_family },
                        raw: true
                    })
                    if (!coins_data) {
                        coins_data = await Coins.CoinsWrite.create({
                            coin_name: swftc_coin.coinName,
                            coin_symbol: coin_symbol,
                            coin_image: swftc_coin.coinImageUrl,
                            coin_family: coin_family,
                            coin_status: Boolean.true,
                            is_token: Boolean.true,
                            token_type: token_type,
                            decimals: Math.pow(10, parseInt(swftc_coin.coinDecimal)),
                            cmc_id: Boolean.false,
                            is_on_cmc: Boolean.true,
                            token_address: swftc_coin.contact,
                            for_swap: Boolean.true,
                            added_by: ADDED_BY.admin
                        })
                        console.log("Update in redis")

                        let tokenType: any = (coin_family == 1) ? TOKENS.BEP721 : (coin_family == 2 || coin_family == 4) ? TOKENS.ERC721 : TOKENS.ERC721

                        let tokens: any = await Coins.CoinsRead.findAll({
                            attributes: ["coin_id", "coin_name", "coin_symbol", "mainnet_token_address", "coin_gicko_alias", "coin_image", "coin_family", "coin_status", "is_token", "token_type", "decimals", "cmc_id", "is_on_cmc", "usd_price", "withdraw_limit", "token_abi", "uuid", "token_address", "for_swap", "added_by", "created_at", "updated_at"],
                            where: {
                                coin_status: 1,
                                coin_family: coin_family,
                                [Op.or]: [{ token_type: { [Op.ne]: tokenType } }, { token_type: null }]
                            },
                            raw: true
                        })
                        console.log("Finded all coins successfully.")
                        let set_coins: any = (coin_family == 1) ? config.TOKENS.BSC_TOKEN_TYPE : (coin_family == 2) ? config.TOKENS.ETH_TOKEN_TYPE : (coin_family == 4) ? config.TOKENS.POL_TOKEN_TYPE : (coin_family == 5) ? config.TOKENS.SOL_TOKEN_TYPE : config.TOKENS.TRX_TOKEN_TYPE;

                        redisClient.client_write.set(set_coins || "", JSON.stringify(tokens));
                        console.log("Updated successfully.")

                    } else {
                        await Coins.CoinsWrite.update({
                            added_by: ADDED_BY.admin
                        }, {
                            where: {
                                coin_id: coins_data.coin_id
                            }
                        })
                    }

                    let web3_object: any = '';
                    let depositQuery: any = null;
                    if (coin_family == COIN_FAMILY.ETH) {
                        web3_object = this.Eth_Web3_Url;
                        depositQuery = await redisClient.getKeyValuePair(`${config.ETH_WALLET_ADDRESS}`, destinationAddr.toUpperCase())
                    } else if (coin_family == COIN_FAMILY.POL) {
                        web3_object = this.Pol_Web3_Url;
                        depositQuery = await redisClient.getKeyValuePair(`${config.POL_WALLET_ADDRESS}`, destinationAddr.toUpperCase())
                    } else if (coin_family == COIN_FAMILY.TRX) {
                        depositQuery = await redisClient.getKeyValuePair(`${config.TRON_WALLET_ADDRESS}`, destinationAddr.toUpperCase())
                    } else if (coin_family == COIN_FAMILY.SOL) {
                        depositQuery = await redisClient.getKeyValuePair(`${config.SOL_WALLET_ADDRESS}`, destinationAddr.toUpperCase())
                    } else if (coin_family == COIN_FAMILY.BTC) {
                        depositQuery = await redisClient.getKeyValuePair(`${config.BTC_WALLET_ADDRESS}`, destinationAddr.toUpperCase())
                    } else if (coin_family == COIN_FAMILY.BNB) {
                        console.log('${config.BSC_WALLET_ADDRESS', config.BSC_WALLET_ADDRESS);
                        web3_object = this.Bnb_Web3_Url;
                        depositQuery = await redisClient.getKeyValuePair(`${config.BSC_WALLET_ADDRESS}`, destinationAddr.toUpperCase())
                        console.log('depositQuery', depositQuery);

                    }
                    console.log("cross chain  123>>>>>>>>>>>>>>>>>.")

                    if (depositQuery) {
                        console.log("cross chain  456>>>>>>>>>>>>>>>>>.")
                        // let depositAddressData = JSON.parse(depositQuery);
                        let amount = res_data.receiveCoinAmt;
                        let transactionId = res_data.transactionId;
                        let tran_exist: any = await TrnxHistoryModel.findOne({
                            attributes: ["id", "to_adrs"],
                            where: {
                                tx_id: transactionId
                            },
                            raw: true
                        })
                        let wallet_data: any = await Wallets.WalletRead.findOne({
                            attributes: ["user_id"],
                            where: {
                                wallet_address: destinationAddr
                            },
                            raw: true
                        })
                        let to_user_id: any = wallet_data.user_id
                        if (tran_exist == null) {
                            let from_address = '';
                            let gasReverted: number | undefined = 0;
                            let gas_price: number = 0;
                            let gasUsed: number = 0;
                            let blockId: number = 0;
                            let transaction_fee: number = 0;
                            let userBalance: number | null = 0;
                            let trans_status: any = false;
                            /** for ETH/BSC/POL */
                            console.log('coin_family >>>', coin_family);
                            if (coin_family == COIN_FAMILY.ETH || coin_family == COIN_FAMILY.BNB || coin_family == COIN_FAMILY.POL) {
                                let { getTransaction, getTransactionReceipt } = web3_object.eth;
                                const transactionReceipt = await getTransactionReceipt(transactionId);
                                // console.log('transactionReceipt >>>', transactionReceipt);
                                if (transactionReceipt && transactionReceipt?.status && transactionReceipt?.blockHash != null) {
                                    trans_status = true;
                                    const transaction = await getTransaction(transactionId);
                                    from_address = transaction.from;

                                    gasUsed = transactionReceipt.gasUsed
                                        ? transactionReceipt.gasUsed
                                        : 0;
                                    const gasPrice = parseFloat(transaction.gasPrice) || 0;
                                    const gasTotal = transaction.gas || 0;
                                    if (gasTotal > 0 && gasUsed > 0) {
                                        const gasDiff = gasTotal - gasUsed;
                                        gasReverted = gasPrice * gasDiff;
                                    }
                                    gas_price = web3_object.utils.fromWei(gasPrice.toString(), 'Gwei');
                                    blockId = transaction.blockNumber
                                }
                                if (swftc_coin.contact !== null && swftc_coin.contact !== '') {
                                    /** User ERC-20 token Balance */
                                    let balance = await blockchain_helper.getUserERC20TokenBalance(swftc_coin.contact, config.CONTRACT_ABI as AbiItem[], destinationAddr, web3_object)

                                    userBalance = balance !== null ? Number(balance) : null;

                                } else {
                                    /** User Native Coin Balance */
                                    let balance = await blockchain_helper.get_balance(destinationAddr, web3_object, true);
                                    userBalance = balance !== null ? Number(balance) : null;
                                }
                                /** for BTC */
                            } else if (coin_family == COIN_FAMILY.BTC) {
                                let transaction = await non_evm_helper.getTransactionById(transactionId)
                                // let btc_config: any = {
                                //     method: 'get',
                                //     url: `${config.NODE.BTC_RPC_URL}api/v2/tx/${transactionId}`,
                                //     headers: {
                                //         'apikey': `${config.NODE.BTC_API_KEY}`,
                                //         'Content-Type': 'application/json',
                                //     }
                                // };
                                // const response = await axios(btc_config);
                                //let transaction = response.data;
                                if (
                                    transaction.confirmations != undefined &&
                                    transaction.confirmations !== 2
                                ) {
                                    trans_status = true;
                                }

                                let userBtcBaldata: number | null = await non_evm_helper.get_user_btc_balance(destinationAddr);

                                userBalance = userBtcBaldata ? Number(userBtcBaldata) : null;
                                /** for Tron */
                            } else if (coin_family == COIN_FAMILY.SOL) {
                                console.log('solana transaction');
                                const transaction = await NonEvmHelper.getTransaction(transactionId);
                                console.log('transaction >>>.', transaction);
                                if (transaction) {
                                    if (transaction.meta.err == null) {
                                        trans_status = true;
                                        from_address = transaction.transaction.message.accountKeys[0];
                                        blockId = transaction?.slot;
                                        transaction_fee = Number(await exponentialToDecimal(
                                            await bigNumberSafeMath(transaction.meta.fee, "/", Math.pow(10, 9))
                                        ));
                                    }
                                }
                                if (swftc_coin.contact !== null && swftc_coin.contact !== '') {
                                    /** User Solana token Balance */
                                    userBalance = await NonEvmHelper.getUserCRC20TokenBalance(swftc_coin.contact, destinationAddr);
                                } else {
                                    /** User Solana Balance */
                                    userBalance = Number(await NonEvmHelper.getUserSolanaBalance(destinationAddr, true));
                                }
                            } else if (coin_family == COIN_FAMILY.TRX) {
                                let transactionData: { status: boolean, fromAddress: string, blockId: number } = await non_evm_helper.getTransactionInfo(transactionId);
                                if (transactionData.status) {
                                    from_address = transactionData.fromAddress
                                    blockId = transactionData.blockId
                                    if (swftc_coin.contact !== null && swftc_coin.contact !== '') {
                                        console.log('swftc_coin.contact >>>>>', swftc_coin.contact);
                                        let tron_bal = await non_evm_helper.Fetch_Balance(destinationAddr, Boolean.true, swftc_coin.contact)
                                        userBalance = tron_bal !== null ? Number(tron_bal) : null;;
                                    } else {
                                        let tron_bal = await non_evm_helper.Fetch_Balance(destinationAddr, Boolean.false, swftc_coin.contact);
                                        userBalance = tron_bal !== null ? Number(tron_bal) : null;;
                                    }
                                    trans_status = true
                                }

                            }
                            console.log('trans_status >>>', trans_status);
                            if (trans_status) {
                                const trnx_type: string = 'deposit';
                                let history_data: any = {
                                    user_id: 0,
                                    to_user_id: to_user_id,
                                    type: trnx_type,
                                    req_type: 'APP',
                                    from_adrs: from_address,
                                    to_adrs: destinationAddr,
                                    tx_id: transactionId,
                                    status: 'completed',
                                    blockchain_status: 'confirmed',
                                    coin_id: coins_data.coin_id,
                                    coin_family: coin_family,
                                    amount: amount,
                                    fiat_price: null,
                                    fiat_type: 'USD',
                                    gas_limit: null,
                                    gas_price: gas_price,
                                    gas_reverted: gasReverted,
                                    block_id: blockId,
                                    tx_fee: transaction_fee !== 0 ? transaction_fee : null
                                }
                                let history_crated_data = await TrnxHistoryModel.create(history_data);
                                let row_id = history_crated_data.id;
                                await TrnxHistoryModel.update({ order_status: SWFTC_STATUS.COMPLETED, order_failed_reason: null }, { where: { id: data.id } });
                                console.log("in create order id >>>", data.order_id)

                                await cross_chain_helper.insert_profit_in_admin_table(res_data, data.order_id, to_user_id)
                                // console.log('dddddddddddddddddddddddddddddd>>>>');
                                let wallet_data_exist: any = await Wallets.WalletRead.findOne({
                                    attributes: ["wallet_id"],
                                    where: {
                                        coin_id: coins_data.coin_id,
                                        wallet_address: destinationAddr
                                    },
                                    raw: true,
                                    // logging: true
                                });
                                console.log('wallet_data_exist>>>>', wallet_data_exist);
                                if (!wallet_data_exist) {
                                    let walletData: any = await Wallets.WalletRead.findOne({
                                        where: {
                                            wallet_address: destinationAddr
                                        },
                                        limit: 1,
                                        raw: true
                                    })
                                    // console.log("balance>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", userBalance)
                                    await Wallets.WalletWrite.create({
                                        user_id: walletData.user_id,
                                        // email: walletData.email,
                                        // login_type: walletData.login_type,
                                        // social_id: walletData.social_id,
                                        wallet_name: walletData.wallet_name,
                                        wallet_address: walletData.wallet_address,
                                        coin_id: coins_data.coin_id,
                                        coin_family: coin_family,
                                        balance: userBalance || 0,
                                        balance_blocked: walletData.balance_blocked,
                                        user_withdraw_limit: walletData.user_withdraw_limit,
                                        default_wallet: walletData.default_wallet,
                                        is_verified: walletData.is_verified,
                                        status: 1,
                                        is_deleted: walletData.is_deleted,
                                        sort_order: null,
                                        is_private_wallet: walletData.is_private_wallet

                                    })
                                } else {

                                    // console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>balance>>>>>>>>>", userBalance)
                                    if (userBalance !== null) {
                                        await Wallets.WalletWrite.update({
                                            balance: userBalance
                                        }, {
                                            where: { coin_id: coins_data.coin_id, wallet_address: destinationAddr }
                                        })
                                    }

                                }
                                /** save notification */
                                let deposit_notification_exist: any = await NotificationModel.findOne({ attributes: ['notification_id', 'tx_type'], where: { wallet_address: { [Op.like]: destinationAddr }, tx_id: row_id, tx_type: 'deposit' } });
                                if (!deposit_notification_exist) {
                                    let am = amount.toString();
                                    let value: any = new BigNumber(am);
                                    value = value.toFixed()
                                    let notiMsg = `Deposit of ${value} ${coin_symbol} has been confirmed.`
                                    let notificationData: any = {
                                        message: notiMsg,
                                        amount: Number(amount),
                                        alert_price: null,
                                        fiat_type: null,
                                        from_user_id: 0,
                                        to_user_id: to_user_id,
                                        notification_type: 'Deposit',
                                        tx_id: row_id,
                                        tx_type: 'deposit',
                                        coin_symbol: coin_symbol,
                                        coin_family: coin_family,
                                        coin_id: coins_data.coin_id,
                                        resent_count: null,
                                        view_status: null,
                                        state: 'sent',
                                        coin_price_in_usd: null,
                                        wallet_address: destinationAddr,
                                        created_at: new Date(),
                                        updated_at: new Date()
                                    };
                                    await NotificationModel.create(notificationData);
                                    /** send push notification */
                                    let device_token_data: any = await GetDeviceTokens(to_user_id, destinationAddr, coin_family);
                                    if (device_token_data?.length > 0) {
                                        let dataNoti: any = {
                                            token: device_token_data,
                                            title: 'DEPOSIT',
                                            message: notiMsg,
                                            notification_type: 'deposit',
                                            tx_id: row_id,
                                            tx_type: 'DEPOSIT',
                                        };
                                        await sendNotification(dataNoti);
                                    }
                                }
                            } else {
                                console.log('Transaction not getting from blockchain');
                            }
                        } else {
                            await TrnxHistoryModel.update({ order_status: SWFTC_STATUS.COMPLETED, order_failed_reason: null }, { where: { id: data.id } })
                            console.log("in update order id >>>", data.order_id)
                            await cross_chain_helper.insert_profit_in_admin_table(res_data, data.order_id, to_user_id)
                        }

                    } else {
                        console.log('depositQuery address found >>>>>>>>>.', depositQuery);
                    }


                } else {
                    // console.log('swftc_coin not found >>>>>>>>>.', swftc_coin);
                }

            } else {
                // console.log('res_data.detailState >>>>>>>>>.', res_data?.detailState);
                if (res_data?.detailState == SWFTC_RESPONSE.WAIT_DEPOSIT || res_data?.detailState == SWFTC_RESPONSE.WAIT_PUSH || res_data?.detailState == SWFTC_RESPONSE.WAIT_RETURN || res_data?.detailState == SWFTC_RESPONSE.WAIT_REC_SEND || res_data?.detailState == SWFTC_RESPONSE.WAIT_REC_CONFIRM || res_data?.detailState == SWFTC_RESPONSE.WAIT_SEND || res_data?.detailState == SWFTC_RESPONSE.WAIT_CONFIRM || res_data?.detailState == SWFTC_RESPONSE.ERROR) {
                    await TrnxHistoryModel.update({ order_status: SWFTC_STATUS.PENDING, order_failed_reason: res_data?.detailState }, { where: { id: data.id } });
                } else if (res_data?.detailState == SWFTC_RESPONSE.REFRESH_COMPLETE || res_data?.detailState == SWFTC_RESPONSE.WAIT_KYC || res_data?.detailState == SWFTC_RESPONSE.TIMEOUT || res_data?.detailState == SWFTC_RESPONSE.REFUND_COMPLETE) {
                    await TrnxHistoryModel.update({ order_status: SWFTC_STATUS.FAILED, order_failed_reason: res_data?.detailState }, { where: { id: data.id } });
                }
            }

        } catch (err: any) {
            console.error('💥 ~ ~ getOrderDetail error', err)
        }
    }

}

const cosnumeCrossChainTxProcess = new CosnumeCrossChainTxProcess();
export default cosnumeCrossChainTxProcess;
//export const cosnumeCrossChainTxProcess = new CosnumeCrossChainTxProcess();

