import { DataTypes, Model, Optional } from "sequelize";

import { CurrencyFiatModel } from "../interface/interface.currencyFiat";
import db from "../../helpers/common/db";

interface CurrencyFiatCreationModel
  extends Optional<CurrencyFiatModel, "currency_id"> { }
interface CurrencyFiatInstance
  extends Model<CurrencyFiatModel, CurrencyFiatCreationModel>,
  CurrencyFiatModel { }

const dataObj = {
  currency_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  currency_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  currency_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  currency_symbol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price_in_usd: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  uuid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
};

const dataObjIndex = {
  indexes: [
    {
      unique: true,
      fields: ["currency_id"],
    },
    {
      unique: false,
      fields: ["currency_code"],
    },
  ],
};

const CurrencyFiatWrite = db.db_write.define<CurrencyFiatInstance>(
  "currency_fiats",
  dataObj,
  dataObjIndex
);
const CurrencyFiatRead = db.db_read.define<CurrencyFiatInstance>(
  "currency_fiats",
  dataObj,
  dataObjIndex
);
export const CurrencyFiat = {
  CurrencyFiatWrite: CurrencyFiatWrite,
  CurrencyFiatRead: CurrencyFiatRead,
};
