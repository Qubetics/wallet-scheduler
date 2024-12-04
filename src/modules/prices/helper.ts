// import { CoinPriceInFiatOtc, CoinsOtc, CoinPriceInFiatGraphOtc } from "../../models/model/index"

// class otc_price_helper {

    // public async update_otc_db(cmc_id: any, fiat_type: any, obj: any, code: any, latest_price: any) {
    //     try {
    //         console.log("update_otc_db CMC_ID>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", cmc_id)

    //         let coin_in_otc = await CoinsOtc.CoinsRead.findOne({
    //             attributes: ['coin_id', 'coin_family', 'cmc_id', 'token_address'],
    //             where: { cmc_id: cmc_id },
    //             raw: true
    //         });
    //         if (coin_in_otc) {
    //             let where: any = { cmc_id: cmc_id, fiat_type: fiat_type }
    //             let checkIfCoinExist: any = await CoinPriceInFiatOtc.CoinPriceInFiatWrite.findOne({
    //                 attributes: ['id', 'coin_id'],
    //                 where: where,
    //                 raw: true
    //             });
    //             if (checkIfCoinExist) {
    //                 console.log("otc  coin price in fiat exist update")

    //                 await CoinPriceInFiatOtc.CoinPriceInFiatWrite.update(
    //                     {
    //                         value: obj?.quote[code]?.price || 0,
    //                         price_change_24h: obj.quote[code].percent_change_24h,
    //                         price_change_percentage_24h: obj.quote[code].percent_change_24h,
    //                     },
    //                     {
    //                         where: where
    //                     }
    //                 );

    //             } else {
    //                 console.log("otc  coin price in fiat not exist")

    //                 await CoinPriceInFiatOtc.CoinPriceInFiatWrite.create({
    //                     coin_id: coin_in_otc.coin_id,
    //                     cmc_id: coin_in_otc.cmc_id,
    //                     fiat_type: code.toLowerCase(),
    //                     value: obj?.quote[code].price || 0,
    //                     price_change_24h: obj.quote[code].percent_change_24h,
    //                     price_change_percentage_24h: obj.quote[code].percent_change_24h,
    //                     token_address: coin_in_otc.token_address,
    //                     created_at: new Date(),
    //                     updated_at: new Date()
    //                 })
    //             }
    //             const coin_id = coin_in_otc.coin_id
    //             if (coin_id > 0) {
    //                 await this.Otc_update_history_last_price(latest_price, obj.id, code, where, coin_id, obj.circulating_supply, obj?.quote[code].price || 0);
    //             }
    //         } else {
    //             console.log("CMC id not in otc coins table")
    //         }
    //     } catch (err: any) {
    //         console.error("err in find_coin_data", err);
    //         return false;
    //     }
    // }

    // private Otc_update_history_last_price = async (latest_price: any, id: number, code: string, where: any, coin_id: number, circulating_supply: any, price: any) => {
    //     console.log('---------------------OTC update history last price--------------', id, '------', code, 'where >>>>>', where, coin_id);

    //     const historyExistData = await CoinPriceInFiatGraphOtc.CoinPriceInFiatGraphRead.findAndCountAll({ attributes: [`id`, `sparkline`, `type`], where: where });
    //     if (historyExistData.count > 0) {
    //         for (let history of historyExistData.rows) {
    //             let history_sparkline: any = history.sparkline !== null ? history.sparkline : [];
    //             if (history_sparkline.length > 0) {
    //                 let last_record = history_sparkline[history_sparkline?.length - 1];

    //                 if ((new Date(latest_price?.timestamp).getTime()) > (new Date(last_record?.timestamp).getTime())) {
    //                     history_sparkline
    //                     history_sparkline.push(latest_price)
    //                     await CoinPriceInFiatGraphOtc.CoinPriceInFiatGraphWrite.update({ sparkline: history_sparkline, cmc_id: id, circulating_supply: circulating_supply, value: price }, { where: { id: history.id } });
    //                 } else {
    //                     history_sparkline.push(latest_price)
    //                     await CoinPriceInFiatGraphOtc.CoinPriceInFiatGraphWrite.update({ sparkline: history_sparkline, cmc_id: id, circulating_supply: circulating_supply, value: price }, { where: { id: history.id } });
    //                 }
    //             }
    //         }
    //     } else {
    //         let types = ['1d']
    //         for (let i = 0; i < types.length; i++) {
    //             let create_data: any = {
    //                 coin_id: coin_id,
    //                 cmc_id: id,
    //                 sparkline: [latest_price],
    //                 type: types[i],
    //                 fiat_type: code,
    //                 circulating_supply: circulating_supply,
    //                 value: price,
    //                 created_at: new Date(),
    //                 updated_at: new Date()
    //             }
    //             await CoinPriceInFiatGraphOtc.CoinPriceInFiatGraphWrite.create(create_data);
    //         }
    //     }

    // }

    // public async update_coin_price_in_fiat_graph(where: any, sparkline: any, circulating_supply: any, price: any) {
    //     try {
    //         console.log("Entered into update_coin_price_in_fiat_graph>>>>", where)
    //         let coin_in_otc = await CoinsOtc.CoinsRead.findOne({
    //             attributes: ['coin_id', 'coin_family', 'cmc_id', 'token_address'],
    //             where: {
    //                 cmc_id: where.cmc_id,
    //             },
    //             raw: true
    //         });
    //         if (coin_in_otc) {
    //             console.log("coin exist in coins otc table")
    //             let history_data_exist: any = await CoinPriceInFiatGraphOtc.CoinPriceInFiatGraphWrite.findAndCountAll({
    //                 attributes: [`id`, `sparkline`, `type`],
    //                 where: { cmc_id: where.cmc_id, fiat_type: where.fiat_type }
    //             });
    //             if (history_data_exist.count > 0) {
    //                 await CoinPriceInFiatGraphOtc.CoinPriceInFiatGraphWrite.update(
    //                     {
    //                         sparkline: sparkline,
    //                         circulating_supply: circulating_supply,
    //                         value: price,
    //                     },
    //                     {
    //                         where: { cmc_id: where.cmc_id, fiat_type: where.fiat_type },
    //                     }
    //                 );
    //             } else {
    //                 console.log("creating>>>>>>>>>>>>>>>>>>>")
    //                 let types = ['1d']
    //                 for (let i = 0; i < types.length; i++) {
    //                     let create_data: any = {
    //                         coin_id: coin_in_otc.coin_id,
    //                         cmc_id: where.cmc_id,
    //                         sparkline: sparkline,
    //                         type: types[i],
    //                         fiat_type: where.fiat_type.toUpperCase(),
    //                         circulating_supply: circulating_supply,
    //                         value: price,
    //                         created_at: new Date(),
    //                         updated_at: new Date()
    //                     }
    //                     await CoinPriceInFiatGraphOtc.CoinPriceInFiatGraphWrite.create(create_data);
    //                 }
    //             }
    //         } else {
    //             console.log("coin is not present in coin otc table..")
    //         }
    //     } catch (err: any) {
    //         console.error("err in update_coin_price_in_fiat_graph", err);
    //         return false;
    //     }
    // }

// }
// const Otc_helper = new otc_price_helper();
// export default Otc_helper;
