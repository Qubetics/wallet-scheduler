// import { DataTypes, Model, Optional } from "sequelize";
// import { OnOffRampFiatsInterface } from "../interface/interface.on_off_ramp_fiats";
// import db from "../../helpers/common/db";

// interface OnOffRampFiatsCreationModel extends Optional<OnOffRampFiatsInterface, "id"> { }
// interface OnOffRampFiatsInstance
//     extends Model<OnOffRampFiatsInterface, OnOffRampFiatsCreationModel>,
//     OnOffRampFiatsInterface { }

// const dataObj = {
//     id: {
//         type: DataTypes.INTEGER,
//         allowNull: false,
//         primaryKey: true,
//         autoIncrement: true,
//     },
//     country_name: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     country_code: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     fiat_currency: {
//         type: DataTypes.STRING,
//         allowNull: false,
//     },
//     alchemy_payment_details: {
//         type: DataTypes.JSON,
//         allowNull: true,
//     },
//     transak_payment_detials: {
//         type: DataTypes.JSON,
//         allowNull: true,
//     }
// };

// export const OnOffRampFiatsModel = db.db_write.define<OnOffRampFiatsInstance>("on_off_ramp_fiats", dataObj);