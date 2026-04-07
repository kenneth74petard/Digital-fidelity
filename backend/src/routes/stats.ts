import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';

const router = Router();

router.get('/:restaurantId', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { restaurantId } = req.params;
    const scopeRestaurantId = String(req.restaurantScopeId || '').trim();

    if (!scopeRestaurantId || scopeRestaurantId !== restaurantId) {
      return res.status(403).json({ error: 'Acces refuse a ce restaurant' });
    }

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

    const new_customers_per_day = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM customers
      WHERE restaurant_id = ?
      AND created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(restaurantId) as Array<{ date: string; count: number }>;

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

    return res.json({
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
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
