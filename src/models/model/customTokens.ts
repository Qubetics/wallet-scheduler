import { DataTypes, Model, Optional } from "sequelize";
import { CustomTokenInterface } from "../interface/customTokens";
import db from "../../helpers/common/db";

interface CustomTokenCreationModel extends Optional<CustomTokenInterface, "id"> { }
interface CustomTokenInstance extends Model<CustomTokenInterface, CustomTokenCreationModel>, CustomTokenInterface { }

const dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    coin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
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

const CustomTokenWrite = db.db_write.define<CustomTokenInstance>('custom_token', dataObj);
const CustomTokenRead = db.db_read.define<CustomTokenInstance>('custom_token', dataObj);
export const CustomToken = {
    CustomTokenWrite: CustomTokenWrite,
    CustomTokenRead: CustomTokenRead,
};

