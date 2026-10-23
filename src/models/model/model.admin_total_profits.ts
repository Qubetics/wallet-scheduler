import { DataTypes, Model, Optional } from "sequelize";
import { AdminTotalProfitsInterface } from "../interface/interface.admin_total_profits";
import db from "../../helpers/common/db";

interface AdminTotalProfitsModel extends Optional<AdminTotalProfitsInterface, "id"> { }
interface AdminTotalProfitsInstance
    extends Model<AdminTotalProfitsInterface, AdminTotalProfitsModel>,
    AdminTotalProfitsInterface { }

let dataObj: any = {
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
    type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    sub_type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    trnx_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    order_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    fiat_amount: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    crypto_amount: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    crypto_type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fiat_fee: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    usd_price: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    crypto_fee: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    profit_percentage: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    crypto_profit_amount: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    fiat_profit_amount: {
        type: DataTypes.DOUBLE,
        allowNull: true
    },
    trnx_date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
    }
};

const AdminTotalProfitsModel = db.db_write.define<AdminTotalProfitsInstance>("admin_total_profits", dataObj);
export default AdminTotalProfitsModel;


