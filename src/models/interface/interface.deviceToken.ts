export interface DeviceTokenModel {
  id: number;
  device_token: string | any;
  user_id: number;
  device_id: string;
  status: number;
  address: string;
  coin_family: number;
  push?: number
}
