import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const securityHeaders = helmet({
  // Keep CSP disabled for now because static Expo web output may include inline bundles/styles.
  contentSecurityPolicy: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requetes, reessayez plus tard.' },
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = parseAllowedOrigins();

    // Allow non-browser clients and same-origin browser requests.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin non autorisee par CORS'));
  },
});