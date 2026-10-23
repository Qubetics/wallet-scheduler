import { config } from "../../config";
const { instant_announcement_counter: INSTANT_ANNOUNCEMENT_COUNTER } =
  config.REDISKEYS.COIN_LIMIT_COUNT_FIELD;

import TBL_ANNOUNCEMENTS from "../../models/model/model.announcement";
import { DeviceToken } from "../../models/model/model.deviceToken";
import { pushNotification } from "../../helpers/common/push_notification";
import redisClient from "../../helpers/common/redis";

class notificationController {
  constructor() {}

  public instant_announcement_notification = async () => {
    try {
      console.log("===================")
      const announcement = await TBL_ANNOUNCEMENTS.findOne({
        where: { status: "pending" },
        order: [["created_at", "ASC"]],
        raw: true,
      });
      console.log("🚀 ~ notificationController ~ instant_announcement_notification= ~ announcement:", announcement)
      if (!announcement) {
        return false;
      }

      let coin_limit_count = 0;
      const limit = 500;

      const findCoinCounter = await redisClient.getKeyValuePair(
        config.REDISKEYS.COIN_LIMIT_COUNTS,
        INSTANT_ANNOUNCEMENT_COUNTER
      );

      if (findCoinCounter) {
        coin_limit_count = Number(findCoinCounter);
      }

      const device_tokens = await DeviceToken.DeviceTokenRead.findAll({
        attributes: ["id", "user_id", "address", "device_token"],
        where: { status: 1 },
        group: ['device_token'],
        limit: limit,
        offset: coin_limit_count,
      });
      console.log("🚀 ~ notificationController ~ forawait ~ device_tokens length: ", device_tokens.length)

      if (!device_tokens || device_tokens.length === 0) {
        await redisClient.setKeyValuePair(
          config.REDISKEYS.COIN_LIMIT_COUNTS,
          INSTANT_ANNOUNCEMENT_COUNTER,
          "0"
        );
      }

      const tokens: string[] = [];

      for (const device of device_tokens) {
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

      if (device_tokens.length < limit) {
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
        coin_limit_count += limit;
        await redisClient.setKeyValuePair(
          config.REDISKEYS.COIN_LIMIT_COUNTS,
          INSTANT_ANNOUNCEMENT_COUNTER,
          coin_limit_count.toString()
        );
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };
}

const notification_controller = new notificationController();
export default notification_controller;