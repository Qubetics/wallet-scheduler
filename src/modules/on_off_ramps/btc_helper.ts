// import axios, { AxiosInstance } from "axios";
// import { config } from "../../config";

// class NonEvmHelpers {
//     // public btc_client_url = config.NODE.BTC_RPC_URL;
//     // public btc_axios_client: AxiosInstance;
//     public config: any;
//     constructor() {
//         this.config = {
//             method: 'get',
//             headers: {
//                 'apikey': `${config.NODE.BTC_API_KEY}`,
//                 'Content-Type': 'application/json',
//             }
//         };
//         // this.btc_axios_client = axios.create({
//         //     baseURL: this.btc_client_url,
//         //     headers: {
//         //         "Content-Type": "application/json",
//         //     }
//         // });
//     }
//     public async get_user_btc_balance(address: string) {
//         try {
//             this.config.url = `${config.NODE.BTC_RPC_URL}api/v2/address/${address}`
//             const result = await axios(this.config);
//             // console.log('🚀 ~ ~ result >>>>', result);
//             let balance: number = result.data.balance ? Number(result.data.balance) : 0

//             // console.log('🚀 ~ ~ balance >>>>', balance);

//             if (balance > 0) {
//                 balance = balance / 100000000;
//             }
//             // console.log('🚀 ~ ~ get_user_btc_balance', balance);
//             return balance;
//         } catch (err) {
//             console.error('🚀 ~ ~ get_user_btc_balance err', err);
//             return 0;
//         }
//     }
//     public async get_balance(address: string) {
//         try {
//             this.config.url = `${config.NODE.BTC_RPC_URL}api/v2/address/${address}`
//             const response = await axios(this.config);
//             return response.data.balance / 100000000;
//         } catch (err: any) {
//             console.error("Erorr in get balacne of BTC.", err)
//             throw err;
//         }
//     }
// }

// export const NonEvmHelper = new NonEvmHelpers();