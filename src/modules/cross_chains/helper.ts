import { CoinPriceInFiat } from "../../models/model";
import AdminTotalProfitsModel from "../../models/model/model.admin_total_profits";
import { Boolean } from "../../constants";

class CrossChainHelper {
    public async insert_profit_in_admin_table(data: any, order_id: string, to_user_id: any) {
        try {
            console.log("Enterd into insert_profit_in_admin_table>>>", to_user_id)
            let cr_date: any = new Date(data.dealFinishTime);
            let created_at: string = cr_date.toISOString();
            console.log("order_id >>>", order_id)
            let crypto_fees: any = null;
            let crypto_profit_amt: any = null;
            let coin_deposited: any = data.depositCoinCode;
            let coin_deposited_symbol: any = coin_deposited.split(/[\(\)]/)
            coin_deposited_symbol = coin_deposited_symbol[Boolean.false]

            let usd_data: any = await CoinPriceInFiat.CoinPriceInFiatRead.findOne({
                attributes: ["value"],
                where: { coin_symbol: coin_deposited_symbol, fiat_type: 'usd' },
                raw: true
            });
            let usd_price: any = 0;

            if (usd_data) {
                usd_price = usd_data.value;
            }
            if (coin_deposited_symbol == 'USDT') {
                console.log("enterd into USDT coin symbol", coin_deposited_symbol)
                crypto_fees = data.depositCoinFeeAmt;
                crypto_profit_amt = (0.4 * Number(data.depositCoinFeeAmt))
            } else {
                console.log("enterd in other coin symbol", coin_deposited_symbol)
                let total_usdt_amt: number = Number(data.depositCoinAmt) * Number(usd_price);
                crypto_fees = total_usdt_amt * 0.005;
                crypto_profit_amt = (0.4 * Number(crypto_fees))
            }

            console.log("is everyhting working fine")
            let profit_object: any = {
                user_id: to_user_id,
                type: "cross_chain_swap",
                sub_type: `${data.depositCoinCode} to ${data.receiveCoinCode}`,
                trnx_id: null,
                order_id: data.orderId,
                fiat_amount: null,
                crypto_amount: data.depositCoinAmt,
                crypto_type: data.depositCoinCode,
                fiat_fee: null,
                usd_price: usd_price,
                crypto_fee: crypto_fees,
                profit_percentage: 40,
                crypto_profit_amount: crypto_profit_amt,
                fiat_profit_amount: null,
                trnx_date: created_at,
                created_at: new Date(),
                updated_at: new Date()
            }
            await AdminTotalProfitsModel.create(profit_object)

        } catch (err: any) {
            console.error("Error in insert_profit_in_admin_table>>", err)
        }
    }

}

export let cross_chain_helper = new CrossChainHelper();