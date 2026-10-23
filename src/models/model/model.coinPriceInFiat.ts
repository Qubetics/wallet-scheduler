import { DataTypes, Model, Optional } from "sequelize";

import { CoinPriceInFiatModel } from "../interface/interface.coinPriceInFiat";
import db from "../../helpers/common/db";

interface CoinPriceInFiatCreationModel
  extends Optional<CoinPriceInFiatModel, "id"> {}
interface CoinPriceInFiatInstance
  extends Model<CoinPriceInFiatModel, CoinPriceInFiatCreationModel>,
    CoinPriceInFiatModel {}

const dataObj = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  coin_id: {
    type: DataTypes.NUMBER,
    allowNull: true,
  },
  coin_symbol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coin_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coin_family: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  cmc_id: {
    type: DataTypes.NUMBER,
    allowNull: false,
  },
  fiat_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  value: {
    type: DataTypes.DOUBLE,
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
  market_cap: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  circulating: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  total_supply: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  rank: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  volume_24h: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  max_supply: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  latest_price: {
    type: DataTypes.JSON,
    allowNull: true,
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
      fields: ["coin_id"],
    },
    {
      unique: false,
      fields: ["coin_symbol"],
    },
    {
      unique: false,
      fields: ["coin_name"],
    },
    {
      unique: false,
      fields: ["coin_family"],
    },
    {
      unique: false,
      fields: ["cmc_id"],
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
      fields: ["token_address"],
    }
  ],
};

const CoinPriceInFiatWrite = db.db_write.define<CoinPriceInFiatInstance>(
  "coin_price_in_fiats",
  dataObj,
  dataObjIndex
);
const CoinPriceInFiatRead = db.db_read.define<CoinPriceInFiatInstance>(
  "coin_price_in_fiats",
  dataObj,
  dataObjIndex
);

export const CoinPriceInFiat = {
  CoinPriceInFiatWrite: CoinPriceInFiatWrite,
  CoinPriceInFiatRead: CoinPriceInFiatRead,
};
