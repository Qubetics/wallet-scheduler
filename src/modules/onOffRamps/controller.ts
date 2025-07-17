// import { config } from "./../../config";
// import CryptoJS from "crypto-js";
// import blockchain_helper from "../../helpers/common/blockchain.helper";
// import non_evm_helper from "../../helpers/common/non.evm.helper";
// import { OnOffRampFiatsModel } from "../../models/model";
// import * as isoCountries from 'i18n-iso-countries';
// import axios from "axios";
// import { Op } from "sequelize";
// import { ethers } from "ethers";
// import etherJs from "../../helpers/common/web3.helper";

// const COIN_FAMILY = config.STATIC_COIN_FAMILY;

// class on_off_helper {
//     public Eth_Ether_Url: ethers.JsonRpcProvider;
//     public Bsc_Ether_Url: ethers.JsonRpcProvider;

//     constructor() {
//         this.Eth_Ether_Url = etherJs.etherEth;
//         this.Bsc_Ether_Url = etherJs.etherBsc;
//     }
//     // public async create_access_token() {
//     //     try {
//     //         let options: any = {
//     //             method: 'post',
//     //             url: `${config.TRANSAK.TRANSAK_URL}${config.TRANSAK.TRANSAK_REFRESH_TOKEN_URL}`,
//     //             headers: {
//     //                 "api-secret": `${config.TRANSAK.TRANSAK_API_SECRET}`,
//     //                 "accept": "application/json",
//     //                 "content-type": "application/json"
//     //             },
//     //             data: {
//     //                 "apiKey": `${config.TRANSAK.TRANSAK_API_KEY}`
//     //             }
//     //         }
//     //         let access_token: any = await axios(options);
//     //         let options1: any = {
//     //             method: 'post',
//     //             url: `${config.TRANSAK.TRANSAK_URL}${config.TRANSAK.TRANSAK_UPDATE_WEBHOOK_URL}`,
//     //             headers: {
//     //                 "access-token": access_token?.data?.data.accessToken,
//     //                 "accept": "application/json",
//     //                 "content-type": "application/json"
//     //             },
//     //             data: {
//     //                 "webhookURL": `${config.APP.QUBETICS_URL}on_off_ramp/transak_webhook`
//     //             }
//     //         }
//     //         let update_webhookURL_data: any = await axios(options1);
//     //         return access_token?.data.data.accessToken;

//     //     } catch (err: any) {
//     //         console.error("Error in create_access_token>>>", err)
//     //         return false
//     //     }
//     // }

