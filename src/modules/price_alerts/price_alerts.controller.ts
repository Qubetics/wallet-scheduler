import { Coins, CoinPriceInFiat, PriceAlerts } from '../../models/model/index';
import { NotificationTypes } from '../../constants';
import dbHelper from '../../helpers/dbHelper';
import { sendNotification, bigNumberSafeMath } from '../../helpers/common/globalFunctions';
import { Sequelize } from 'sequelize';

class PriceAlertsController {

    constructor() { }

    /**
       * send price alerts
    */
    // public sendPriceAlerts = async (coin_family: number) => {
    public sendPriceAlerts = async (coin_id: number, fiat_currency: string, updated_price: number) => {
        try {
            let price_alert_data: any = await PriceAlerts.PriceAlertsDataRead.findAll({
                attributes: ['id', 'user_id', 'coin_id', 'wallet_address', 'fiat_type', 'price', 'percentage'],
                include: [{
                    model: Coins.CoinsRead,
                    attributes: ['coin_id', 'coin_symbol'],
                    // where: { coin_family: coin_family },
                    where: { coin_status: 1 },
                    as: "coin_detail",
                    // include: [{
                    //     model: CoinPriceInFiat.CoinPriceInFiatRead,
                    //     attributes: ['value'],
                    //     where: Sequelize.literal('`coin_detail->coin_price_data`.`fiat_type`=`price_alerts`.`fiat_type`'),
                    //     as: 'coin_price_data',
                    //     required: true
                    // }],
                    required: true
                }],
                where: { status: 'pending', coin_id: coin_id, fiat_type: fiat_currency },
                // logging: true
            });
            let currentUTCDate: string = new Date()
                .toISOString()
                .replace(/T/, ' ')
                .replace(/\..+/, '');
            if (price_alert_data) {
                for await (let alert of price_alert_data) {
                    // let coin = await CoinPriceInFiat.CoinPriceInFiatRead.findOne({
                    //     attributes: ['value'],
                    //     where: {
                    //         coin_id: alert.coin_id,
                    //         fiat_type: alert.fiat_type,
                    //     },
                    //     raw: true,
                    //     // logging: true
                    // });
                    // if (!coin) {
                    //     throw new Error('Coin does not exist.');
                    // }

                    // if (alert.coin_detail.coin_price_data.value && alert.price && alert.coin_detail.coin_price_data.value > alert.price && alert.percentage > 0) {
                    if (updated_price && alert.price && updated_price > alert.price && alert.percentage > 0) {
                        let deviceToken = await dbHelper.getUserDeviceToken(alert?.user_id ? alert.user_id : 0);
                        console.log('deviceToken >>>>', deviceToken)
                        // let diff = await bigNumberSafeMath(coin.current_price, '-', alert.price);
                        //let diff = await bigNumberSafeMath(alert.price, '-', alert.value);
                        //let percentage = await bigNumberSafeMath(await bigNumberSafeMath(diff, '/', alert.price), '*', 100);
                        //percentage = Number(percentage)
                        //let notificationMsg = `Price  of ${alert.coin_detail.coin_symbol.toUpperCase()} has Increased by ${alert.percentage.toFixed(2)}%`;
                        /////////////////////////
                        // let notificationMsg = `Price Alert - ${alert.coin_detail.coin_symbol.toUpperCase()} price has reached ${updated_price.toFixed(6)} ${alert.fiat_type}`;
                        let notificationMsg = `Price Alert - ${alert.coin_detail.coin_symbol.toUpperCase()} price has reached ${alert.price.toFixed(6)} ${alert.fiat_type}`;

                        let notificationData: any = {
                            message: notificationMsg,
                            amount: alert.price,
                            alert_price: alert.percentage,
                            fiat_type: alert.fiat_type,
                            from_user_id: 0,
                            to_user_id: alert?.user_id ? alert.user_id : 0,
                            notification_type: NotificationTypes.ALERT,
                            tx_id:null,
                            tx_type: 'ALERT',
                            coin_symbol: alert.coin_detail.coin_symbol,
                            coin_id: alert.coin_id,
                            resent_count:null,
                            view_status:0,
                            state: 'sent',
                            coin_price_in_usd:null,
                            wallet_address: alert.wallet_address ? alert.wallet_address : '',
                            created_at: currentUTCDate,
                            updated_at: currentUTCDate,
                        };
                        await dbHelper.save_notification(notificationData);
                        let dataNotification = {
                            title: 'PRICE ALERT',
                            token: deviceToken.device_token,
                            message: notificationMsg,
                            notification_type: NotificationTypes.ALERT,
                            tx_type: 'ALERT',
                            alert_price: alert.percentage
                        };
                        if (typeof deviceToken.device_token != 'undefined' && deviceToken.device_token?.length > 0 && deviceToken.device_token != null) {
                            sendNotification(dataNotification);
                        }
                        await PriceAlerts.PriceAlertsDataWrite.update(
                            { status: 'sent' },
                            { where: { id: alert.id } }
                        );
                        // } else if (alert.coin_detail.coin_price_data.value && alert.price && alert.coin_detail.coin_price_data.value < alert.price && alert.percentage < 0) {
                    } else if (updated_price && alert.price && updated_price < alert.price && alert.percentage < 0) {
                        let deviceToken = await dbHelper.getUserDeviceToken(alert?.user_id ? alert.user_id : 0);
                        console.log('deviceToken >>>>', deviceToken)
                        // let diff = await bigNumberSafeMath(alert.price, '-', coin.current_price);
                        ////let diff = await bigNumberSafeMath(alert.price, '-', alert.value);
                        //let percentage = await bigNumberSafeMath(await bigNumberSafeMath(diff, '/', alert.price), '*', 100);
                        //percentage = Number(percentage)
                        //let notificationMsg = `Price  of ${alert.coin_detail.coin_symbol.toUpperCase()} has Decreased by ${alert.percentage.toFixed(2)}%`;

                        ///////////////
                        // let notificationMsg = `Price Alert - ${alert.coin_detail.coin_symbol.toUpperCase()} price has reached ${updated_price.toFixed(6)} ${alert.fiat_type}`;
                        let notificationMsg = `Price Alert - ${alert.coin_detail.coin_symbol.toUpperCase()} price has reached ${alert.price.toFixed(6)} ${alert.fiat_type}`;


                        let notificationData: any = {
                            message: notificationMsg,
                            amount: alert.price,
                            alert_price: alert.percentage,
                            fiat_type: alert.fiat_type,
                            from_user_id: 0,
                            to_user_id: alert?.user_id ? alert.user_id : 0,
                            notification_type: NotificationTypes.ALERT,
                            tx_id:null,
                            tx_type: 'ALERT',
                            coin_symbol: alert.coin_detail.coin_symbol,
                            coin_id: alert.coin_id,
                            resent_count:null,
                            view_status:0,
                            state: 'sent',
                            coin_price_in_usd:null,
                            wallet_address: alert.wallet_address ? alert.wallet_address : '',
                            created_at: currentUTCDate,
                            updated_at: currentUTCDate,
                        };
                        await dbHelper.save_notification(notificationData);
                        let dataNotification = {
                            title: 'PRICE ALERT',
                            token: deviceToken.device_token,
                            message: notificationMsg,
                            notification_type: NotificationTypes.ALERT,
                            tx_type: 'ALERT',
                            alert_price: alert.percentage

                        };
                        if (typeof deviceToken?.device_token != 'undefined' && deviceToken?.device_token?.length > 0 && deviceToken.device_token != null) {
                            console.log('dataNotification >>>>>>>>>>>>>>>>>>>>>>>>>')
                            sendNotification(dataNotification);
                        }
                        await PriceAlerts.PriceAlertsDataWrite.update(
                            { status: 'sent' },
                            { where: { id: alert.id } }
                        );
                    }
                    // }
                }
            }
            return true;
        } catch (error) {
            console.error(`💥 ~ ~ sendPriceAlerts error`, error);
            return false;
        }
    };

}

const price_alerts_controller = new PriceAlertsController();
export default price_alerts_controller;
