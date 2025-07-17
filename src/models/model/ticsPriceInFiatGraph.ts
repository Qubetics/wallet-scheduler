// import { DataTypes, Model, Optional } from "sequelize";

// import { TicsPriceInFiatGraphModel } from "../interface/interface.ticsPriceInFiatGraph";
// import db from "../../helpers/common/db";

// interface TicsPriceInFiatCreationModel
//   extends Optional<TicsPriceInFiatGraphModel, "id"> { }
// interface TicsPriceInFiatInstance
//   extends Model<TicsPriceInFiatGraphModel, TicsPriceInFiatCreationModel>,
//   TicsPriceInFiatGraphModel { }

// let dataObj = {
//   id: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   coin_id: {
//     type: DataTypes.NUMBER,
//     allowNull: true,
//   },
//   timestamp: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   price: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   created_at: {
//     type: DataTypes.DATE,
//     allowNull: true,
//   },
//   updated_at: {
//     type: DataTypes.DATE,
//     allowNull: true,
//   },
// };

// const TicsPriceInFiatGraphWrite = db.db_write.define<TicsPriceInFiatInstance>(
//   "tics_price_in_fiat_graphs",
//   dataObj
// );
// const TicsPriceInFiatGraphRead = db.db_read.define<TicsPriceInFiatInstance>(
//   "tics_price_in_fiat_graphs",
//   dataObj
// );
// export const TicsPriceInFiatGraph = {
//   TicsPriceInFiatGraphWrite: TicsPriceInFiatGraphWrite,
//   TicsPriceInFiatGraphRead: TicsPriceInFiatGraphRead,
// };
