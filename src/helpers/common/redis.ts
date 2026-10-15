import { createClient } from "redis";
import { config } from "../../config";

// redis 3 converted non-string values to strings; the current client expects strings or buffers
const toRedisValue = (value: any): string | Buffer =>
  Buffer.isBuffer(value) ? value : typeof value === "string" ? value : String(value);

class RedisServer {
  public client_write!: ReturnType<typeof createClient>;

  constructor() {
    this.initiateConnection();
  }

  public async initiateConnection(): Promise<void> {
    this.client_write = createClient({ url: config.REDIS_CONN });
    this.client_write.on("connect", () => {
    });
    // without an 'error' listener the client would crash the process on a connection error
    this.client_write.on("error", (err: any) => {
      console.error("redis client error", err?.message || err);
    });
    // commands sent before the connection is ready are queued by the client
    this.client_write.connect().catch((err: any) => {
      console.error("redis connect error", err?.message || err);
    });
  }
  public async getKeyValuePair(keyName: string, field: string) {
    const value = await this.client_write.hGet(keyName, field.toUpperCase() || '');
    return value;
  }
  public async setKeyValuePair(keyName: string, field: string, value: string) {
    this.client_write.hSet(keyName, field.toUpperCase(), toRedisValue(value)).catch((err: any) => {
      console.error("redis setKeyValuePair error...", err);
    });
  }
  public async set_hash_table(key: string, field: any, value: any) {
    try {
      this.client_write.hSet(key, field.toUpperCase(), toRedisValue(value)).catch((err: any) => {
        console.error('redis set string data error...', err)
      });
    } catch (err: any) {
      console.error('💥 ~ ~ set_hash_table error');
      throw err;
    }
  }

}

const redisClient = new RedisServer();
export default redisClient;
