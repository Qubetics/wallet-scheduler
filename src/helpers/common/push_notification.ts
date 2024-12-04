// import BigNumber from "bignumber.js";
// import FCM from 'fcm-push';
// /import FCM from 'fcm-node'
// var FCM = require("fcm-node");
const firebaseAdmin = require("firebase-admin");
import fcmServiceAccount from "../../constants/firebase.admin.key.json";
// import dbHelper from "../dbHelper";

class PushNotification {
  constructor() {
    (async () => {
      await firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(fcmServiceAccount),
      });
    })();
  }

  public async sendNewNotification(data: any) {
    try {
      if (data?.deviceTokens?.length > 0) {
        const messaging = firebaseAdmin.messaging();

        console.log("data::", data);

        if (Array.isArray(data.deviceTokens)) {
          messaging
            .sendMulticast({
              tokens: data.deviceTokens,
              collapse_key: "type_a",
              notification: data.notification,
              data: data.data,
            })
            .then((response: any) => {
              console.log(" ~ firebase admin push notification", response);
            })
            .catch((error: any) => {
              console.error(
                " ~ firebase admin sending notification error",
                error.code,
                error.message
              );
            });
        } else {
          messaging
            .send({
              token: data.deviceTokens,
              notification: data.notification,
              data: data.data,
            })
            .then((response: any) => {
              console.log(" ~ firebase admin push notification", response);
            })
            .catch((error: any) => {
              console.error(
                " ~ firebase admin sending notification error",
                error.code,
                error.message
              );
            });
        }
      }

      return true;
    } catch (error) {
      console.error(` ~ sendNewNotification utility.helper.ts error`, error);
      return false;
    }
  }
}
export let pushNotification = new PushNotification();
