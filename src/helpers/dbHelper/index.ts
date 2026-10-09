import { NotificationInterface } from "../../models/interface/interface.notifications";
import { DeviceToken, SettingsModel } from "../../models/model/index";
import { NotificationModel } from "../../models/model/index";
import settings_queries from './settings';
export { settings_queries }

class DbHelper {
  /**
   * get wallet id by wallet address
   * @param wallet_address
   * @param coin_id
   * @returns
   */
  /**
   * get user wallet details by wallet address
   * @param wallet_address
   * @param coin_id
   * @returns
   */


  /**
   * get user device tokens
   * @param walletAddress
   * @returns
   */
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

  /**
   * Get coin detail by coin id from coin type
   * @param coinType
   * @param coinFamily
   * @returns
   */
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