//     // public async get_grouped_data_alchemy(obj: any) {
//     //     try {
//     //         let groupedData: any = obj.reduce((acc: any, item: any) => {
//     //             let key: any = `${item.countryName}_${item.country}_${item.currency}`;
//     //             if (acc) {
//     //                 if (!acc[key]) {
//     //                     acc[key] = {
//     //                         countryName: item.countryName,
//     //                         country: item.country,
//     //                         currency: item.currency,
//     //                         items: []
//     //                     };
//     //                 }
//     //             }
//     //             let { country, currency, countryName, ...itemWithoutCountryInfo }: any = item;
//     //             acc[key].items.push(itemWithoutCountryInfo)
//     //             return acc;
//     //         }, {});
//     //         const groupedArray: any = Object.values(groupedData)
//     //         return groupedArray;
//     //     } catch (err: any) {
//     //         console.error("Error in on_off_ramp_helper>> > get_grouped_data_alchemy>>", err)
//     //         return false
//     //     }
//     // }
//     // public async checkAlchemyFiatExit(where_clause: any) {
//     //     try {
//     //         let check_exist: any = await OnOffRampFiatsModel.findOne({
//     //             attributes: ["id", "country_name"],
//     //             where: where_clause,
//     //             raw: true
//     //         })
//     //         if (check_exist)
//     //             return true;
//     //         else
//     //             return false
//     //     } catch (err: any) {
//     //         console.error("Error in on_off_ramp_helper>> > checkAlchemyFiatExit>>", err)
//     //         return false
//     //     }
//     // }
//     // public async checkAlchemyFiatdetailsExit(where_clause: any) {
//     //     try {
//     //         let check_exist: any = await OnOffRampFiatsModel.findOne({
//     //             attributes: ["id", "country_name", "alchemy_payment_details"],
//     //             where: {
//     //                 country_code: where_clause.country_code,
//     //                 fiat_currency: where_clause.fiat_currency,
//     //             },
//     //             raw: true
//     //         })
//     //         if (check_exist) {
//     //             if (check_exist.alchemy_payment_details.length == where_clause.alchemy_payment_details.length) {
//     //                 return true;
//     //             } else {
//     //                 return false
//     //             }
//     //         } else {
//     //             return false
//     //         }
//     //     } catch (err: any) {
//     //         console.error("Error in on_off_ramp_helper>> > checkAlchemyFiatExit>>", err)
//     //         return false
//     //     }
//     // }
//     // public async checkAlchemyFiatDetailsExist(where_clause: any) {
//     //     try {
//     //         let check_exist: any = await OnOffRampFiatsModel.findOne({
//     //             attributes: ["id", "country_name"],
//     //             where: {
//     //                 country_code: where_clause.country_code,
//     //                 fiat_currency: where_clause.fiat_currency,
//     //                 alchemy_payment_details: { [Op.ne]: null }
//     //             },
//     //             raw: true
//     //         })
//     //         if (check_exist)
//     //             return true;
//     //         else
//     //             return false
//     //     } catch (err: any) {
//     //         console.error("Error in on_off_ramp_helper>> > checkAlchemyFiatDetailsExist>>", err)
//     //         return false
//     //     }
//     // }
//     // public async check_transak_fiat_exist(where_clause: any) {
//     //     try {
//     //         let check_exist: any = await OnOffRampFiatsModel.findOne({
//     //             attributes: ["id", "country_name"],
//     //             where: where_clause,
//     //             raw: true
//     //         })
//     //         if (check_exist)
//     //             return true;
//     //         else
//     //             return false
//     //     } catch (err: any) {
//     //         console.error("Error in on_off_ramp_helper>> > check_transak_fiat_exist>>", err)
//     //         return false;
//     //     }
//     // }
//     // public async check_transak_fiat_details_exist(where_clause: any) {
//     //     try {
//     //         let check_exist: any = await OnOffRampFiatsModel.findOne({
//     //             attributes: ["id", "country_name", "transak_payment_detials"],
//     //             where: {
//     //                 country_code: where_clause.country_code,
//     //                 fiat_currency: where_clause.fiat_currency,
//     //             },
//     //             raw: true
//     //         })
//     //         if (check_exist) {
//     //             if (check_exist.transak_payment_detials.length == where_clause.transak_payment_detials.length) {
//     //                 return true;
//     //             } else {
//     //                 return false
//     //             }
//     //         } else {
//     //             return false
//     //         }
//     //     } catch (err: any) {
//     //         console.error("Error in on_off_ramp_helper>> > check_transak_fiat_exist>>", err)
//     //         return false;
//     //     }
//     // }
//     // public async check_transak_fiat_exist_for_transak(where_clause: any) {
//     //     try {
//     //         let check_exist: any = await OnOffRampFiatsModel.findOne({
//     //             attributes: ["id", "country_name"],
//     //             where: {
//     //                 fiat_currency: where_clause.fiat_currency,
//     //                 country_code: where_clause.country_code,
//     //                 transak_payment_detials: { [Op.ne]: null }
//     //             },
//     //             raw: true
//     //         })
//     //         if (check_exist)
//     //             return true;
//     //         else
//     //             return false
//     //     } catch (err: any) {
//     //         console.error("Error in on_off_ramp_helper>> > check_transak_fiat_exist>>", err)
//     //         return false;
//     //     }
//     // }
//     // public async get_country_name(country_code: string) {
//     //     try {
//     //         isoCountries.registerLocale(require('i18n-iso-countries/langs/en.json'))
//     //         let country_name: string | undefined = isoCountries.getName(country_code, 'en')
//     //         if (country_name)
//     //             return country_name;
//     //         else
//     //             return "not_present"
//     //     } catch (err: any) {
//     //         console.error("Error in on_off_ramp_helper>> > get_country_name>>", err)
//     //         return false;
//     //     }

//     // }

//     // public async return_decimals(address: string, coin_family: number) {
//     //     try {

//     //         if (coin_family == 2) {
//     //             let token_data: any = await blockchain_helper.searchTokenNew(address, config.CONTRACT_ABI, this.Eth_Ether_Url)
//     //             return Math.pow(10, parseInt(token_data?.decimals))
//     //         } else if (coin_family == 6) {
//     //             let token_data: any = await non_evm_helper.searchToken(address)
//     //             return Math.pow(10, parseInt(token_data?.decimals))
//     //         } else if (coin_family == 1) {
//     //             let token_data: any = await blockchain_helper.searchTokenNew(address, config.CONTRACT_ABI, this.Bsc_Ether_Url)
//     //             return Math.pow(10, parseInt(token_data?.decimals))
//     //         } else {
//     //             return 0;
//     //         }
//     //     } catch (err: any) {
//     //         console.error("err in return_decimals", err);
//     //         return 0;
//     //     }
//     // }

//     public async save_fiat_data(data: any) {
//         try {
//             await OnOffRampFiatsModel.create(data)
//         } catch (err: any) {
//             console.error("Error in on_off_ramp_helper>> > save_fiat_data>>", err)
//             return false;
//         }
//     }
//     public async update_fiat_data(data: any, where: any) {
//         try {
//             await OnOffRampFiatsModel.update(data, where)
//         } catch (err: any) {
//             console.error("Error in on_off_ramp_helper>> > save_fiat_data>>", err)
//             return false;
//         }
//     }
// }
// const on_off_ramp_helper = new on_off_helper();
// export default on_off_ramp_helper;
