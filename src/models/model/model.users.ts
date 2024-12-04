import { DataTypes, Model, Optional } from "sequelize";

import { UserModel } from "../interface/interface.users";
import { Wallets } from './index';
import db from "../../helpers/common/db";

interface UserCreationModel extends Optional<UserModel, "user_id"> {}
interface UserInstance extends Model<UserModel, UserCreationModel>, UserModel {}

let dataObj = {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  currency_fiat_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  wallet_pin: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mobile_no: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  country_code_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  referral_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  referrer_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  google_2fa_secret: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue:''
  },
  google2fa_status:{
    type: DataTypes.TINYINT,
    allowNull: true,
    defaultValue:0
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
      fields: ["currency_fiat_id"],
    },
  ],
};

const UsersWrite = db.db_write.define<UserInstance>(
  "users",
  dataObj,
  dataObjIndex
);
const UsersRead = db.db_read.define<UserInstance>(
  "users",
  dataObj,
  dataObjIndex
);

UsersWrite.hasMany(Wallets.WalletWrite, {
  foreignKey: "user_id",
  sourceKey: "user_id",
});
UsersRead.hasMany(Wallets.WalletRead, {
  foreignKey: "user_id",
  sourceKey: "user_id",
});

export default {
  UsersWrite: UsersWrite,
  UsersRead: UsersRead,
};
