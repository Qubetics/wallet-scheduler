import { config } from "../../config";
import { Wallets } from '.././../models/model/index';
import kafkaHelper from "../../helpers/common/kafka.helper";

import etherJs from "../../helpers/common/web3.helper";
import blockchain_helper from "../../helpers/common/blockchain.helper";
import non_evm_helper from "../../helpers/common/non.evm.helper";

class UpdateBalanceController {
    public async update_wallet_balance() {
        console.log('config.BACKEND_WALLET_BALANCE_ADDRESSES_TOPIC', config.BACKEND_WALLET_BALANCE_ADDRESSES_TOPIC);

        let consumer = await kafkaHelper.kafka.consumer({ groupId: config.BACKEND_WALLET_BALANCE_ADDRESSES_GROUP_ID });
        await consumer.subscribe({ topic: config.BACKEND_WALLET_BALANCE_ADDRESSES_TOPIC, fromBeginning: true });

        await consumer.run({
            eachMessage: ({ topic, partition, message }: { topic: any, partition: any, message: any }) => {
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
                                config.CONTRACT_ABI,
                                wallet_address,
                                etherJs.etherEth
                            );
                        balance = fetch_balance ? fetch_balance.toString : "0";
                    } else {
                        let fetch_balance = await blockchain_helper.get_balance(wallet_address, etherJs.etherEth, true);
                        balance = fetch_balance ? fetch_balance.toString : "0";
                    }
                    console.log("eth balance", balance);
                    break;
                case config.STATIC_COIN_FAMILY.BNB:
                    console.log("bnb bnb");
                    if (coin_data.is_token) {
                        let fetch_balance =
                            await blockchain_helper.getUserERC20TokenBalance(
                                coin_data.token_address,
                                config.CONTRACT_ABI,
                                wallet_address,
                                etherJs.etherBsc
                            );
                        balance = fetch_balance ? fetch_balance.toString : "0";
                    } else {
                        let fetch_balance = blockchain_helper.get_balance(wallet_address, etherJs.etherBsc, true).toString();
                        balance = fetch_balance ? fetch_balance.toString : "0";
                    }
                    console.log("bnb balance", balance);
                    break;
                case config.STATIC_COIN_FAMILY.BTC:
                    console.log("btc btc");
                    let fetch_balance = await non_evm_helper.get_user_btc_balance(wallet_address);
                    balance = fetch_balance ? fetch_balance.toString : "0";
                    console.log("btc balance", balance);
                    break;
                case config.STATIC_COIN_FAMILY.TRX:
                    console.log("trx trx");
                    let trx_fetch_balance = await non_evm_helper.Fetch_Balance(wallet_address, coin_data.is_token, coin_data?.token_address);

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
}
const update_balance_controller = new UpdateBalanceController();
export default update_balance_controller;