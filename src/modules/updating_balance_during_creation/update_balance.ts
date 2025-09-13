import { config } from "../../config";
import { Coins, Wallets } from '.././../models/model/index';
import kafkaHelper from "../../helpers/common/kafka.helper";

import etherJs from "../../helpers/common/web3.helper";
import blockchain_helper from "../../helpers/common/blockchain.helper";
import non_evm_helper from "../../helpers/common/non.evm.helper";
import redisClient from "../../helpers/common/redis";
import { ethers } from "ethers";
import { Op } from "sequelize";

class UpdateBalanceController {
    public Eth_Ether_Url: ethers.JsonRpcProvider;
    public Bsc_Ether_Url: ethers.JsonRpcProvider;
    public Pol_Ether_Url: ethers.JsonRpcProvider;

    constructor() {
        this.Eth_Ether_Url = etherJs.etherEth;
        this.Bsc_Ether_Url = etherJs.etherBsc;
        this.Pol_Ether_Url = etherJs.etherPol;
    }
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

    public updateCoinDecimals = async () => {
        try {
            // let coin_limit_count = 0;
            const limit = 25;
            // const findCoinCounter = await redisClient.getKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, 'coin_decimals')
            // console.log("🚀 ~ updateCoinDecimals ~ findCoinCounter:", findCoinCounter)

            // if (findCoinCounter) {
            //     coin_limit_count = Number(findCoinCounter);
            // }
            // console.log("🚀 ~ updateCoinDecimals ~ :", coin_limit_count)
            const coins: any = await Coins.CoinsRead.findAll({
                attributes: ['coin_id', 'is_token', 'token_address', 'coin_family', 'decimals', 'token_type', 'coin_symbol', 'added_by', 'for_swap'],
                where: {
                    decimals: 0,
                    is_token: 1,
                    token_type: { [Op.notIn]: ['ERC721', 'ERC1155'] }
                },
                limit,
                offset: 0,
                logging: true
            });

            if (!coins) {
                await redisClient.setKeyValuePair(config.REDISKEYS.COIN_LIMIT_COUNTS, 'coin_decimals', '0')
            }
            if (coins.length > 0) {
                let decimals: number = 0;
                for (const coin of coins) {
                    if (coin.coin_family == 2) {
                        const token_data: any = await blockchain_helper.searchTokenNew(coin.token_address, config.CONTRACT_ABI, this.Eth_Ether_Url)
                        decimals = Math.pow(10, parseInt(token_data?.decimals))
                    } else if (coin.coin_family == 1) {
                        const token_data: any = await blockchain_helper.searchTokenNew(coin.token_address, config.CONTRACT_ABI, this.Bsc_Ether_Url)
                        decimals = Math.pow(10, parseInt(token_data?.decimals))
                    } else if (coin.coin_family == 4) {
                        const token_data: any = await blockchain_helper.searchTokenNew(coin.token_address, config.CONTRACT_ABI, this.Pol_Ether_Url)
                        decimals = Math.pow(10, parseInt(token_data?.decimals))
                    } 
                    if (decimals > 0) {
                        await Coins.CoinsWrite.update({ decimals: decimals }, { where: { coin_id: coin.coin_id } });

                        const redisCoinData = {
                            coin_id: coin.coin_id,
                            is_token: coin.is_token,
                            token_address: coin.token_address,
                            coin_family: coin.coin_family,
                            decimals: decimals,
                            token_type: coin.token_type,
                            coin_symbol: coin.coin_symbol,
                            added_by: coin.added_by,
                            for_swap: coin.for_swap
                        }
                        // await WalletHelper.update_token_in_redis(coinData, 0);
                        await this.update_token_in_redis_hash(redisCoinData)

                    }

                }
            }
            console.log("\nEND")
            return true;
        } catch (err: any) {
            console.error("Error in updateWalletBalanceByWallet", err)
        }
    };

    public async update_token_in_redis_hash(coin_data: any) {
        try {
            switch (coin_data.coin_family) {
                case config.STATIC_COIN_FAMILY.BNB:
                    console.log('tttttttttttttttttt', config.TOKENS.BSC_TOKEN_TYPE, '----------', coin_data.token_address);
                    await redisClient.set_hash_table(
                        config.TOKENS.BSC_TOKEN_TYPE,
                        coin_data.token_address,
                        JSON.stringify(coin_data)
                    );
                    break;
                case config.STATIC_COIN_FAMILY.POL:
                    await redisClient.set_hash_table(
                        config.TOKENS.POL_TOKEN_TYPE,
                        coin_data.token_address,
                        JSON.stringify(coin_data)
                    );
                case config.STATIC_COIN_FAMILY.TICS:
                    await redisClient.set_hash_table(
                        config.TOKENS.TICS_TOKEN_TYPE,
                        coin_data.token_address,
                        JSON.stringify(coin_data)
                    );
                case config.STATIC_COIN_FAMILY.SOL:
                    await redisClient.set_hash_table(
                        config.TOKENS.SOL_TOKEN_TYPE,
                        coin_data.token_address,
                        JSON.stringify(coin_data)
                    );
                    break;
                case config.STATIC_COIN_FAMILY.TRX:
                    await redisClient.set_hash_table(
                        config.TOKENS.TRX_TOKEN_TYPE,
                        coin_data.token_address,
                        JSON.stringify(coin_data)
                    );
                    break;
                default:
                    await redisClient.set_hash_table(
                        config.TOKENS.ETH_TOKEN_TYPE,
                        coin_data.token_address,
                        JSON.stringify(coin_data)
                    );
                    break;
            }
        } catch (err: any) {
            console.error("Error in update_token_in_redis_hash.", err);
            return null;
        }

    }
}
const update_balance_controller = new UpdateBalanceController();
export default update_balance_controller;