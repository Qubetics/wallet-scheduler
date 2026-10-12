import { Kafka, KafkaConfig, logLevel } from 'kafkajs';
import { config } from '../../config';

class KafkaHelper {
    public kafka: any;

    private producer: any;

    constructor() {
        this.connect();
    }

    async connect() {
        const KAFKA_BROKER = config.KAFKA_BROKER.split(',');
        const kafkaCrednetials: KafkaConfig = {
            clientId: String(config.KAFKA_CLIENT_ID), // 'test'
            brokers: KAFKA_BROKER, // ['localhost:9092']
            logLevel : logLevel.NOTHING
        };
        this.kafka = new Kafka(kafkaCrednetials);
        this.producer = await this.kafka.producer();
        await this.producer.connect();
        console.log('producer connetced');
    }

    public async produceMessage(topic: string, messageData: any) {
        try {
            await this.producer.send({
                topic: topic,
                acks: 1,
                messages: [{ value: JSON.stringify(messageData) }],
            });
        } catch (error) {
            console.log('🔥 ~ ~ produceMessage error', error);
        }
    }

}

export default new KafkaHelper();
