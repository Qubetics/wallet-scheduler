import { config } from "../../config";
import { Wallets } from '.././../models/model/index';
// import redisClient from "../../helpers/common/redis";
// import NonEvmHelper from "../../helpers/common/non.evm.helper";
// import { RabbitMq } from "../../helpers/common/rabbitmq.helper";
// import { getBalances } from "../../helpers/common/globalFunctions";
import kafkaHelper from "../../helpers/common/kafka.helper";

import web3 from "../../helpers/common/web3.helper";
import blockchain_helper from "../../helpers/common/blockchain.helper";
import non_evm_helper from "../../helpers/common/non.evm.helper";
import { AbiItem } from "web3-utils";

class UpdateBalanceController {
    public async update_wallet_balance() {
        console.log('config.BACKEND_WALLET_BALANCE_ADDRESSES_TOPIC', config.BACKEND_WALLET_BALANCE_ADDRESSES_TOPIC);

        let consumer = await kafkaHelper.kafka.consumer({ groupId: config.BACKEND_WALLET_BALANCE_ADDRESSES_GROUP_ID });
        await consumer.subscribe({ topic: config.BACKEND_WALLET_BALANCE_ADDRESSES_TOPIC, fromBeginning: true });

        await consumer.run({
            eachMessage: ({ topic, partition, message }: { topic: any, partition: any, message: any }) => {
                // console.log("🚀 ~ startBlockTxQueue topic", topic);
                // console.log("🚀 ~ startBlockTxQueue message.value", message.value.toString());
                this.updateBalance(JSON.parse(message.value.toString()))
            }
        }).catch((err: Error) => {
            console.log("🔥 ~ startBlockTxQueue consumer error", err);
        });


    }
    public async updateBalance(data: any) {
        try {
            console.log("Entered into updateBalance", data);
            if (data.queue_count < 10) {
                let balDetails: any = await this.getBalances(data.coin_data, data.wallet_address);
                if (balDetails.status) {
                    await Wallets.WalletWrite.update(
                        { balance: balDetails.balance },
                        { where: { wallet_address: data.wallet_address, coin_id: data.coin_data.coin_id } })
                } else {
                    await kafkaHelper.produceMessage(config.BACKEND_WALLET_BALANCE_ADDRESSES_TOPIC, {
                        coin_data: data.coin_data,
                        wallet_address: data.wallet_address,
                        queue_count: data.queue_count + 1
                    })

                }
            }
        } catch (err: any) {
            console.error("Error in updateBalance", err)
        }
    }

    public async getBalances(coin_data: any, wallet_address: string) {
        try {
            let balance: any = "0";
            switch (coin_data.coin_family) {
                case config.STATIC_COIN_FAMILY.ETH:
                    console.log("eth eth");
                    if (coin_data.is_token) {
                        let fetch_balance =
                            await blockchain_helper.getUserERC20TokenBalance(
                                coin_data.token_address,
                                config.CONTRACT_ABI as AbiItem[],
                                wallet_address,
                                web3.eth_web3
                            );
                        balance = fetch_balance ? fetch_balance.toString : "0";
                    } else {
                        let fetch_balance = await blockchain_helper.get_balance(wallet_address, web3.eth_web3, true);
                        balance = fetch_balance ? fetch_balance.toString : "0";
                    }
                    console.log("eth balance", balance);
                    // (

                    //   await EthHelper.get_balance(
                    //     coin_data.is_token,
                    //     coin_data.token_address,
                    //     wallet_address
                    //   )
                    // ).toString();
                    break;
                case config.STATIC_COIN_FAMILY.BNB:
                    console.log("bnb bnb");
                    if (coin_data.is_token) {
                        let fetch_balance =
                            await blockchain_helper.getUserERC20TokenBalance(
                                coin_data.token_address,
                                config.CONTRACT_ABI as AbiItem[],
                                wallet_address,
                                web3.bsc_web3
                            );
                        balance = fetch_balance ? fetch_balance.toString : "0";
                    } else {
                        let fetch_balance = blockchain_helper.get_balance(wallet_address, web3.bsc_web3, true).toString();
                        balance = fetch_balance ? fetch_balance.toString : "0";
                    }
                    console.log("bnb balance", balance);
                    // balance = (
                    //   await bnbHelper.get_balance(
                    //     coin_data.is_token,
                    //     coin_data.token_address,
                    //     wallet_address
                    //   )
                    // ).toString();
                    break;
                case config.STATIC_COIN_FAMILY.BTC:
                    console.log("btc btc");
                    // balance = (await NonEvmHelper.get_balance(wallet_address)).toString();
                    let fetch_balance = await non_evm_helper.get_user_btc_balance(wallet_address);
                    balance = fetch_balance ? fetch_balance.toString : "0";
                    console.log("btc balance", balance);
                    break;
                case config.STATIC_COIN_FAMILY.TRX:
                    console.log("trx trx");
                    let trx_fetch_balance = await non_evm_helper.Fetch_Balance(wallet_address, coin_data.is_token, coin_data?.token_address);

                    // balance = (
                    //   await Tron_Helper.TRX_Fetch_Balance(wallet_address, coin_data)
                    // ).toString();
                    balance = trx_fetch_balance ? trx_fetch_balance.toString : "0";
                    console.log("trx balance", balance);
                    break;
            }
            return { status: true, balance: balance };
        } catch (err: any) {
            console.error("Error in UpdateBalance>>>>>.. ", err);
            return { status: false, balance: "0" };
        }
    };

