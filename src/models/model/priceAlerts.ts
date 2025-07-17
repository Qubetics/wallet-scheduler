// import { DataTypes, Model, Optional } from "sequelize";

// import { PriceAlertsModel } from "../interface/interface.priceAlerts";
// import db from "../../helpers/common/db";
// import { Coins } from "./model.coins";

// interface PriceAlertsCreationModel extends Optional<PriceAlertsModel, "id"> { }
// interface PriceAlertsDataInterface
//   extends Model<PriceAlertsModel, PriceAlertsCreationModel>,
//   PriceAlertsModel { }

// const dataObj = {
//   id: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   fiat_type: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   percentage: {
//     type: DataTypes.DOUBLE,
//     allowNull: false,
//   },
//   wallet_address: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   user_id: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//   },
//   price_in_usd_per_unit: {
//     type: DataTypes.DOUBLE,
//     allowNull: true,
//   },
//   status: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   price: {
//     type: DataTypes.DOUBLE,
//     allowNull: false,
//   },
//   coin_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//   },
// };

// const PriceAlertsDataWrite = db.db_write.define<PriceAlertsDataInterface>(
//   "price_alerts",
//   dataObj
// );
// const PriceAlertsDataRead = db.db_read.define<PriceAlertsDataInterface>(
//   "price_alerts",
//   dataObj
// );

// PriceAlertsDataRead.belongsTo(Coins.CoinsRead, {
//   foreignKey: "coin_id",
//   targetKey: "coin_id",
//   as: "coin_detail"
// });
// export const PriceAlerts = {
//   PriceAlertsDataWrite: PriceAlertsDataWrite,
//   PriceAlertsDataRead: PriceAlertsDataRead,
// };
