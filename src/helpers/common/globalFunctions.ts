import { NotificationInterface } from "../../interfaces/notifications";
// import { config } from "../../config";
import { DeviceToken } from "../../models/model";
import { pushNotification } from "./pushNotification";
import { Op } from "sequelize";

const bigNumber = require("bignumber.js");

export const bigNumberSafeMath = function (
  c: string,
  operation: string,
  d: string | number,
  precision?: number
) {
  bigNumber.config({ DECIMAL_PLACES: 18 });
  const a = new bigNumber(c);
  const b = new bigNumber(typeof d === "number" ? d.toString() : d);
  let rtn;
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

// export const toFixed_norounding = function (value: string, n: number): number {
//   const val: number = new BigNumber(value);
//   value = val.toFixed();
//   var x: string[] = (val.toString() + ".0").split(".");
//   return parseFloat(x[0] + "." + x[1].substr(0, n));
// };

// export const bigNumberSafeConversion = function (val: number): number {
//   var amount = val.toString();
//   var value = new BigNumber(amount);
//   return value.toFixed();
// };

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

export const getDeviceTokens = async function getDeviceTokens(user_id: number, address: string, coin_family: number) {
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
  const chat_thread = devices.thread == undefined ? "" : devices.thread;
  const fromUserId =
    devices.from_user_id == undefined ? "" : devices.from_user_id;
  const userCoinId =
    devices.user_coin_id == undefined ? "" : devices.user_coin_id;
  const userName = devices.userName == undefined ? "" : devices.userName;
  const walletAddress = devices.wallet == undefined ? "" : devices.wallet;
  let message = {};
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


