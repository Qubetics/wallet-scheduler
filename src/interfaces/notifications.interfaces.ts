export interface NotificationInterface {
  token: Array<{ device_token: string }> | Array<string> | string;
  title: string;
  message: string;
  alert_price: any;
  notification_type: number;
  tx_id?: number;
  tx_type: string;
  from_user_id?: number;
  user_coin_id?: number;
  userName?: string;
  wallet?: string;
  thread?: string;
  chat_thread?: string;
}

