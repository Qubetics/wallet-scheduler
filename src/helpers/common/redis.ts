import redis from "redis";
import { promisify } from "util";
import { config } from "../../config";

class RedisServer {
  // public client_read: redis.RedisClient;
  public client_write: redis.RedisClient;

  constructor() {
    this.initiateConnection();
  }

  public async initiateConnection(): Promise<void> {
    this.client_write = redis.createClient({ url: config.REDIS_CONN });
    this.client_write.on("connect", () => {
      // console.log("Connected to redis client successfully");
    });
  }
  public async getKeyValuePair(keyName: string, field: string) {
    const getAsync = promisify(this.client_write.hget).bind(this.client_write);
    const value = await getAsync(keyName, field.toUpperCase() || '');
    return value;
  }
  public deleteKeyValuePair = async (keyName: string, field: string) => {
    this.client_write.hdel(keyName, field, function (err) {
      if (err) {
        throw err;
      }
      return true;
    });
  }
  public async setKeyValuePair(keyName: string, field: string, value: string) {
    this.client_write.hset(keyName, field.toUpperCase(), value);
  }
  public async setRedisSting(key: string, value: number) {
    this.client_write.set(key, value.toString());
  }
  public async getRedisSting(key: string) {
    const getAsync = promisify(this.client_write.get).bind(this.client_write);
    const value = await getAsync(key);
    if (value) return value;
    return null;
  }

}

const redisClient = new RedisServer();
export default redisClient;
