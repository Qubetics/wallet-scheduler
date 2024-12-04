import { DataTypes, Model, Optional } from "sequelize";

import { SwapModel } from "../interface/interface.swapList";
import db from "../../helpers/common/db";
import { Coins ,Wallets} from "./index";
import { CoinPriceInFiat } from "./model.coinPriceInFiat";

interface SwapCreationModel extends Optional<SwapModel, "id"> { }
interface SwapInstance extends Model<SwapModel, SwapCreationModel>, SwapModel { }

const dataObj = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  chain_id: {
    type: DataTypes.TINYINT,
    allowNull: false,
  },
  coin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  coin_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coin_symbol: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  coin_image: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  decimals: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_token: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  coin_family: {
    type: DataTypes.INTEGER,
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

const SwapWrite = db.db_write.define<SwapInstance>("swap_lists", dataObj);
const SwapRead = db.db_read.define<SwapInstance>("swap_lists", dataObj);

SwapRead.belongsTo(Coins.CoinsRead, {
  foreignKey: "coin_id",
  targetKey: "coin_id",
});
Coins.CoinsRead.hasMany(Wallets.WalletRead, {
  foreignKey: "coin_id",
  sourceKey: "coin_id",
});
SwapRead.belongsTo(CoinPriceInFiat.CoinPriceInFiatRead, {
  foreignKey: "coin_symbol",
  targetKey: "coin_symbol",
});
export default { SwapWrite: SwapWrite, SwapRead: SwapRead };