    // public async updateBtcBalances() {
    //     try {
    //         console.log("Enterd into update_balances")
    //         let offset: number = 0;
    //         let limit: number = 8;
    //         let findCoinCounter: any = await redisClient.getKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, `update_btc_balances`);
    //         if (findCoinCounter) {
    //             offset = Number(findCoinCounter);
    //         }
    //         console.log("Enterd into update_balances offset offset>>>>>>>>>>", offset)

    //         let user_wallets: any = await Wallets.WalletRead.findAndCountAll({
    //             attributes: ["wallet_address", "wallet_id"],
    //             where: { coin_family: config.STATIC_COIN_FAMILY.BTC },
    //             order: [['wallet_id', 'ASC']],
    //             limit: limit,
    //             offset: offset
    //         })
    //         if (user_wallets.rows.length > 0) {

    //             console.log("user_wallets.rows.length > 0", user_wallets.rows.length)
    //             console.log("No data in user_wallets table with this limit>>>", limit, "offset>>", offset)
    //             for (let i: number = 0; i < user_wallets.rows.length; i++) {
    //                 let bal = await NonEvmHelper.get_user_btc_balance(user_wallets.rows[i].wallet_address)
    //                 let balance: string | null = bal !== null ? bal.toString() : null
    //                 console.log("wallet_id >>>", user_wallets.rows[i].wallet_id, "wallet_address>>", user_wallets.rows[i].wallet_address, "balance>>", balance)
    //                 if (balance) {
    //                     await Wallets.WalletWrite.update({ balance: balance }, { where: { wallet_id: user_wallets.rows[i].wallet_id } })

    //                     await redisClient.setKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, `update_btc_balances`, (offset + limit).toString());
    //                 }
    //             }
    //         } else {
    //             console.log("not data exist in user_wallets.rows.length")
    //         }
    //     } catch (err: any) {
    //         console.error("Error in updateBtcBalances", err)
    //     }

    // }
    // public async updateUsdtBalances() {
    //     try {
    //         console.log("Enterd into updateUsdtBalances")
    //         let offset: number = 0;
    //         let limit: number = 8;
    //         let findCoinCounter: any = await redisClient.getKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, `update_usdt_balances`);
    //         if (findCoinCounter) {
    //             offset = Number(findCoinCounter);
    //         }
    //         console.log("Enterd into updateUsdtBalances offset offset>>>>>>>>>>", offset)

    //         let user_wallets: any = await Wallets.WalletRead.findAndCountAll({
    //             attributes: ["wallet_address", "wallet_id"],
    //             where: { coin_id: 360 },
    //             order: [['wallet_id', 'ASC']],
    //             limit: limit,
    //             offset: offset
    //         })
    //         if (user_wallets.rows.length > 0) {

    //             console.log("updateUsdtBalances.rows.length > 0", user_wallets.rows.length)
    //             console.log("No data in updateUsdtBalances table with this limit>>>", limit, "offset>>", offset)
    //             for (let i: number = 0; i < user_wallets.rows.length; i++) {
    //                 let bal = await NonEvmHelper.TRC20_Token_Balance(user_wallets.rows[i].wallet_address, 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
    //                 let balance: string | null = bal ? bal.toString() : null;
    //                 console.log("wallet_id >>>", user_wallets.rows[i].wallet_id, "wallet_address>>", user_wallets.rows[i].wallet_address, "balance>>", balance)
    //                 if (balance) {
    //                     await Wallets.WalletWrite.update({ balance: balance }, { where: { wallet_id: user_wallets.rows[i].wallet_id } })
    //                     await redisClient.setKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, `update_usdt_balances`, (offset + limit).toString());
    //                 }
    //             }
    //         } else {
    //             console.log("not data exist in updateUsdtBalances.rows.length")
    //         }
    //     } catch (err: any) {
    //         console.error("Error in updateUsdtBalances", err)
    //     }

    // }

}
const update_balance_controller = new UpdateBalanceController();
export default update_balance_controller;