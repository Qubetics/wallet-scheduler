import { DataTypes, Model, Optional } from "sequelize";

import { CoinPriceInFiatGraphModel } from "../interface/interface.coinPriceInFiatGraph";
import db from "../../helpers/common/db";

interface CoinPriceInFiatCreationModel
  extends Optional<CoinPriceInFiatGraphModel, "id"> { }
interface CoinPriceInFiatInstance
  extends Model<CoinPriceInFiatGraphModel, CoinPriceInFiatCreationModel>,
  CoinPriceInFiatGraphModel { }

const dataObj = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  cmc_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fiat_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sparkline: {
    type: DataTypes.JSON,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  latest_price_source: {
    type: DataTypes.STRING,
    allowNull: true,
  },
};

const dataObjIndex = {
  created_at: "created_at",
  updated_at: "updated_at",
  indexes: [
    {
      unique: false,
      fields: ["cmc_id"],
    },
    {
      unique: false,
      fields: ["type"],
    },
    {
      unique: false,
      fields: ["fiat_type"],
    },
    {
      unique: false,
      fields: ["value"],
    },
    {
      unique: false,
      fields: ["created_at"],
    },
    {
      unique: false,
      fields: ["updated_at"],
    }
  ],
};

const CoinPriceInFiatGraphWrite = db.db_write.define<CoinPriceInFiatInstance>(
  "coin_price_in_fiat_graphs",
  dataObj,
  dataObjIndex
);
const CoinPriceInFiatGraphRead = db.db_read.define<CoinPriceInFiatInstance>(
  "coin_price_in_fiat_graphs",
  dataObj,
  dataObjIndex
);
export const CoinPriceInFiatGraph = {
  CoinPriceInFiatGraphWrite: CoinPriceInFiatGraphWrite,
  CoinPriceInFiatGraphRead: CoinPriceInFiatGraphRead,
};
