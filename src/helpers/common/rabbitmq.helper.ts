// import * as amqp from "amqplib/callback_api";
// import { LogsConstants } from "../../constants/index";
// import { config } from "../../config/index";
// class rabbitMq {
//     public channel: amqp.Channel;

//     constructor() {
//         // console.log("Starting RabbitMQ Server");
//         this.startServer();
//     }

//     public startServer = async () => {
//         try {
//             await this.connect();
//         } catch (error: any) {
//             console.error((error as Error).message);
//         }
//     };

//     public connect = async () => {
//         amqp.connect(config.RABBIT_MQ || "", (err, conn) => {
//             if (err) console.error(LogsConstants.RABBIT_MQ_CONNECTION_FAILED, err);
//             console.log(LogsConstants.RABBIT_MQ_CONNECTED);

//             conn.createChannel((err, ch) => {
//                 if (err) console.error(LogsConstants.RABBIT_MQ_CHANNEL_FAILED, err);
//                 this.channel = ch;

//                 console.log(LogsConstants.RABBIT_MQ_CHANNEL_CREATED);
//             });
//         });
//     };

//     public assertQueue = async (queueName: string) => {
//         this.channel.assertQueue(queueName, { durable: false }, (err, res) => {
//             if (err) console.error(`${LogsConstants.ASSERT_QUEUE_FAILED} ${queueName}`);
//         });
//     };

//     public sendToQueue = async (queueName: string, msg: Buffer) => {
//         this.channel.sendToQueue(queueName, msg);
//     };
//     public consumeQueue = async (
//         queueName: string,
//         cb: (data: any) => Promise<void>
//     ) => {
//         // console.log("CONSUME QUEUE WORKING HERE");
//         // for (const key in RabbitMQQueues) {
//         await this.assertQueue(queueName);
//         // }
//         this.channel.prefetch(1);
//         this.channel.consume(queueName, async (msg) => {
//             if (!msg) return;
//             const data: any = JSON.parse(msg.content.toString());
//             await cb(data);
//             this.channel.ack(msg);
//         });
//         // console.log("ENDED")
//     };

// }

// export let RabbitMq = new rabbitMq();
// //
