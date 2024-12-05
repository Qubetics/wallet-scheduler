export interface DeviceTokenModel {
  id: number;
  device_token: string | any;
  user_id: number;
  status: number;
  address: string;
  coin_family: number;
  push?: number
}
