import redis from "redis";
import { promisify } from "util";
import { config } from "../../config";

class RedisServer {
  public client_write: redis.RedisClient;

  constructor() {
    this.initiateConnection();
  }

  public async initiateConnection(): Promise<void> {
    this.client_write = redis.createClient({ url: config.REDIS_CONN });
    this.client_write.on("connect", () => {
    });
  }
  public async getKeyValuePair(keyName: string, field: string) {
    const getAsync = promisify(this.client_write.hget).bind(this.client_write);
    const value = await getAsync(keyName, field.toUpperCase() || '');
    return value;
  }
  public async setKeyValuePair(keyName: string, field: string, value: string) {
    this.client_write.hset(keyName, field.toUpperCase(), value);
  }
}

const redisClient = new RedisServer();
export default redisClient;
