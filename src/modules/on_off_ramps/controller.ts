import axios from "axios";
import { config } from "./../../config/";
import on_off_ramp_helper from "./helper";
import moment from "moment";
import { SettingsModel } from "../../models/model";
import { TxReqTypesEnum } from "../third_party/enum";
class onOffRampController {

    public async updateFiats(ramp_type: string) {
        try {
            /*if (ramp_type == 'alchemy') {
                console.log("Entered into updateFiats of Onn-off-ramp >>>>>")
                try {
                    console.log("Entered into add_alchemy_alchemy>>>")
                    let headers: any = {
                        appId: config.ALCHEMY.APP_ID,
                        timestamp: new Date().getTime(),
                    };
                    const signature = await on_off_ramp_helper.alchemySign(headers.timestamp);
                    (headers as any).sign = signature;
                    let result: any;
                    let result1: any;
                    await axios.get(`${config.ALCHEMY.ALCHEMY_BASE_URL}/merchant/fiat/list?type=BUY`, { headers: headers }).then(response => {
                        result = response;
                    }).catch(err => {
                        console.error("Error in add_alchemy_alchemy.", err)
                    })
                    await axios.get(`${config.ALCHEMY.ALCHEMY_BASE_URL}/merchant/fiat/list?type=SELL`, { headers: headers }).then(response => {
                        result1 = response;
                    }).catch(err => {
                        console.error("Error in add_alchemy_alchemy.", err)
                    })
                    let groupedData: any;
                    let data;
                    if (result.data.returnCode == "0000" && result1.data.returnCode == "0000") {
                        let obj: any = result.data.data;
                        obj = obj.concat(result1.data.data)
                        let groupedArray: any = await on_off_ramp_helper.get_grouped_data_alchemy(obj)
                        console.log("groupedArray>>")
                        for (let i: number = 0; i < groupedArray.length; i++) {
                            let check_exit: any = await on_off_ramp_helper.checkAlchemyFiatExit({ country_code: groupedArray[i].country, fiat_currency: groupedArray[i].currency, })
                            if (check_exit) {
                                let check_details_exist: any = await on_off_ramp_helper.checkAlchemyFiatDetailsExist({ country_code: groupedArray[i].country, fiat_currency: groupedArray[i].currency, })
                                if (check_details_exist) {
                                    // check alchemy details are same 
                                    let it_exist: any = await on_off_ramp_helper.checkAlchemyFiatdetailsExit({ country_code: groupedArray[i].country, fiat_currency: groupedArray[i].currency, alchemy_payment_details: groupedArray[i].items })
                                    if (it_exist) {
                                        console.log("Same alchemy fiat list data exist in table")
                                    } else {
                                        console.log("itit_exist check_details_exist>>>>>")
                                        await on_off_ramp_helper.update_fiat_data({ alchemy_payment_details: groupedArray[i].items }, {
                                            where: {
                                                country_code: groupedArray[i].country,
                                                fiat_currency: groupedArray[i].currency
                                            }
                                        });
                                    }
                                } else {
                                    //update alchemy details 
                                    await on_off_ramp_helper.update_fiat_data({ alchemy_payment_details: groupedArray[i].items }, {
                                        where: {
                                            country_code: groupedArray[i].country,
                                            fiat_currency: groupedArray[i].currency
                                        }
                                    });

                                }
                            } else {
                                // Insert row in table
                                await on_off_ramp_helper.save_fiat_data({
                                    country_name: groupedArray[i].countryName,
                                    country_code: groupedArray[i].country,
                                    fiat_currency: groupedArray[i].currency,
                                    alchemy_payment_details: groupedArray[i].items
                                })
                            }
                        }
                    }
                    console.log("updateFiats for alchemy It worked fine>>>")
                } catch (err: any) {
                    console.error("Error in alchemy add_transact_fiats>>", err)
                    return false;
                }
            } else {*/
            try {
                console.log("Entered into add_transact_fiats>>>")
                let config_url: any = {
                    method: 'get',
                    url: `${config.TRANSAK.TRANSAK_URL}${config.TRANSAK.TRANSAK_FIAT_CURRENCIES_URL}`,
                    headers: {}
                }
                await axios(config_url).then(async (response) => {
                    let result: any = response.data.response
                    for (let i: number = 0; i < result.length; i++) {
                        if (result[0].supportingCountries) {
                            for (let j: number = 0; j < result[i].supportingCountries.length; j++) {
                                let check_supporting_countries_and_symbol: any = await on_off_ramp_helper.check_transak_fiat_exist({ country_code: result[i].supportingCountries[j], fiat_currency: result[i].symbol })
                                let filterPaymentOptions: any = result[i].paymentOptions.map((option: any) => ({ id: option.id, name: option.name, displayMessage: option.displayMessage ? option.displayMessage : null, processingTime: option.processingTime, minAmount: option.minAmount, maxAmount: option.maxAmount, icon: option.icon }))
                                if (check_supporting_countries_and_symbol) {
                                    let check_transak_exist: any = await on_off_ramp_helper.check_transak_fiat_exist_for_transak({ country_code: result[i].supportingCountries[j], fiat_currency: result[i].symbol })
                                    if (check_transak_exist) {
                                        // check_transakl_details
                                        let check_transakl_details: any = await on_off_ramp_helper.check_transak_fiat_details_exist({ country_code: result[i].supportingCountries[j], fiat_currency: result[i].symbol, transak_payment_detials: filterPaymentOptions })
                                        if (check_transakl_details) {
                                            console.log("Same transak details exist>>>>")
                                        } else {
                                            // update
                                            await on_off_ramp_helper.update_fiat_data({ transak_payment_detials: filterPaymentOptions }, { where: { country_code: result[i].supportingCountries[j], fiat_currency: result[i].symbol } });
                                        }


                                    } else {
                                        // update
                                        await on_off_ramp_helper.update_fiat_data({ transak_payment_detials: filterPaymentOptions }, { where: { country_code: result[i].supportingCountries[j], fiat_currency: result[i].symbol } })
                                    }
                                } else {
                                    // Insert a row
                                    let country_name: any = await on_off_ramp_helper.get_country_name(result[i].supportingCountries[j])
                                    await on_off_ramp_helper.save_fiat_data({
                                        country_name: country_name,
                                        country_code: result[i].supportingCountries[j],
                                        fiat_currency: result[i].symbol,
                                        transak_payment_detials: filterPaymentOptions
                                    });

                                }
                            }
                        }
                    }
                }).catch(err => {
                    console.error("Error in axios >> add_transact_fiats.", err)
                })
            } catch (err: any) {
                console.error("Error in updateFiats add_transact_fiats>>", err)
            }

            // }
        } catch (err: any) {
            console.error("Error in updateFiats>>> ", err)
        }
    }

