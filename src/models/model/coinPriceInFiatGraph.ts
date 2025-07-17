import { DataTypes, Model, Optional } from "sequelize";

import { CoinPriceInFiatGraphModel } from "../interface/coinPriceInFiatGraph";
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
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
};
const dataObjIndex = {
  indexes: [
    {
      unique: false,
      fields: ["fiat_type"],
    },
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
