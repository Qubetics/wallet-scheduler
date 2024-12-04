import { DataTypes, Model, Optional } from "sequelize";

import { CoinPriceInFiatGraphModel } from "../interface/interface.coinPriceInFiatGraph";
import db from "../../helpers/common/db";

interface CoinPriceInFiatCreationModel
  extends Optional<CoinPriceInFiatGraphModel, "id"> { }
interface CoinPriceInFiatInstance
  extends Model<CoinPriceInFiatGraphModel, CoinPriceInFiatCreationModel>,
  CoinPriceInFiatGraphModel { }

let dataObj = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  coin_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  cmc_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  coin_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fiat_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  value: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  sparkline: {
    type: DataTypes.JSON,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price_change_24h: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  price_change_percentage_24h: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  voulme_24h: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  // created_at: {
  //   type: DataTypes.DATE,
  //   allowNull: false,
  // },
  // updated_at: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  // },
};
let dataObjIndex = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: false,
      fields: ["coin_type"],
    },
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