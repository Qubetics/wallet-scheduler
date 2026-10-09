import redis from "redis";
import { promisify } from "util";
import { config } from "../../config";

class RedisServer {
  public clientWrite: redis.RedisClient;

  constructor() {
    this.initiateConnection();
  }

  public async initiateConnection(): Promise<void> {
    this.clientWrite = redis.createClient({ url: config.REDIS_CONN });
    this.clientWrite.on("connect", () => {
    });
  }
  public async getKeyValuePair(keyName: string, field: string) {
    const getAsync = promisify(this.clientWrite.hget).bind(this.clientWrite);
    const value = await getAsync(keyName, field.toUpperCase() || '');
    return value;
  }
  public async setKeyValuePair(keyName: string, field: string, value: string) {
    this.clientWrite.hset(keyName, field.toUpperCase(), value);
  }
  public async setHashTable(key: string, field: any, value: any) {
    try {
      this.clientWrite.HSET(key, field.toUpperCase(), value, (err: any, reply: any) => {
        if (err) {
          console.error('redis set string data error...', err)
        }
      });
    } catch (err: any) {
      console.error('💥 ~ ~ setHashTable error');
      throw err;
    }
  }

}

const redisClient = new RedisServer();
export default redisClient;
