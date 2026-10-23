import { DataTypes, Model, Optional } from "sequelize";
import { SettingsInterface } from "../interface/interface.settings";
import db from "../../helpers/common/db";

interface SettingsCreationModel extends Optional<SettingsInterface, "id"> { }
interface SettingsInstance
    extends Model<SettingsInterface, SettingsCreationModel>,
    SettingsInterface { }

const dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    value: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
};

export const SettingsModel = db.db_write.define<SettingsInstance>(
    "settings",
    dataObj
);

