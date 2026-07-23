const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || null;

let redis = null;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
    redis.on('error', () => { redis = null; });
    redis.on('connect', () => { console.log('Redis terhubung.'); });
  } catch { redis = null; }
}

function getRedis() { return redis; }

function isRedisAvailable() { return redis !== null; }

module.exports = { getRedis, isRedisAvailable };
