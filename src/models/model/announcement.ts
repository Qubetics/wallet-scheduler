import { DataTypes, Model, Optional } from "sequelize";
import { AnnouncementInterface } from "../interface/announcements";
import db from "../../helpers/common/db";

interface AnnouncementModel extends Optional<AnnouncementInterface, "id"> { }
interface AnnouncementInstance
    extends Model<AnnouncementInterface, AnnouncementModel>,
    AnnouncementInterface { }

const dataObj: any = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('pending','sent'),
        allowNull: false,
        defaultValue: 'pending',
    }
};

const options = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['status']
        }
    ]
}

const AnnouncementModel = db.db_write.define<AnnouncementInstance>("announcements", dataObj, options);
export default AnnouncementModel;