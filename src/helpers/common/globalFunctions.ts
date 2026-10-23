import { NotificationInterface } from "../../interfaces/notifications.interfaces";
import { DeviceToken } from "../../models/model";
import { pushNotification } from "./push_notification";
import { Op } from "sequelize";

let BigNumber = require("bignumber.js");

export const bigNumberSafeMath = function (
  c: string,
  operation: string,
  d: string | number,
  precision?: number
) {
  BigNumber.config({ DECIMAL_PLACES: 18 });
  var a = new BigNumber(c);
  var b = new BigNumber(typeof d === "number" ? d.toString() : d);
  var rtn;
  // Figure out which operation to perform.
  switch (operation.toLowerCase()) {
    case "-":
      rtn = a.minus(b);
      break;
    case "+":
      rtn = a.plus(b);
      break;
    case "*":
    case "x":
      rtn = a.multipliedBy(b);
      break;
    case "÷":
    case "/":
      rtn = a.dividedBy(b);
      break;
    default:
      break;
  }
  return rtn;
};



export const exponentialToDecimal = async function (exponential: number) {
  let decimal: string = exponential.toString().toLowerCase();
  if (decimal.includes("e+")) {
    const exponentialSplitted = decimal.split("e+");
    let postfix = "";
    for (
      let i = 0;
      i <
      +exponentialSplitted[1] -
      (exponentialSplitted[0].includes(".")
        ? exponentialSplitted[0].split(".")[1].length
        : 0);
      i++
    ) {
      postfix += "0";
    }
    const addCommas = (text: string) => {
      let j = 3;
      let textLength = text.length;
      while (j < textLength) {
        text = `${text.slice(0, textLength - j)}${text.slice(
          textLength - j,
          textLength
        )}`;
        textLength++;
        j += 3 + 1;
      }
      return text;
    };
    decimal = addCommas(exponentialSplitted[0].replace(".", "") + postfix);
  }
  if (decimal.toLowerCase().includes("e-")) {
    const exponentialSplitted = decimal.split("e-");
    let prefix = "0.";
    for (let i = 0; i < +exponentialSplitted[1] - 1; i++) {
      prefix += "0";
    }
    decimal = prefix + exponentialSplitted[0].replace(".", "");
  }
  return decimal;
};

export const GetDeviceTokens = async function GetDeviceTokens(user_id: number, address: string, coin_family: number) {
  try {
    return await DeviceToken.DeviceTokenRead.findAll({
      attributes: ["device_token"],
      where: {
        address: {
          [Op.like]: address,
        },
        coin_family: coin_family,
        push: 1,
      },
      order: [
        ["updated_at", "DESC"],
        ["id", "DESC"],
      ],
      raw: true,
    });
  } catch (error: any) {
    console.error(`getDeviceToken error >>>`, error);
    return false;
  }
};

export const sendNotification = async function sendNotification(
  devices: NotificationInterface
) {
  var chat_thread = devices.thread == undefined ? "" : devices.thread;
  var fromUserId =
    devices.from_user_id == undefined ? "" : devices.from_user_id;
  var userCoinId =
    devices.user_coin_id == undefined ? "" : devices.user_coin_id;
  var userName = devices.userName == undefined ? "" : devices.userName;
  var walletAddress = devices.wallet == undefined ? "" : devices.wallet;
  var message = {};
  if (Array.isArray(devices.token)) {

    message = {
      deviceTokens: devices.token,
      notification: {
        title: devices.title,
        body: devices.message,
        sound: "default",
      },
      data: {
        body: devices.message,
        alert: devices.alert_price,
        title: devices.title,
        thread: chat_thread,
        notification_type: devices.notification_type,
        table_id: devices.tx_id,
        tx_type: devices.tx_type,
        from_user_id: fromUserId,
        user_name: userName,
        wallet_address: walletAddress,
        user_coin_id: userCoinId,
        chat_thread_id: devices.chat_thread,
      },
    };

  } else {
    message = {
      deviceTokens: devices.token,
      notification: {
        title: devices.title,
        body: devices.message,
        sound: "default",
      },
      data: {
        body: devices.message,
        title: devices.title,
        thread: chat_thread,
        notification_type: devices.notification_type,
        table_id: devices.tx_id?.toString(),
        tx_type: devices.tx_type,
        from_user_id: fromUserId?.toString(),
        user_name: userName,
        wallet_address: walletAddress,
        user_coin_id: userCoinId?.toString(),
        chat_thread_id: devices.chat_thread,
      },
    };
  }

  await pushNotification.sendNewNotification(message);

};


