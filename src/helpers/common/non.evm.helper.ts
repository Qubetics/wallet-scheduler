import axios from "axios";
import { TronWeb } from 'tronweb';
import { config } from "../../config";

import { exponentialToDecimal } from "../common/globalFunctions";
import { Boolean } from "../../constants";
import { PublicKey, Connection } from "@solana/web3.js"
import { AccountLayout } from "@solana/spl-token";
const spltokenReg = require("@solana/spl-token-registry");
import {
    mplTokenMetadata,
    fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";


class NonEvmHelpers {
    public TRX_FULLNODE: string = config.NODE.TRX_RPC_URL
    public BTC_RPC_URL: string = config.NODE.BTC_RPC_URL
    public tronWeb: any;
    public connection: Connection;
    public connectionNew: Connection;

    public config: any;

    constructor() {
        this.tronWeb = new TronWeb({
            fullHost: this.TRX_FULLNODE,
            headers: { apikey: config.NODE.TRX_API_KEY }
        });

        this.config = {
            method: 'get',
            headers: {
                'apikey': `${config.NODE.BTC_API_KEY}`,
                'Content-Type': 'application/json',
            }
        };
        this.connection = new Connection(config.NODE.SOL_RPC_URL || '', 'confirmed');
        this.connectionNew = new Connection(`https://api.tatum.io/v3/blockchain/node/solana-mainnet/${config.TATUM_SOLANA_KEY}`, 'confirmed');

    }
    /** start btc functions */
    public getTransactionById = async (transactionId: string) => {
        try {
            this.config.url = `${this.BTC_RPC_URL}api/v2/tx/${transactionId}`
            const response = await axios(this.config);
            return response.data;
        } catch (error) {
            console.error('🔥 ~ ~ getTransactionById error', error);
            return null;
        }
    }

    public async get_user_btc_balance(address: string) {
        try {
            this.config.url = `${this.BTC_RPC_URL}api/v2/address/${address}`
            const result = await axios(this.config);
            let balance: number | null = result.data.balance ? Number(result.data.balance) : 0
            if (balance > 0) {
                balance = balance / 100000000;
            } else {
                balance = null;
            }
            console.log('🚀 ~ ~ get_user_btc_balance', balance);
            return balance;
        } catch (err) {
            console.log('🔥 ~ ~ get_user_btc_balance err', err);
            return null;
        }
    }
    /** end btc functions */

    /** start tron functions */

    public async Fetch_Balance(address: string, is_token: Boolean, token_address: string | null) {
        try {
            let balance: number | null = 0;
            if (is_token == Boolean.true) {
                balance = await this.TRC20_Token_Balance(address, token_address)
            } else {
                balance = await this.Coin_Fetch_Balance(address);
            }
            return balance;
        } catch (err: any) {
            console.error(`Error in Fetch_Balance of tron. `, err);
            return null;
        }
    }

    public async TRC20_Token_Balance(address: string, contract_address: string | null | undefined) {
        try {
            await this.tronWeb.setAddress(contract_address);
            let contract: any = await this.tronWeb.contract(config.TRON_ABI, contract_address);

            // tronweb 6 returns uint values as bigint (older versions returned numbers and BigNumber objects)
            let decimals: number = Number((await contract.decimals().call()).toString());

            let balanceOf: any = await contract.balanceOf(address).call();
            let toDecimal: any;
            if (typeof balanceOf === 'bigint') {
                toDecimal = balanceOf.toString();
            } else if (balanceOf._hex != undefined) {
                toDecimal = await this.tronWeb.toDecimal(balanceOf._hex);
            } else {
                toDecimal = await this.tronWeb.toDecimal(balanceOf.balance._hex);
            }
            let expToDecimal: string = await exponentialToDecimal(toDecimal);
            let balance: number = Number(expToDecimal) / Math.pow(10, decimals);
            return balance;
        } catch (err: any) {
            console.error(`Tron_Helper TRC20_Token_Balance error >>`, err);
            return null;
        }
    }

    public async Coin_Fetch_Balance(address: string) {
        try {
            return await this.tronWeb.trx.getBalance(address).then(async (result: any) => {
                return await this.tronWeb.fromSun(result);
            });
        } catch (err: any) {
            console.error(`Non-Evm Helper Coin_Fetch_Balance error >>`, err);
            return null;
        }
    }

    public async getTransactionInfo(transactionId: string) {
        let fromAddress: string = 'INTERNAL';
        let blockId: number = 0
        try {
            const transaction: any = await this.tronWeb.trx.getTransaction(transactionId);
            const tx: any = transaction;
            if (tx.ret.length > 0 && tx.ret[0].contractRet == 'SUCCESS') {
                if (
                    tx?.raw_data &&
                    tx?.raw_data.contract[0].type == 'TransferContract'
                ) {
                    fromAddress = await this.tronWeb.address.fromHex(
                        tx.raw_data.contract[0].parameter.value.owner_address
                    );
                    blockId = 0

                } else if (
                    tx?.raw_data &&
                    tx?.raw_data.contract[0].type == 'TriggerSmartContract'
                ) {
                    console.log("TriggerSmartContract>>>>", tx?.raw_data.contract[0])

                    const fromAddressHex = tx?.raw_data.contract[0]?.parameter?.value?.owner_address;
                    fromAddress = await this.tronWeb.address.fromHex(fromAddressHex);


                    const transactionInfo = await this.tronWeb.trx.getTransactionInfo(
                        tx.txID
                    );
                    console.log("fromAddress>>>>>>>>>>>>", fromAddress)

                    blockId = transactionInfo.blockNumber;

                } else if (
                    tx.raw_data.contract[0].type == 'TransferAssetContract'
                ) {
                    console.log("TransferAssetContract>>>>", tx.raw_data.contract[0])
                    fromAddress = await this.tronWeb.address.fromHex(
                        tx.raw_data.contract[0].parameter.value.owner_address
                    );
                    blockId = 0;
                }
                return { status: true, fromAddress: fromAddress, blockId: blockId };
            } else {
                return { status: false, fromAddress: fromAddress, blockId: blockId };
            }
        } catch (err: any) {
            console.error("error in getTransactionInfo in tron>>>.", err)
            return { status: false, fromAddress: fromAddress, blockId: blockId };
        }
    }
    public async searchToken(
        trc20ContractAddress: string
    ) {
        try {
            await this.tronWeb.setAddress(trc20ContractAddress);

            const contract: any = await this.tronWeb.contract(config.TRON_ABI, trc20ContractAddress);

            const coinName = await contract.name().call();
            const coinSymbol = await contract.symbol().call();
            const decimals = await contract.decimals().call();

            const data: any = {
                name: coinName,
                symbol: coinSymbol,
                decimals: decimals.toString(),
            };
            if (decimals._hex != undefined) {
                data.decimals = await this.tronWeb.toDecimal(decimals._hex);
                data.decimals = data.decimals.toStringfy();
            }
            return data;
        } catch (error: any) {
            console.error("trigger smart contract error", error);
            return null
        }
    }
    /** end tron functions */

    /** start solana functions */
    public async getUserSolanaBalance(wallet: string, inSolana: boolean): Promise<string | number> {
        try {
            const balanceInWei = await this.connection.getBalance(new PublicKey(wallet));
            if (inSolana == true) {
                return Number(balanceInWei / 1000000000);
            }
            return balanceInWei;
        } catch (err) {
            console.log("🔥 ~ ~ getUserSolanaBalance error", err);
            return 0;
        }
    }

    /* Get Wallet Toekn balance */
    public async getUserCRC20TokenBalance(tokenAddress: string, walletAddress: string): Promise<number> {
        try {
            const walletPublicKey = new PublicKey(walletAddress);
            const mintPublicKey = new PublicKey(tokenAddress);
            const tokenAccounts = await this.connectionNew.getTokenAccountsByOwner(walletPublicKey, {
                mint: mintPublicKey,
            });
            if (tokenAccounts.value?.length > 0) {
                const tokenAccount = tokenAccounts.value[0].account;
                const tokenAccountInfo = AccountLayout.decode(tokenAccount.data);
                const amount = tokenAccountInfo.amount;
                const mintInfo: any = await this.connectionNew.getParsedAccountInfo(mintPublicKey);
                const decimals = mintInfo.value.data.parsed.info.decimals;
                const balance = Number(amount) / (10 ** decimals);
                return balance;
            } else {
                return 0;
            }
        } catch (error: any) {
            console.log("🔥 ~ ~ getUserCRC20TokenBalance error", error);
            return 0;
        }
    }

    public rpcCall = async (body: {}) => {
        try {
            const result = async (resolve: any, reject: any) => {
                const options = { headers: { "Content-Type": "application/json" } };
                axios.post(`${config.NODE.SOL_RPC_URL}`, body, options).then((data: any) => {
                    if (data.status == 200) {
                        resolve(data.data.result);
                    } else {
                        reject(false);
                    }
                }).catch((error) => {
                    console.error("Axios rpcCall error:", error?.message || error);
                    reject(false);
                });
            };
            return new Promise(result);
        } catch (error: any) {
            console.log('🔥 ~ ~ rpcCall error', error);
            return error.message;
        }
    }
    public rpcPublicCall = async (body: {}) => {
        try {
            const result = async (resolve: any, reject: any) => {
                const options = { headers: { "Content-Type": "application/json" } };
                axios.post(`https://api.mainnet-beta.solana.com`, body, options).then((data: any) => {
                    if (data.status == 200) {
                        resolve(data.data.result);
                    } else {
                        reject(false);
                    }
                }).catch((error) => {
                    console.error("Axios rpcPublicCall error:", error?.message || error);
                    reject(false);
                });
            };
            return new Promise(result);
        } catch (error: any) {
            console.log('🔥 ~ ~ rpcCall error', error);
            return error.message;
        }
    }

    public getTransaction = async (tx_id: string) => {
        try {
            let rpcJson = {
                jsonrpc: "2.0",
                id: 1,
                method: "getTransaction",
                params: [tx_id],
            };
            return await NonEvmHelper
                .rpcCall(rpcJson)
                .then(async (result) => {
                    if (!result) {
                        return await NonEvmHelper
                            .rpcPublicCall(rpcJson)
                            .then((pubResult) => {
                                return pubResult;
                            }).catch((err) => {
                                console.log("💥 ~ ~ getTransaction solWeb3 error", err);
                                return false;
                            });

                    }
                    return result;
                }).catch(async (err) => {
                    console.log("💥 ~ ~ getTransaction solWeb3 error", err);
                    return await NonEvmHelper
                        .rpcPublicCall(rpcJson)
                        .then((result) => {
                            return result;
                        }).catch((err) => {
                            console.log("💥 ~ ~ getTransaction solWeb3 error", err);
                            return false;
                        });
                });
        } catch (error: any) {
            console.log("🔥 ~ ~ getTransaction error", error);
            return error.message;
        }
    };

    public searchSolToken = async (token_address: string) => {
        try {
            const umi = createUmi(config.NODE.SOL_RPC_URL).use(mplTokenMetadata());
            const myPublicKey = publicKey(token_address);
            const asset = await fetchDigitalAsset(umi, myPublicKey);
            const tokenData: any = {
                name: asset?.metadata?.name,
                symbol: asset?.metadata?.symbol,
                decimals: asset?.mint?.decimals,
            };
            if (tokenData) {
                return tokenData;
            } else {
                const tokenList = await new spltokenReg.TokenListProvider()
                    .resolve()
                    .then((tokens: any) => {
                        return tokens.filterByClusterSlug("mainnet-beta").getList();
                    });
                const foundToken = await tokenList.find(
                    (token: any) => token.address == token_address
                );
                return foundToken;
            }
        } catch (error) {
            console.log("🔥 ~ ~ searchToken node.solana.helper.ts error", error);
        }
    };
    /** end of solana functions */

}

const NonEvmHelper = new NonEvmHelpers();
export default NonEvmHelper;
