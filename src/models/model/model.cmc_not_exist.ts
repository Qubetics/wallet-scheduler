import { DataTypes, Model, Optional } from "sequelize";
import { CMCDataNotExistInterface } from '../interface/interface.cmc_data_not_exist'
import db from "../../helpers/common/db";
interface CMCDataNotExistCreationModel extends Optional<CMCDataNotExistInterface, "id"> { }
interface CMCDataNotExistInstance
    extends Model<CMCDataNotExistInterface, CMCDataNotExistCreationModel>,
    CMCDataNotExistInterface { }
let dataObj = {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    cmc_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fiat_type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    token_address: {
        type: DataTypes.TINYINT,
        allowNull: true
    }
};

export const CMCDataNotExistModel = db.db_write.define<CMCDataNotExistInstance>(
    "cmc_data_not_exists",
    dataObj
);
