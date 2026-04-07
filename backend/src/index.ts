import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

import { getDb } from './db/schema';
import restaurantRouter from './routes/restaurant';
import customersRouter from './routes/customers';
import passesRouter from './routes/passes';
import notificationsRouter from './routes/notifications';
import registerRouter from './routes/register';
import statsRouter from './routes/stats';
import { sendToAllCustomers } from './services/pushNotifications';
import { requireApiToken } from './middleware/auth';
import { apiLimiter, corsMiddleware, securityHeaders } from './middleware/security';

dotenv.config();

function hasDefaultScopedToken(rawScoped: string): boolean {
  if (!rawScoped.trim()) return false;
  return rawScoped
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      const sep = entry.indexOf(':');
      if (sep <= 0 || sep >= entry.length - 1) return false;
      const token = entry.slice(sep + 1).trim();
      return token === 'change-me';
    });
}

function validateSecurityConfig(): void {
  const globalToken = String(process.env.ADMIN_API_TOKEN || '').trim();
  const scopedTokens = String(process.env.ADMIN_API_TOKENS || '');
  const allowInsecure = String(process.env.ALLOW_INSECURE_DEFAULT_TOKEN || '').trim() === 'true';

  if (!allowInsecure && (globalToken === 'change-me' || hasDefaultScopedToken(scopedTokens))) {
    console.error('[SECURITY] Refus de demarrage: token API par defaut detecte (change-me).');
    console.error('[SECURITY] Definissez ADMIN_API_TOKEN/ADMIN_API_TOKENS ou ALLOW_INSECURE_DEFAULT_TOKEN=true pour bypass local.');
    process.exit(1);
  }
}

validateSecurityConfig();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);
app.use('/api', requireApiToken);

// Routes API
app.use('/api/restaurant', restaurantRouter);
app.use('/api/customers', customersRouter);
app.use('/api/passes', passesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/stats', statsRouter);

// Page d'inscription publique (avant le fallback SPA)
app.use('/register', registerRouter);

// Background cron: check scheduled notifications every minute
cron.schedule('* * * * *', async () => {
  try {
    const db = getDb();
    const now = new Date().toISOString();

    const pending = db.prepare(`
      SELECT n.*, r.name as restaurant_name
      FROM notifications n
      JOIN restaurants r ON r.id = n.restaurant_id
      WHERE n.status = 'scheduled' AND n.scheduled_at <= ?
    `).all(now) as any[];

    for (const notif of pending) {
      console.log(`[CRON] Sending scheduled notification: "${notif.title}"`);

      try {
        const sentCount = await sendToAllCustomers(
          notif.restaurant_id,
          notif.title,
          notif.body,
          notif.restaurant_name
        );

        db.prepare(`
          UPDATE notifications SET status = 'sent', sent_at = ?, recipients_count = ?
          WHERE id = ?
        `).run(new Date().toISOString(), sentCount, notif.id);

        console.log(`[CRON] Notification sent to ${sentCount} customers`);
      } catch (err) {
        db.prepare('UPDATE notifications SET status = ? WHERE id = ?').run('failed', notif.id);
        console.error(`[CRON] Failed to send notification ${notif.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[CRON] Error checking scheduled notifications:', err);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    wallet_live_mode: process.env.WALLET_LIVE_MODE === 'true',
    push_live_mode: process.env.PUSH_LIVE_MODE === 'true',
    timestamp: new Date().toISOString(),
  });
});

// Serve Expo web static build (frontend + API on same server = same origin)
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
  console.log(`🌐 Frontend served from: ${publicDir}`);
}

app.listen(PORT, () => {
  console.log(`\n🚀 Fidelity Web running on port ${PORT}`);
  console.log(`📊 Wallet mode: ${process.env.WALLET_LIVE_MODE === 'true' ? '✅ LIVE' : '⚠️ SETUP REQUIRED'}`);
  console.log(`📣 Push mode: ${process.env.PUSH_LIVE_MODE === 'true' ? '✅ LIVE' : '⚠️ DRY RUN'}`);
  console.log(`🗄️  Database: ${process.env.DB_PATH || './fidelity.db'}`);
  console.log(`\n🌐 Ouvrez la web app: http://localhost:${PORT}`);
});

export default app;
