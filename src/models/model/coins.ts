import { DataTypes, Model, Optional } from "sequelize";

import { CoinModel } from "../interface/coins";
import db from "../../helpers/common/db";
import { CoinPriceInFiat } from "./coinPriceInFiat";
// import reset_graph_data from "./reset_graph_data";
import { CoinPriceInFiatGraph } from "./coinPriceInFiatGraph";

interface CoinCreationModel extends Optional<CoinModel, "coin_id"> {}
interface CoinInstance extends Model<CoinModel, CoinCreationModel>, CoinModel {}

const dataObj = {
  coin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  coin_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coin_symbol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coin_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  coin_family: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  cmc_id: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  is_on_cmc: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  coin_status: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  is_token: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  token_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  decimals: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },

  // token_abi: {
  //   type: DataTypes.STRING,
  //   allowNull: true,
  // },
  token_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  for_swap: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  added_by: {
    type: DataTypes.ENUM("admin", "user", "swap"),
    allowNull: true,
  },
  graph_source: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  graph_pair: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pair_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_on_trading_view: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },    
  is_on_moralis_inactive: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
};
const dataObjIndex = {
  indexes: [
    {
      unique: true,
      fields: ["coin_id"],
    },
    {
      unique: false,
      fields: ["coin_symbol"],
    },
    {
      unique: false,
      fields: ["coin_family"],
    },
    {
      unique: false,
      fields: ["coin_status"],
    },
    {
      unique: false,
      fields: ["is_token"],
    },
    {
      unique: false,
      fields: ["token_type"],
    },
    {
      unique: false,
      fields: ["token_address"],
    },
  ],
};

const CoinsWrite = db.db_write.define<CoinInstance>(
  "coins",
  dataObj,
  dataObjIndex
);

const CoinsRead = db.db_read.define<CoinInstance>(
  "coins",
  dataObj,
  dataObjIndex
);
CoinsRead.hasOne(CoinPriceInFiat.CoinPriceInFiatRead, {
  foreignKey: "coin_id",
  sourceKey: "coin_id",
  as: "coin_price_data",
});
// CoinsRead.hasOne(reset_graph_data.ResetGraphRead, {
//   foreignKey: "cmc_id",
//   sourceKey: "cmc_id",
//   as: "reset_graph_data",
// });

CoinsRead.hasOne(CoinPriceInFiatGraph.CoinPriceInFiatGraphRead, {
  foreignKey: "cmc_id",
  sourceKey: "cmc_id",
  as: "graph_data",
});

export const Coins = {
  CoinsWrite: CoinsWrite,
  CoinsRead: CoinsRead,
};
