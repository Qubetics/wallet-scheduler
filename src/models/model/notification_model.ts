import { DataTypes, Model, Optional } from "sequelize";
import { NotificationInterface } from "../interface/interface.notifications";
import db from "../../helpers/common/db";

interface NotificationCreationModel
  extends Optional<NotificationInterface, "notification_id"> { }
interface NotificationInstance
  extends Model<NotificationInterface, NotificationCreationModel>,
  NotificationInterface { }

let dataObj = {
  notification_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  from_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  to_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  notification_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tx_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  tx_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  coin_symbol: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  coin_family: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  coin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  view_status: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  wallet_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
};

let dataObjIndex = {
  indexes: [
    {
      unique: false,
      fields: ["to_user_id"],
    },
    {
      unique: false,
      fields: ["notification_type"],
    },
    {
      unique: false,
      fields: ["tx_id"],
    },
    {
      unique: false,
      fields: ["tx_type"],
    },
  ],
};

export const NotificationModel = db.db_write.define<NotificationInstance>(
  "notifications",
  dataObj,
  dataObjIndex
);