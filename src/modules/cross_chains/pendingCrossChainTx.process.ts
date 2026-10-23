import { Op } from "sequelize";
import { ITrnxHistoryInterface } from "../../models/interface/interface.trnxHistory";
import TrnxHistoryModel from "../../models/model/model.trnxHistory";
import KafkaHelper from "../../helpers/common/kafka.helper";
import { config } from "../../config";

class PendingCrossChainProcess {
    public async getTransactionFromDB(coin_family: number) {
        try {
            let where: any = {
                blockchain_status: 'confirmed', type: 'cross_chain', order_id: { [Op.ne]: null }, [Op.or]: [{ order_status: 'pending' }, { order_status: 'processing' }]
            }
            if (coin_family !== 0) {
                where.coin_family = coin_family;
            }
            const txns: { rows: ITrnxHistoryInterface[], count: number } = await TrnxHistoryModel.findAndCountAll({
                attributes: ['id', 'from_adrs', 'to_adrs', 'order_id'],
                where: where,
                logging: true
            });
            if (txns.count > 0) {
                for await (const el of txns.rows) {
                    await this.addTxToQueue({ id: el.id, from_adrs: el.from_adrs, to_adrs: el.to_adrs, order_id: el.order_id })
                    await TrnxHistoryModel.update({
                        order_status: 'processing'
                    },
                        { where: { id: el.id } }
                    )
                }
            }
        } catch (err: any) {
            console.error("💥 ~ getTransactionFromDB error", err)
        }
    };
    public async addTxToQueue(data: {
        id: number,
        from_adrs: string | null,
        to_adrs: string,
        order_id: string | null
    }) {
        try {
            await KafkaHelper.produceMessage(config.PENDING_CROSS_CHAIN_TX_TOPIC, data)
        } catch (err: any) {
            console.error("💥 ~ addTxToQueue error", err)
        }
    }
}
const pendingCrossChainProcess = new PendingCrossChainProcess();
export default pendingCrossChainProcess;