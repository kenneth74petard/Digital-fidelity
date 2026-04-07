import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import webpush from 'web-push';
import { getDb } from '../db/schema';

const router = Router();

function getRestaurantScopeId(req: Request): string {
  return String(req.restaurantScopeId || '').trim();
}

// POST /api/restaurant/setup — Create first restaurant
router.post('/setup', (req: Request, res: Response) => {
  try {
    const scopeRestaurantId = getRestaurantScopeId(req);
    if (scopeRestaurantId) {
      return res.status(403).json({
        error: 'Token scope restaurant: setup interdit. Utilisez un token global temporaire pour initialiser.',
      });
    }

    const db = getDb();
    const {
      name,
      description,
      color_primary,
      color_secondary,
      logo_emoji,
      loyalty_type,
      stamp_goal,
      points_per_visit,
    } = req.body;

    const safeName = String(name || '').trim();
    const safeDescription = description ? String(description).trim() : null;
    const safeLoyaltyType = loyalty_type === 'points' ? 'points' : 'stamps';
    const safeStampGoal = Number.isFinite(Number(stamp_goal)) ? Math.max(1, Math.min(30, Number(stamp_goal))) : 10;
    const safePointsPerVisit = Number.isFinite(Number(points_per_visit)) ? Math.max(1, Math.min(10000, Number(points_per_visit))) : 100;

    if (!safeName) {
      return res.status(400).json({ error: 'Le nom du restaurant est requis' });
    }

    if (safeName.length > 100) {
      return res.status(400).json({ error: 'Le nom du restaurant est trop long' });
    }

    const envPublicKey = process.env.VAPID_PUBLIC_KEY;
    const envPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidKeys = (envPublicKey && envPrivateKey)
      ? { publicKey: envPublicKey, privateKey: envPrivateKey }
      : webpush.generateVAPIDKeys();

    const id = uuidv4();
    db.prepare(`
      INSERT INTO restaurants (id, name, description, color_primary, color_secondary, logo_emoji, loyalty_type, stamp_goal, points_per_visit, vapid_public_key, vapid_private_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      safeName,
      safeDescription,
      color_primary || '#c9a84c',
      color_secondary || '#1a1a24',
      logo_emoji || '🍽️',
      safeLoyaltyType,
      safeStampGoal,
      safePointsPerVisit,
      vapidKeys.publicKey,
      null
    );

    const restaurant = db.prepare(
      'SELECT id, name, description, color_primary, color_secondary, logo_emoji, loyalty_type, stamp_goal, points_per_visit, vapid_public_key, created_at FROM restaurants WHERE id = ?'
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
    const scopeRestaurantId = getRestaurantScopeId(req);
    if (scopeRestaurantId && req.params.id !== scopeRestaurantId) {
      return res.status(403).json({ error: 'Acces refuse a ce restaurant' });
    }

    const db = getDb();
    const restaurant = db.prepare(
      'SELECT id, name, description, color_primary, color_secondary, logo_emoji, loyalty_type, stamp_goal, points_per_visit, vapid_public_key, created_at FROM restaurants WHERE id = ?'
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
    const scopeRestaurantId = getRestaurantScopeId(req);
    if (scopeRestaurantId && req.params.id !== scopeRestaurantId) {
      return res.status(403).json({ error: 'Acces refuse a ce restaurant' });
    }

    const db = getDb();
    const {
      name,
      description,
      color_primary,
      color_secondary,
      logo_emoji,
      loyalty_type,
      stamp_goal,
      points_per_visit,
    } = req.body;

    const existing = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }

    db.prepare(`
      UPDATE restaurants
      SET name = ?, description = ?, color_primary = ?, color_secondary = ?,
          logo_emoji = ?, loyalty_type = ?, stamp_goal = ?, points_per_visit = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      description ?? existing.description,
      color_primary ?? existing.color_primary,
      color_secondary ?? existing.color_secondary,
      logo_emoji ?? existing.logo_emoji,
      loyalty_type ?? existing.loyalty_type,
      stamp_goal ?? existing.stamp_goal,
      points_per_visit ?? existing.points_per_visit,
      req.params.id
    );

    const updated = db.prepare(
      'SELECT id, name, description, color_primary, color_secondary, logo_emoji, loyalty_type, stamp_goal, points_per_visit, vapid_public_key, created_at FROM restaurants WHERE id = ?'
    ).get(req.params.id);
    return res.json({ data: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