    public async updateTransakToken() {
        try {
            console.log("Entered into updateTransakToken>>>>>")
            let token: any;
            let transak_data: any = await SettingsModel.findOne({
                attributes: ["value", "created_at", "updated_at"],
                where: { title: TxReqTypesEnum.TRANSAK },
                raw: true
            })
            if (!transak_data) {
                console.log(" no transak_data in setting tabe >>>>")
                token = await on_off_ramp_helper.create_access_token()
                await SettingsModel.create({
                    title: TxReqTypesEnum.TRANSAK,
                    value: token,
                    created_at: new Date(),
                    updated_at: new Date()
                })
            } else {
                let updated_date: any = moment(transak_data.updated_at)
                let current_data: any = moment(new Date());
                let blockDiff: number = Math.abs(updated_date.diff(current_data, 'days'))
                console.log(blockDiff)
                if (blockDiff <= 7) {
                    console.log("Block difference is smaller than or equal to 7 days. in cronjobs")
                    token = transak_data?.value
                } else {
                    console.log("Block difference is more than 5 days.")
                    token = await on_off_ramp_helper.create_access_token()
                    await SettingsModel.update({ value: token, updated_at: new Date() }, { where: { title: TxReqTypesEnum.TRANSAK } })
                }
            }
            console.log("Token updated in transak >>>>>")
        } catch (err: any) {
            console.error("Error in updateTransakToken>>>>", err)
        }
    }

}

const OnOffRampController = new onOffRampController();
export default OnOffRampController;
