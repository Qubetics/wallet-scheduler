import firebaseAdmin from 'firebase-admin';
import { config } from "../../config";

class PushNotification {
  public messaging: firebaseAdmin.messaging.Messaging;
  constructor() {
    (async () => {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(config.FIREBASE_SERVICE_ACCOUNT),
      });
      this.messaging = firebaseAdmin.messaging();
    })();
  }

  public async sendNewNotification(data: any) {
    try {
      if (data?.deviceTokens?.length > 0) {
        console.log("data::", data);

        if (Array.isArray(data.deviceTokens)) {
          this.messaging
            .sendEachForMulticast({
              tokens: data.deviceTokens,
              notification: data.notification,
              data: data.data,
            })
            .then((response: any) => {
              console.log("💥🚀 ~ firebase admin push notification", JSON.stringify(response));
            })
            .catch((error: any) => {
              console.error(
                " ~ firebase admin sending notification error",
                error.code,
                error.message
              );
            });
        } else {
          this.messaging
            .send({
              token: data.deviceTokens,
              notification: data.notification,
              data: data.data,
            })
            .then((response: any) => {
              console.log("💥🚀 ~ firebase admin push notification", JSON.stringify(response));
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
