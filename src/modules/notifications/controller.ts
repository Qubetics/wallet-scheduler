import { config } from "../../config";
const { instant_announcement_counter: INSTANT_ANNOUNCEMENT_COUNTER } =
  config.REDISKEYS.COIN_LIMIT_COUNT_FIELD;

import TBL_ANNOUNCEMENTS from "../../models/model/announcement";
import { DeviceToken } from "../../models/model/deviceToken";
import { pushNotification } from "../../helpers/common/pushNotification";
import redisClient from "../../helpers/common/redis";

class NotificationController {
  constructor() {}

  public instantAnnouncementNotification = async () => {
    try {
      console.log("===================")
      const announcement = await TBL_ANNOUNCEMENTS.findOne({
        where: { status: "pending" },
        order: [["created_at", "ASC"]],
        raw: true,
      });
      console.log("🚀 ~ notificationController ~ instantAnnouncementNotification= ~ announcement:", announcement)
      if (!announcement) {
        return false;
      }

      let coinLimitCount = 0;
      const limit = 500;

      const findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        INSTANT_ANNOUNCEMENT_COUNTER
      );

      if (findCoinCounter) {
        coinLimitCount = Number(findCoinCounter);
      }

      const deviceTokens = await DeviceToken.DeviceTokenRead.findAll({
        attributes: ["id", "user_id", "address", "device_token"],
        where: { status: 1 },
        group: ['device_token'],
        limit: limit,
        offset: coinLimitCount,
      });
      console.log("🚀 ~ notificationController ~ forawait ~ deviceTokens length: ", deviceTokens.length)

      if (!deviceTokens || deviceTokens.length === 0) {
        await redisClient.setKeyValuePair(
          config.REDISKEYS.COIN_LIMIT_COUNTS,
          INSTANT_ANNOUNCEMENT_COUNTER,
          "0"
        );
      }

      const tokens: string[] = [];

      for (const device of deviceTokens) {
        if (device.device_token) {
          tokens.push(device.device_token);
        }
      }

      if (tokens.length > 0) {
        const message = {
          deviceTokens: tokens,
          notification: {
            title: announcement.title,
            body: announcement.message,
          },
          data: {
            body: announcement.message,
            title: announcement.title,
            notification_type: "Announcements",
            tx_type: "Announcements",
          },
        };

        await pushNotification.sendNewNotification(message);
      }

      if (deviceTokens.length < limit) {
        await redisClient.setKeyValuePair(
          config.REDISKEYS.COIN_LIMIT_COUNTS,
          INSTANT_ANNOUNCEMENT_COUNTER,
          "0"
        );

        await TBL_ANNOUNCEMENTS.update(
          { status: "sent" },
          { where: { id: announcement.id, status: "pending" } }
        );
      } else {
        coinLimitCount += limit;
        await redisClient.setKeyValuePair(
          config.REDISKEYS.COIN_LIMIT_COUNTS,
          INSTANT_ANNOUNCEMENT_COUNTER,
          coinLimitCount.toString()
        );
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };
}

const notificationController = new NotificationController();
export default notificationController;