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
  // public deleteKeyValuePair = async (keyName: string, field: string) => {
  //   this.client_write.hdel(keyName, field, function (err) {
  //     if (err) {
  //       throw err;
  //     }
  //     return true;
  //   });
  // }
  public async setKeyValuePair(keyName: string, field: string, value: string) {
    this.clientWrite.hset(keyName, field.toUpperCase(), value);
  }
  // public async setRedisSting(key: string, value: number) {
  //   this.client_write.set(key, value.toString());
  // }
  // public async getRedisSting(key: string) {
  //   const getAsync = promisify(this.client_write.get).bind(this.client_write);
  //   const value = await getAsync(key);
  //   if (value) return value;
  //   return null;
  // }
  public async setHashTable(key: string, field: any, value: any) {
    try {
      this.clientWrite.HSET(key, field.toUpperCase(), value, (err: any, reply: any) => {
        if (err) {
          console.error('redis set string data error...', err)
        }
      });
      // if (expiryInSeconds) {
      //    this.client_write.EXPIRE(key, expiryInSeconds);
      // }
    } catch (err: any) {
      console.error('💥 ~ ~ setHashTable error');
      throw err;
    }
  }

}

const redisClient = new RedisServer();
export default redisClient;
