import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

import { getDb } from './db/schema';
import restaurantRouter from './routes/restaurant';
import customersRouter from './routes/customers';
import passesRouter from './routes/passes';
import notificationsRouter from './routes/notifications';
import { sendToAllCustomers } from './services/pushNotifications';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/restaurant', restaurantRouter);
app.use('/api/customers', customersRouter);
app.use('/api/passes', passesRouter);
app.use('/api/notifications', notificationsRouter);

// GET /api/stats/:restaurantId
app.get('/api/stats/:restaurantId', (req, res) => {
  try {
    const db = getDb();
    const { restaurantId } = req.params;

    const total_customers = (db.prepare(
      'SELECT COUNT(*) as count FROM customers WHERE restaurant_id = ?'
    ).get(restaurantId) as any).count;

    const active_customers = (db.prepare(`
      SELECT COUNT(*) as count FROM customers
      WHERE restaurant_id = ? AND created_at >= datetime('now', '-30 days')
    `).get(restaurantId) as any).count;

    const stamps_given_today = (db.prepare(`
      SELECT COUNT(*) as count FROM stamps_history sh
      JOIN customers c ON c.id = sh.customer_id
      WHERE c.restaurant_id = ? AND sh.action = 'stamp_added'
      AND sh.created_at >= datetime('now', 'start of day')
    `).get(restaurantId) as any).count;

    const stamps_given_week = (db.prepare(`
      SELECT COUNT(*) as count FROM stamps_history sh
      JOIN customers c ON c.id = sh.customer_id
      WHERE c.restaurant_id = ? AND sh.action = 'stamp_added'
      AND sh.created_at >= datetime('now', '-7 days')
    `).get(restaurantId) as any).count;

    const notifications_sent_total = (db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE restaurant_id = ? AND status = 'sent'
    `).get(restaurantId) as any).count;

    // New customers per day (last 7 days)
    const new_customers_per_day = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM customers
      WHERE restaurant_id = ?
      AND created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(restaurantId) as Array<{ date: string; count: number }>;

    // Fill missing days with 0
    const filledDays: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = new_customers_per_day.find((r) => r.date === dateStr);
      filledDays.push({ date: dateStr, count: found ? found.count : 0 });
    }

    const top_customers = db.prepare(`
      SELECT id, first_name, last_name, total_visits, points
      FROM customers
      WHERE restaurant_id = ?
      ORDER BY total_visits DESC
      LIMIT 5
    `).all(restaurantId);

    res.json({
      data: {
        total_customers,
        active_customers,
        stamps_given_today,
        stamps_given_week,
        notifications_sent_total,
        new_customers_per_day: filledDays,
        top_customers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

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
    simulation_mode: process.env.SIMULATION_MODE === 'true',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Fidelity Backend running on port ${PORT}`);
  console.log(`📊 Mode: ${process.env.SIMULATION_MODE === 'true' ? '🔶 SIMULATION' : '✅ PRODUCTION'}`);
  console.log(`🗄️  Database: ${process.env.DB_PATH || './fidelity.db'}`);
  console.log(`\nEndpoints disponibles:`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/api/restaurant/setup`);
  console.log(`  GET  http://localhost:${PORT}/api/customers?restaurantId=xxx`);
  console.log(`  GET  http://localhost:${PORT}/api/stats/:restaurantId`);
});

export default app;
