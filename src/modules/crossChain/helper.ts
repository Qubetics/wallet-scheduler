import { CoinPriceInFiat } from "../../models/model";
import AdminTotalProfitsModel from "../../models/model/adminTotalProfits";
import { Boolean } from "../../constants";

class CrossChainHelper {
    public async insertProfitInAdminTable(data: any, order_id: string, to_user_id: any) {
        try {
            console.log("Enterd into insertProfitInAdminTable>>>", to_user_id)
            const dealFinishDate: any = new Date(data.dealFinishTime);
            const createdAt: string = dealFinishDate.toISOString();
            console.log("order_id >>>", order_id)
            let cryptoFees: any = null;
            let cryptoProfitAmount: any = null;
            const coinDeposited: any = data.depositCoinCode;
            let coinDepositedSymbol: any = coinDeposited.split(/[\(\)]/)
            coinDepositedSymbol = coinDepositedSymbol[Boolean.false]

            const usdData: any = await CoinPriceInFiat.CoinPriceInFiatRead.findOne({
                attributes: ["value"],
                where: { coin_symbol: coinDepositedSymbol, fiat_type: 'usd' },
                raw: true
            });
            let usdPrice: any = 0;

            if (usdData) {
                usdPrice = usdData.value;
            }
            if (coinDepositedSymbol == 'USDT') {
                console.log("enterd into USDT coin symbol", coinDepositedSymbol)
                cryptoFees = data.depositCoinFeeAmt;
                cryptoProfitAmount = (0.4 * Number(data.depositCoinFeeAmt))
            } else {
                console.log("enterd in other coin symbol", coinDepositedSymbol)
                let totalUsdtAmount: number = Number(data.depositCoinAmt) * Number(usdPrice);
                cryptoFees = totalUsdtAmount * 0.005;
                cryptoProfitAmount = (0.4 * Number(cryptoFees))
            }

            console.log("is everyhting working fine")
            let profitObject: any = {
                user_id: to_user_id,
                type: "cross_chain_swap",
                sub_type: `${data.depositCoinCode} to ${data.receiveCoinCode}`,
                trnx_id: null,
                order_id: data.orderId,
                fiat_amount: null,
                crypto_amount: data.depositCoinAmt,
                crypto_type: data.depositCoinCode,
                fiat_fee: null,
                usd_price: usdPrice,
                crypto_fee: cryptoFees,
                profit_percentage: 40,
                crypto_profit_amount: cryptoProfitAmount,
                fiat_profit_amount: null,
                trnx_date: createdAt,
                created_at: new Date(),
                updated_at: new Date()
            }
            await AdminTotalProfitsModel.create(profitObject)

        } catch (err: any) {
            console.error("Error in insert_profit_in_admin_table>>", err)
        }
    }

}

export const crossChainHelper = new CrossChainHelper();