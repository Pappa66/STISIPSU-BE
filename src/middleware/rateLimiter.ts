const rateLimit = require('express-rate-limit');
const { isRedisAvailable } = require('../utils/redis');

const minute = 60 * 1000;

const createRateLimiter = ({
  windowMs = 15 * minute,
  max = 100,
  message = 'Terlalu banyak permintaan. Coba lagi nanti.',
  keyPrefix = 'rl',
} = {}) => {
  const config: any = {
    windowMs,
    max,
    message: { status: 429, message },
    standardHeaders: true,
    legacyHeaders: false,
  };

  if (isRedisAvailable()) {
    const RedisStore = require('rate-limit-redis');
    const Redis = require('ioredis');
    const client = new Redis(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL);
    config.store = new RedisStore({ sendCommand: (...args) => client.call(...args), prefix: keyPrefix });
  }

  return rateLimit(config);
};

const publicLimiter = createRateLimiter({
  windowMs: 1 * minute,
  max: 60,
  message: 'Terlalu banyak permintaan ke server. Silakan coba lagi.',
  keyPrefix: 'rl_public',
});

const authLimiter = createRateLimiter({
  windowMs: 15 * minute,
  max: 20,
  message: 'Terlalu banyak percobaan login. Coba lagi 15 menit lagi.',
  keyPrefix: 'rl_auth',
});

const apiLimiter = createRateLimiter({
  windowMs: 1 * minute,
  max: 120,
  message: 'Terlalu banyak permintaan ke API.',
  keyPrefix: 'rl_api',
});

module.exports = { createRateLimiter, publicLimiter, authLimiter, apiLimiter };
