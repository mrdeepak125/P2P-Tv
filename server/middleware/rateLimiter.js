import rateLimit from 'express-rate-limit';

// Rate limiter for room creation: 20 per 15 minutes per IP
export const createRoomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many rooms created from this IP. Please try again after 15 minutes.',
  },
});

// Rate limiter for joining / guessing 4-char room codes: 30 attempts per minute to prevent brute forcing
export const joinRoomLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many room code attempts. Please wait 60 seconds.',
  },
});

// General API limiter: 300 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

