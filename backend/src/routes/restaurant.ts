import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import webpush from 'web-push';
import { getDb } from '../db/schema';

const router = Router();

// POST /api/restaurant/setup — Create first restaurant
router.post('/setup', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const {
      name,
      description,
      color_primary,
      color_secondary,
      logo_emoji,
      stamp_goal,
      points_per_visit,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom du restaurant est requis' });
    }

    // Generate VAPID keys for Web Push
    const vapidKeys = webpush.generateVAPIDKeys();

    const id = uuidv4();
    db.prepare(`
      INSERT INTO restaurants (id, name, description, color_primary, color_secondary, logo_emoji, stamp_goal, points_per_visit, vapid_public_key, vapid_private_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      description || null,
      color_primary || '#c9a84c',
      color_secondary || '#1a1a24',
      logo_emoji || '🍽️',
      stamp_goal || 10,
      points_per_visit || 100,
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    const restaurant = db.prepare(
      'SELECT id, name, description, color_primary, color_secondary, logo_emoji, stamp_goal, points_per_visit, vapid_public_key, created_at FROM restaurants WHERE id = ?'
    ).get(id);
    return res.status(201).json({ data: restaurant });
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du restaurant' });
  }
});

// GET /api/restaurant/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const restaurant = db.prepare(
      'SELECT id, name, description, color_primary, color_secondary, logo_emoji, stamp_goal, points_per_visit, vapid_public_key, created_at FROM restaurants WHERE id = ?'
    ).get(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }
    return res.json({ data: restaurant });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/restaurant/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const {
      name,
      description,
      color_primary,
      color_secondary,
      logo_emoji,
      stamp_goal,
      points_per_visit,
    } = req.body;

    const existing = db.prepare('SELECT id FROM restaurants WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }

    db.prepare(`
      UPDATE restaurants
      SET name = ?, description = ?, color_primary = ?, color_secondary = ?,
          logo_emoji = ?, stamp_goal = ?, points_per_visit = ?
      WHERE id = ?
    `).run(
      name,
      description || null,
      color_primary,
      color_secondary,
      logo_emoji,
      stamp_goal,
      points_per_visit,
      req.params.id
    );

    const updated = db.prepare(
      'SELECT id, name, description, color_primary, color_secondary, logo_emoji, stamp_goal, points_per_visit, vapid_public_key, created_at FROM restaurants WHERE id = ?'
    ).get(req.params.id);
    return res.json({ data: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
