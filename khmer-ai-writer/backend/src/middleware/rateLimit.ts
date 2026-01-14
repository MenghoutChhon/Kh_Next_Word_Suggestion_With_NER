import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { config } from '../config/env';

export const rateLimit = expressRateLimit({
  windowMs: config.expressRateLimit.windowMs,
  max: config.expressRateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export default rateLimit;