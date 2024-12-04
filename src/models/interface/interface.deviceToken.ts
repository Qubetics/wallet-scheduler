export interface DeviceTokenModel {
  id: number;
  device_token: string | any ;
  user_id: number;
  status: number;
  push?: number
}
