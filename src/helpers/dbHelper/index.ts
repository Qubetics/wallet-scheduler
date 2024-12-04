import { NotificationInterface } from "../../models/interface/interface.notifications";
import { WalletModel } from "../../models/interface/interface.wallets";
import { Coins, DeviceToken, SettingsModel, Wallets } from "../../models/model/index";
import { CoinModel } from "../../models/interface/interface.coins";
import { NotificationModel } from "../../models/model/index";
import { config } from "../../config";
import { FCMObject } from "../../interfaces/notifications.interfaces";
var FCM = require('fcm-node');
import settings_queries from './settings';
export { settings_queries }

class DbHelper {
  /**
   * get wallet id by wallet address
   * @param wallet_address
   * @param coin_id
   * @returns
   */
  public async getWalletIdByAddress(
    wallet_address: string,
    coin_id: number
  ): Promise<number | null> {
    try {
      var queryRes = await Wallets.WalletRead.findOne({
        where: { wallet_address, coin_id },
        attributes: ["wallet_id"],
      });
      if (queryRes) return queryRes.wallet_id;
      else return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * get user wallet details by wallet address
   * @param wallet_address
   * @param coin_id
   * @returns
   */
  public async getWalletInfoByAddressAndCoinId(
    wallet_address: string,
    coin_id: number | undefined
  ): Promise<WalletModel | null> {
    try {
      var queryRes = await Wallets.WalletRead.findOne({
        where: { wallet_address, coin_id },
      });
      if (queryRes) return queryRes;
      else return null;
    } catch (error) {
      return null;
    }
  }



  /**
   * get user device tokens
   * @param walletAddress
   * @returns
   */
  public async getUserIdByWalletAddress(
    walletAddress: string
  ): Promise<number | null> {
    var userData: any = await Wallets.WalletRead.findOne({
      where: { wallet_address: walletAddress },
      attributes: ["device_token"],
    });

    if (userData) return userData[0].user_id;
    else return null;
  }

  /**
   * get user device tokens
   * @param userId
   * @returns
   */
  public async getUserDeviceToken(
    userId: number
  ): Promise<{ device_token: Array<string> }> {
    var deviceTokensData = await DeviceToken.DeviceTokenRead.findAll({
      where: { user_id: userId, status: 1 },
      attributes: ["device_token"],
    });
    let newValue = [];
    for await (let deviceToken of deviceTokensData) {
      // console.log("deviceToken:", deviceToken.device_token);
      newValue.push(deviceToken.device_token);
    }
    if (newValue.length > 0) return { device_token: newValue as string[] };
    else return { device_token: [] };
  }


  public async save_notification(object: NotificationInterface) {
    try {
      await NotificationModel.create(object)
      return true;
    } catch (err: any) {
      console.error("Error in save_notification>>>>", err)
      return false;
    }
  }
  public async send_fcm_push_notification(to_user_id: number, object: FCMObject) {
    let deviceTokens: any = await DeviceToken.DeviceTokenRead.findAll({
      attributes: ["device_token", "user_id"],
      where: {
        push: 1,
        user_id: to_user_id
      },
      order: [
        ["updated_at", "DESC"],
        ['id', 'DESC']
      ],
      group: ['device_token'],
      raw: true
    })
    let device_tokens = [];
    for await (let deviceToken of deviceTokens) {
      device_tokens.push(deviceToken.device_token);
    }
    let serverKey: string = config.FCM_SERVER_KEY;
    if (device_tokens && serverKey) {
      let fcm = new FCM(serverKey);
      let message: any;

      if (Array.isArray(device_tokens)) {
        message = {
          registration_ids: device_tokens,
          collapse_key: "type_a",
          notification: {
            title: object.title,
            body: object.details,
            sound: 'default'
          },
          data: {
            body: object.details,
            title: object.title,
            announcement_title: object.title,
            announcement_message: object.details
          }
        }
      } else {
        message = {
          registration_ids: device_tokens,
          collapse_key: "type_a",
          notification: {
            title: object.title,
            body: object.details,
            sound: 'default'
          },
          data: {
            body: object.details,
            title: object.title,
            announcement_title: object.title,
            announcement_message: object.details
          }
        }
      }
      fcm.send(message, function (err: any, messageId: number) {
        if (err) {
          console.error("Something has gone wrong!", err);
        } else {
          console.debug(`fcm push notification >>`, messageId);
        }
      });

    }
  };


  /**
   * Get coin detail by coin id from coin type
   * @param coinType
   * @param coinFamily
   * @returns
   */
  public async getCoinData(
    coinType: string,
    coinFamily: number
  ): Promise<CoinModel | null> {
    var result: CoinModel | null = await Coins.CoinsRead.findOne({
      where: { coin_symbol: coinType, coin_family: coinFamily },
    });
    if (result) return result;
    else return null;
  }

  public async find_one_settings(att: any, where_clause: any) {
    try {
      let data: any = await SettingsModel.findOne({
        attributes: att,
        where: where_clause,
        raw: true
      })
      return data;
    } catch (err: any) {
      console.error("Error in find_one_settings>>", err)
      throw err;
    }
  }
}


const dbHelper = new DbHelper();
export default dbHelper;
