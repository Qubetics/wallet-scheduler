// import Web3 from "web3";
// import { config } from "./../../config";
// import { AbiItem } from "web3-utils";
// import { bigNumberSafeMath, exponentialToDecimal } from "../../helpers/common/globalFunctions";
// import BigNumber from "bignumber.js";

// class BNBHelpers {
//     public web3: Web3;
//     public abi: AbiItem[] | string;
//     public token_address: string | null | undefined;

//     constructor(abi: AbiItem[] | string = "", contractAddress: string = "") {
//         var provider = new Web3.providers.HttpProvider(config.NODE.BNB_RPC_URL || "");
//         this.web3 = new Web3(provider);
//         this.abi = abi != "" ? abi : "";
//         this.token_address = !contractAddress ? contractAddress : "";
//         this.initialize();
//     }

//     public initialize() { }

//     public async searchTokenNew(token_contract: string) {
//         try {
//             const contract = new this.web3.eth.Contract(config.CONTRACT_ABI as AbiItem[], token_contract);
//             const decimals = await contract.methods.decimals().call();
//             const name = await contract.methods.name().call();
//             const symbol = await contract.methods.symbol().call();
//             const data = { decimals, name, symbol };
//             if (!data) {
//                 throw new Error("ERROR in searchTokenNew ");
//             } else {
//                 return data;
//             }
//         }
//         catch (error) {
//             console.error("search_token_new error", error)
//             const data = { decimals: 0, name: "", symbol: "" }
//             return data;
//         }
//     }
//     // public async getUserERC20TokenBalance(tokenAddress: string | null | undefined, tokenAbi: AbiItem[], walletAddress: string, rpc_object: any): Promise<number> {
//     //     try {
//     //         if (tokenAddress) {
//     //             let contract = await new rpc_object.eth.Contract(tokenAbi, tokenAddress);
//     //             var decimals = await contract.methods.decimals().call();
//     //             var balance = await contract.methods.balanceOf(walletAddress).call();
//     //             var tokenBalance = await bigNumberSafeMath(balance, "/", Math.pow(10, decimals));
//     //             return tokenBalance;
//     //         } else {
//     //             return 0;
//     //         }
//     //     } catch (err) {
//     //         console.error("🔥 ~ ~ getUserERC20TokenBalance error", err);
//     //         return 0;
//     //     }
//     // }
//     public async get_balance(is_token: number, token_address: string, wallet_address: string) {
//         try {
//             let balance: string = '0';
//             if (is_token == 1) {
//                 balance = (await this.get_erc20_token_balance(token_address, config.CONTRACT_ABI as AbiItem[], wallet_address)).toString()
//             } else {
//                 balance = (await this.get_coin_balance(wallet_address, true)).toString();
//             }
//             balance = await exponentialToDecimal(Number(balance))
//             return balance;
//         } catch (err: any) {
//             console.error("Error in get_balance of ethereum>>>", err)
//             throw err;
//         }
//     }
//     public async get_erc20_token_balance(token_address: string | undefined, tokenAbi: AbiItem[], wallet_address: string) {
//         try {
//             if (token_address) {
//                 const contract: any = new this.web3.eth.Contract(tokenAbi, token_address)
//                 let decimals: any = await contract.methods.decimals().call();
//                 let balance: any = await contract.methods.balanceOf(wallet_address).call();
//                 let tokenBalance: any = await bigNumberSafeMath(balance, '/', Math.pow(10, decimals))
//                 console.log("get_erc20_token_balance>>>>>>>", tokenBalance)
//                 return tokenBalance;
//             }
//             return 0;
//         } catch (err: any) {
//             console.error("Error in get_erc20_token_balance of eth.", err)
//             throw err;
//         }

//     }
//     public async get_coin_balance(address: string, inEth: boolean) {
//         try {
//             let balance_in_wei: any = await this.web3.eth.getBalance(address)
//             if (inEth == true) {
//                 let balance_in_eth = bigNumberSafeMath(balance_in_wei, '/', Math.pow(10, 18))
//                 return balance_in_eth;
//             }
//         } catch (err: any) {
//             console.error("Error in get_coin_balance of eth", err)
//             throw err;
//         }
//     }

//     public async get_nonce(from_address: any) {
//         try {
//             let nonce: any = await this.web3.eth.getTransactionCount(from_address, 'pending');
//             return nonce;

//         } catch (err: any) {
//             console.error("Error in get_nonce>>", err)
//         }
//     }
//     public async get_gas_price(receive_coin_data: any, from: string, to: string) {
//         try {
//             let estimationRes: any;
//             if (receive_coin_data.is_token) {
//                 estimationRes = await bnbHelper.getbep20TokenTransferGasEstimationCost(
//                     receive_coin_data.token_address,
//                     config.CONTRACT_ABI,
//                     from,
//                     to
//                 );
//             } else {
//                 estimationRes = await bnbHelper.getbnbGasLimit(from, to);
//             }
//             return estimationRes.gas_estimate;
//         } catch (err: any) {
//             console.error("Error in get_gas_price>>", err)
//         }
//     };
//     public async getbnbGasLimit(from: string, to: string) {
//         try {
//             let amount = await bnbHelper.get_coin_balance(from, true);
//             let amountWei = await this.web3.utils.toWei(amount.toString(), "ether");
//             let amountHex = await this.web3.utils.toHex(amountWei);
//             let gasLimit = await this.web3.eth.estimateGas({
//                 from: from,
//                 to: to,
//                 value: amountHex,
//             });
//             return { gas_estimate: gasLimit > 30000 ? gasLimit : 30000 };
//         } catch (err: any) {
//             console.error("error, for try catch", err);
//             return { gas_estimate: 0 };
//         }
//     }
//     public async getbep20TokenTransferGasEstimationCost(
//         token_contract: string | null | undefined,
//         token_abi: any,
//         fromAdress: string,
//         toAddress: string
//     ) {
//         try {
//             if (token_contract) {
//                 let contract = new this.web3.eth.Contract(
//                     token_abi as AbiItem[],
//                     token_contract
//                 );
//                 var tokenValue = await contract.methods.balanceOf(fromAdress).call();
//                 tokenValue = await exponentialToDecimal(tokenValue as number);
//                 var gasLimit = await contract.methods
//                     .transfer(toAddress, tokenValue)
//                     .estimateGas({ from: fromAdress });
//                 gasLimit = gasLimit * 3;
//             }
//             return { gas_estimate: gasLimit == 0 ? 60000 : Math.floor(parseFloat(gasLimit.toString())) };
//         } catch (err: any) {
//             console.error("error,getErc20TokenTransferGasEstimationCost", err);
//             return { gas_estimate: 60000 };
//         }
//     }
//     public async send_transaction(raw_Transaction: any) {
//         try {
//             const send: any = await this.web3.eth.sendSignedTransaction(raw_Transaction)
//             return send;
//         } catch (err: any) {
//             return err;
//         }
//     };
// }

// export const bnbHelper = new BNBHelpers();
