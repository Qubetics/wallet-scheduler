import TronWeb from 'tronweb';
import { config } from '../../config';
import { exponentialToDecimal } from '../../helpers/common/globalFunctions';



class TronHelper {
    public TRX_FULLNODE: string = config.NODE.TRX_RPC_URL
    public tronWeb: any;

    constructor() {
        this.tronWeb = new TronWeb({
            fullHost: this.TRX_FULLNODE,
            headers: { apikey: config.NODE.TRX_API_KEY }
        });

    }

    public async getTransactionInfo(transactionId: string) {
        let fromAddress: string = 'INTERNAL';
        let blockId: number = 0
        try {
            const transaction: any = await this.tronWeb.trx.getTransaction(transactionId);
            // console.log("tramnsaction >>>>>>>>>>>>>>>>>>>>", transaction)
            let tx: any = transaction;
            if (
                tx?.raw_data &&
                tx?.raw_data.contract[0].type == 'TransferContract'
            ) {
                console.log("TransferContract>>>>")
                if (tx) {
                    fromAddress = await this.tronWeb.address.fromHex(
                        tx.raw_data.contract[0].parameter.value.owner_address
                    );
                    blockId = 0

                }
            } else if (
                tx?.raw_data &&
                tx?.raw_data.contract[0].type == 'TriggerSmartContract'
            ) {
                console.log("TriggerSmartContract>>>>")
                const transactionInfo = await this.tronWeb.trx.getTransactionInfo(
                    tx.txID
                );
                console.log("transactionInfo>>>>>>>.", transactionInfo)
                console.log("transactionInfo.logs>>>>>>>.", transactionInfo.log[0])
                if (transactionInfo.log[0].topics[1]) {
                    console.log("topics 1 exist")
                    const fromAddressHex = transactionInfo.log[0].topics[1].substring(24, transactionInfo.log[0].topics[1].length);
                    console.log("fromAddressHex>>>>>>>>>>>>", fromAddressHex)
                    fromAddress = await this.tronWeb.address.fromHex('41' + fromAddressHex);
                } else {
                    console.log("topics 1 not exist")
                    fromAddress = 'INTERNAL'
                }
                console.log("fromAddress>>>>>>>>>>>>", fromAddress)

                blockId = transactionInfo.blockNumber;

            } else if (
                tx.raw_data.contract[0].type == 'TransferAssetContract'
            ) {
                console.log("TransferAssetContract>>>>")

                if (tx) {
                    fromAddress = await this.tronWeb.address.fromHex(
                        tx.raw_data.contract[0].parameter.value.owner_address
                    );
                }
                blockId = 0

            }
            return { fromAddress, blockId };
        } catch (err: any) {
            console.error("error in getTransactionInfo in tron>>>.", err)
            return { fromAddress, blockId };
        }
    }

    public async searchToken(
        trc20ContractAddress: string
    ) {
        try {
            // console.log("trc20ContractAddress>>", trc20ContractAddress)
            await this.tronWeb.setAddress(trc20ContractAddress);

            let contract = await this.tronWeb.contract().at(trc20ContractAddress);
            // console.log("contract>>", contract)
            const coin_name = await contract.name().call();
            const coin_symbol = await contract.symbol().call();
            const decimals = await contract.decimals().call();

            const data: any = {
                name: coin_name,
                symbol: coin_symbol,
                coin_image: '',
                price_source_slug: 'price_source_slug',
                decimals: decimals.toString(),
            };
            if (decimals._hex != undefined) {
                data.decimals = await this.tronWeb.toDecimal(decimals._hex);
                data.decimals = data.decimals.toStringfy()
                console.log("data.decimals>>>>>", data.decimals)

            }
            console.log("data.decimals>>>>>", data.decimals)

            if (!data) {
                // let trc10ContractAddress: any = trc20ContractAddress
                // contract = await this.tronWeb.trx.getTokenByID(trc10ContractAddress);
                // if (contract) {
                //     const name = contract.name;
                //     console.log("name: ", name);

                //     const symbol = contract.abbr;
                //     console.log("symbol: ", symbol);

                //     const decimals =
                //         contract.precision == undefined ? 1 : contract.precision;
                //     console.log("decimals: ", decimals);

                //     const data: any = {
                //         decimals,
                //         name,
                //         symbol,
                //     };
                // }
                return null;
            }
            return data;
        } catch (error: any) {
            console.error("trigger smart contract error", error);
            return null
        }
    }
    public async TRX_Fetch_Balance(address: string, coin: any) {
        try {
            let balance: number = 0;
            console.log("coin.is_token>>>>>>", coin.is_token)
            console.log("coin.token_type>>>>>>", coin.token_type)
            if (coin.is_token == 1) {
                switch (coin.token_type.toLowerCase()) {
                    case 'trc20':
                        balance = await this.TRC20_Token_Balance(
                            address, //// wallet_address
                            coin.token_address /// contract_address
                        )
                        console.log("balance in token>>>>>>>>", balance)
                        break;
                    // case TokenStandard.TRC10:
                    //    balance = await this.TRC10_Token_Balance(
                    //       address, //// wallet_address
                    //       coin.token_address /// contract_address
                    //    )
                    //    break;
                    default:
                        balance = 0
                        break;
                }
            } else {
                balance = await this.TRX_Coin_Fetch_Balance(address);
            }
            return balance
        } catch (err: any) {
            console.error(`TRON_Helper TRON_Fetch_Balance error >>`, err);
            throw err;
        }
    }
    public async TRC20_Token_Balance(address: string, contract_address: string) {
        try {
            await this.tronWeb.setAddress(contract_address);
            let contract = await this.tronWeb.contract().at(contract_address);
            let decimals = await contract.decimals().call();
            if (decimals._hex != undefined) {
                decimals = await this.tronWeb.toDecimal(decimals._hex);
            }
            let balanceOf = await contract.balanceOf(address).call();
            let toDecimal = await this.tronWeb.toDecimal(balanceOf._hex);
            if (balanceOf._hex == undefined) {
                toDecimal = await this.tronWeb.toDecimal(
                    balanceOf.balance._hex
                );
            }
            let expToDecimal = await exponentialToDecimal(toDecimal);
            let balance = Number(expToDecimal) / Math.pow(10, decimals);
            return balance;
        } catch (err: any) {
            console.error(`Tron_Helper TRC20_Token_Balance error >>`, err);
            throw err;
        }
    }
    /** fetch native coin balance */
    public async TRX_Coin_Fetch_Balance(address: string) {
        try {
            return await this.tronWeb.trx.getBalance(address).then(async (result: any) => {
                return await this.tronWeb.fromSun(result);
            });
        } catch (err: any) {
            console.error(`Tron_Helper TRX_Fetch_Balance error >>`, err);
            throw err;
        }
    }
    public async send_trx_trnx(from: string, to: string, value: number, receive_coin_data: any){

    }



}
export let Tron_Helper = new TronHelper();
