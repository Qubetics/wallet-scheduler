import { DataTypes, Model, Optional } from "sequelize";

import { DeviceTokenModel } from "../interface/interface.deviceToken";
import db from "../../helpers/common/db";

interface DeviceTokenCreationModel extends Optional<DeviceTokenModel, "id"> { }
interface DeviceTokenInstance
  extends Model<DeviceTokenModel, DeviceTokenCreationModel>,
  DeviceTokenModel { }

let dataObj = {
  id: {
    primaryKey: true,
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  device_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  device_token: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coin_family: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  push: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
};

let dataObjIndex = {
  indexes: [
    {
      unique: false,
      fields: ["user_id"],
    },
    {
      unique: false,
      fields: ["status"],
    },
  ],
};

const DeviceTokenWrite = db.db_write.define<DeviceTokenInstance>("deviceTokens", dataObj, dataObjIndex);
const DeviceTokenRead = db.db_read.define<DeviceTokenInstance>("deviceTokens", dataObj, dataObjIndex);

export const DeviceToken = {
  DeviceTokenWrite: DeviceTokenWrite,
  DeviceTokenRead: DeviceTokenRead,
};
