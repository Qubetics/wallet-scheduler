import { NotificationInterface } from "../../interfaces/notifications.interfaces";
import { config } from "../../config";
import { DeviceToken } from "../../models/model";
// import dbHelper from "../dbHelper";
// import axios from "axios";
// import { EthHelper } from "../../modules/on_off_ramps/ethhelper";
// import { bnbHelper } from "../../modules/on_off_ramps/bnbHelper";
// import { NonEvmHelper } from "../../modules/on_off_ramps/btc_helper";
// import { Tron_Helper } from "../../modules/on_off_ramps/tron_helper";
import { pushNotification } from "./push_notification";
import { Op } from "sequelize";

let BigNumber = require("bignumber.js");
// var FCM = require("fcm-node");

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
      //operator = operation;
      break;
  }
  return rtn;
};

export const toFixed_norounding = function (value: string, n: number): number {
  const val: number = new BigNumber(value);
  value = val.toFixed();
  var x: string[] = (val.toString() + ".0").split(".");
  return parseFloat(x[0] + "." + x[1].substr(0, n));
};

export const bigNumberSafeConversion = function (val: number): number {
  var amount = val.toString();
  var value = new BigNumber(amount);
  return value.toFixed();
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
        // user_id: user_id,
        push: 1,
      },
      order: [
        ["updated_at", "DESC"],
        ["id", "DESC"],
      ],
      // limit: 3,
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
  // console.log('devices >>>>>>>>', devices)
  var chat_thread = devices.thread == undefined ? "" : devices.thread;
  // var serverKey = config.FCM_SERVER_KEY;
  // console.log("serverKey >>>>>", serverKey);
  // var fcm = new FCM(serverKey);
  // console.log("FCM connection >>>>", fcm);
  var fromUserId =
    devices.from_user_id == undefined ? "" : devices.from_user_id;
  var userCoinId =
    devices.user_coin_id == undefined ? "" : devices.user_coin_id;
  var userName = devices.userName == undefined ? "" : devices.userName;
  var walletAddress = devices.wallet == undefined ? "" : devices.wallet;
  var message = {};
  if (Array.isArray(devices.token)) {
    // console.log('devices.token >>>', devices.token);

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

    // console.log(message);
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

    // console.log(message);
  }

  await pushNotification.sendNewNotification(message);

  //promise style
  // fcm.send(message, function (err: Error, messageId: number) {
  //   if (err) {
  //     console.error("Something has gone wrong!", err);
  //   } else {
  //     console.log("Sent with message ID: ", messageId);
  //   }
  // });
};


