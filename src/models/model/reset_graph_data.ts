import { DataTypes, Model, Optional } from "sequelize";
import { ResetGraphModel } from "../interface/reset_graph_data";
import db from "../../helpers/common/db";

interface ResetGraphCreationModel extends Optional<ResetGraphModel, "id"> { }
interface ResetGraphInstance extends Model<ResetGraphModel, ResetGraphCreationModel>, ResetGraphModel { }

let dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    cmc_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    graph_type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
    }
};
let dataObjIndex = {
    createdAt: false,
    updatedAt: false,
    indexes: [
        {
            unique: false,
            fields: ["coin_type"],
        },
        {
            unique: false,
            fields: ["fiat_type"],
        },
    ],
};

const ResetGraphWrite = db.db_write.define<ResetGraphInstance>('reset_graph_data', dataObj, dataObjIndex);
const ResetGraphRead = db.db_read.define<ResetGraphInstance>('reset_graph_data', dataObj, dataObjIndex);


export default {
    ResetGraphWrite: ResetGraphWrite,
    ResetGraphRead: ResetGraphRead,
};