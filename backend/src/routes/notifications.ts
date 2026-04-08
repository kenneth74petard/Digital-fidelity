import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';
import { sendToAllCustomers } from '../services/pushNotifications';

const router = Router();

function getRestaurantScopeId(req: Request, res: Response): string | null {
  const scopeId = String(req.restaurantScopeId || '').trim();
  if (!scopeId) {
    res.status(403).json({ error: 'Scope restaurant introuvable pour cette requete' });
    return null;
  }
  return scopeId;
}

// POST /api/notifications/send — Immediate push to all marketing-consented customers
router.post('/send', async (req: Request, res: Response) => {
  try {
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();
    const { restaurant_id, title, body, type } = req.body;

    if (!restaurant_id || !title || !body) {
      return res.status(400).json({ error: 'Champs requis: restaurant_id, title, body' });
    }

    if (String(restaurant_id) !== scopeRestaurantId) {
      return res.status(403).json({ error: 'Acces refuse a ce restaurant' });
    }

    if (title.length > 50) {
      return res.status(400).json({ error: 'Le titre ne doit pas dépasser 50 caractères' });
    }

    if (body.length > 150) {
      return res.status(400).json({ error: 'Le message ne doit pas dépasser 150 caractères' });
    }

    const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(restaurant_id) as any;
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }

    // Count eligible recipients
    const recipientsCount = (db.prepare(`
      SELECT COUNT(*) as count FROM customers
      WHERE restaurant_id = ? AND marketing_consent = 1
    `).get(restaurant_id) as any).count;

    const notifId = uuidv4();
    const now = new Date().toISOString();

    // Create notification record as draft until send result is known
    db.prepare(`
      INSERT INTO notifications (id, restaurant_id, title, body, type, sent_at, recipients_count, status)
      VALUES (?, ?, ?, ?, ?, NULL, ?, 'draft')
    `).run(notifId, restaurant_id, title, body, type || 'general', recipientsCount);

    let sentCount = 0;
    try {
      // Send notifications (or dry-run logging when push live mode is disabled)
      sentCount = await sendToAllCustomers(restaurant_id, title, body, restaurant.name);
      db.prepare(`
        UPDATE notifications
        SET status = 'sent', sent_at = ?, recipients_count = ?
        WHERE id = ?
      `).run(now, sentCount, notifId);
    } catch (sendError) {
      db.prepare(`
        UPDATE notifications
        SET status = 'failed', sent_at = ?
        WHERE id = ?
      `).run(now, notifId);
      throw sendError;
    }

    return res.json({
      data: { id: notifId, sent_count: sentCount },
      message: `Notification envoyée à ${sentCount} client(s)`,
      push_dry_run: process.env.PUSH_LIVE_MODE !== 'true',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi de la notification' });
  }
});

// POST /api/notifications/schedule — Schedule future notification
router.post('/schedule', (req: Request, res: Response) => {
  try {
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();
    const { restaurant_id, title, body, type, scheduled_at } = req.body;

    if (!restaurant_id || !title || !body || !scheduled_at) {
      return res.status(400).json({ error: 'Champs requis: restaurant_id, title, body, scheduled_at' });
    }

    if (String(restaurant_id) !== scopeRestaurantId) {
      return res.status(403).json({ error: 'Acces refuse a ce restaurant' });
    }

    if (title.length > 50) {
      return res.status(400).json({ error: 'Le titre ne doit pas depasser 50 caracteres' });
    }

    if (body.length > 150) {
      return res.status(400).json({ error: 'Le message ne doit pas depasser 150 caracteres' });
    }

    const scheduledDate = new Date(scheduled_at);
    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Date de planification invalide' });
    }
    const minDate = new Date(Date.now() + 60 * 60 * 1000); // +1 hour minimum

    if (scheduledDate < minDate) {
      return res.status(400).json({ error: 'La date doit être au moins 1 heure dans le futur' });
    }

    // Count eligible recipients
    const recipientsCount = (db.prepare(`
      SELECT COUNT(*) as count FROM customers
      WHERE restaurant_id = ? AND marketing_consent = 1
    `).get(restaurant_id) as any).count;

    const notifId = uuidv4();
    db.prepare(`
      INSERT INTO notifications (id, restaurant_id, title, body, type, scheduled_at, recipients_count, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `).run(notifId, restaurant_id, title, body, type || 'general', scheduledDate.toISOString(), recipientsCount);

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifId);
    return res.status(201).json({
      data: notification,
      message: `Notification planifiée pour le ${scheduledDate.toLocaleDateString('fr-FR')}`,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur lors de la planification' });
  }
});

// GET /api/notifications/:restaurantId — List all notifications
router.get('/:restaurantId', (req: Request, res: Response) => {
  try {
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    if (req.params.restaurantId !== scopeRestaurantId) {
      return res.status(403).json({ error: 'Acces refuse a ce restaurant' });
    }

    const db = getDb();
    const parsedLimit = Number.parseInt(String(req.query.limit ?? '50'), 10);
    const parsedOffset = Number.parseInt(String(req.query.offset ?? '0'), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 50;
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    const total = (db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE restaurant_id = ?'
    ).get(req.params.restaurantId) as any).count as number;

    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE restaurant_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.params.restaurantId, limit, offset);

    return res.json({
      data: notifications,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + notifications.length < total,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/notifications/:id — Cancel scheduled notification
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();
    const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND restaurant_id = ?').get(req.params.id, scopeRestaurantId) as any;

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    if (notification.status !== 'scheduled') {
      return res.status(400).json({ error: 'Seules les notifications planifiées peuvent être annulées' });
    }

    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Notification annulée' });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
