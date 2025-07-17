// import { DataTypes, Model, Optional } from 'sequelize';
// import { DayCoinPriceModel } from '../interface/interface.day_coin_prices';
// import db from '../../helpers/common/db';

// interface DayCoinPriceCreationModel
// extends Optional<DayCoinPriceModel, 'id'> {}

// interface DayCoinPriceInstance 
// extends Model<DayCoinPriceModel, DayCoinPriceCreationModel>, DayCoinPriceModel {}

// const dataObj = {
//   id: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   coin_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//   },
//   coin_family: {
//     type: DataTypes.TINYINT,
//     allowNull: false,
//   },
//   price: {
//     type: DataTypes.DOUBLE,
//     allowNull: false,
//   },
// };

// const dataObjIndex = {
//   createdAt: 'created_at',
//   updatedAt: 'updated_at'
// }

// const Write = db.db_write.define<DayCoinPriceInstance>('day_coin_prices', dataObj, dataObjIndex);
// const Read = db.db_read.define<DayCoinPriceInstance>('day_coin_prices', dataObj, dataObjIndex);

// export const DayCoinPrice = {
//   DayCoinPriceWrite: Write,
//   DayCoinPriceRead: Read,
// };