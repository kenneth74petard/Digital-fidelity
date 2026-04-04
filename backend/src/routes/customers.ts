import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';

const router = Router();

// GET /api/customers?restaurantId=xxx&search=xxx&filter=xxx
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { restaurantId, search, filter } = req.query as Record<string, string>;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId est requis' });
    }

    let query = `
      SELECT c.*, p.serial_number
      FROM customers c
      LEFT JOIN passes p ON p.customer_id = c.id
      WHERE c.restaurant_id = ?
    `;
    const params: (string | number)[] = [restaurantId];

    if (search) {
      query += ` AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (filter === 'active') {
      query += ` AND c.created_at >= datetime('now', '-30 days')`;
    } else if (filter === 'reward') {
      query += ` AND c.stamps >= (SELECT stamp_goal FROM restaurants WHERE id = c.restaurant_id)`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const customers = db.prepare(query).all(...params);
    return res.json({ data: customers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/customers
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const {
      restaurant_id,
      first_name,
      last_name,
      email,
      phone,
      gdpr_consent,
      marketing_consent,
    } = req.body;

    if (!restaurant_id || !first_name || !last_name || !email) {
      return res.status(400).json({ error: 'Champs requis: restaurant_id, first_name, last_name, email' });
    }

    if (!gdpr_consent) {
      return res.status(400).json({ error: 'Le consentement RGPD est obligatoire' });
    }

    // Check email uniqueness within restaurant
    const existing = db.prepare(
      'SELECT id FROM customers WHERE email = ? AND restaurant_id = ?'
    ).get(email, restaurant_id);
    if (existing) {
      return res.status(409).json({ error: 'Un client avec cet email existe déjà' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers (id, restaurant_id, first_name, last_name, email, phone, gdpr_consent, marketing_consent, gdpr_consent_at, marketing_consent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      restaurant_id,
      first_name,
      last_name,
      email,
      phone || null,
      gdpr_consent ? 1 : 0,
      marketing_consent ? 1 : 0,
      gdpr_consent ? now : null,
      marketing_consent ? now : null
    );

    // Create pass for customer
    const passId = uuidv4();
    db.prepare(`
      INSERT INTO passes (id, customer_id, serial_number, auth_token)
      VALUES (?, ?, ?, ?)
    `).run(passId, id, uuidv4(), uuidv4());

    // Log GDPR consent
    db.prepare(`
      INSERT INTO gdpr_log (id, customer_id, action, performed_by)
      VALUES (?, ?, 'consent_given', 'customer')
    `).run(uuidv4(), id);

    const customer = db.prepare(`
      SELECT c.*, p.serial_number FROM customers c
      LEFT JOIN passes p ON p.customer_id = c.id
      WHERE c.id = ?
    `).get(id);

    return res.status(201).json({ data: customer });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur lors de la création du client' });
  }
});

// GET /api/customers/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const customer = db.prepare(`
      SELECT c.*, p.serial_number, p.auth_token
      FROM customers c
      LEFT JOIN passes p ON p.customer_id = c.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    return res.json({ data: customer });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/customers/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { first_name, last_name, email, phone, marketing_consent } = req.body;

    const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    db.prepare(`
      UPDATE customers
      SET first_name = ?, last_name = ?, email = ?, phone = ?, marketing_consent = ?
      WHERE id = ?
    `).run(first_name, last_name, email, phone || null, marketing_consent ? 1 : 0, req.params.id);

    // Log data update
    db.prepare(`
      INSERT INTO gdpr_log (id, customer_id, action, performed_by)
      VALUES (?, ?, 'data_updated', 'restaurant_owner')
    `).run(uuidv4(), req.params.id);

    const customer = db.prepare(`
      SELECT c.*, p.serial_number FROM customers c
      LEFT JOIN passes p ON p.customer_id = c.id
      WHERE c.id = ?
    `).get(req.params.id);

    return res.json({ data: customer });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/customers/:id — GDPR erasure
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();

    const customer = db.prepare('SELECT id, email FROM customers WHERE id = ?').get(req.params.id) as { id: string; email: string } | undefined;
    if (!customer) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Log erasure BEFORE deleting
    db.prepare(`
      INSERT INTO gdpr_log (id, customer_id, action, performed_by)
      VALUES (?, ?, 'data_erased_gdpr', 'restaurant_owner')
    `).run(uuidv4(), req.params.id);

    // Cascade delete: stamps_history, passes, then customer
    db.prepare('DELETE FROM stamps_history WHERE customer_id = ?').run(req.params.id);
    db.prepare('DELETE FROM passes WHERE customer_id = ?').run(req.params.id);
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);

    return res.json({ message: 'Client et toutes ses données supprimées conformément au RGPD' });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// POST /api/customers/:id/stamp
router.post('/:id/stamp', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { note } = req.body;

    const customer = db.prepare(`
      SELECT c.*, r.stamp_goal, r.points_per_visit
      FROM customers c
      JOIN restaurants r ON r.id = c.restaurant_id
      WHERE c.id = ?
    `).get(req.params.id) as any;

    if (!customer) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    let newStamps = customer.stamps + 1;
    let rewardClaimed = false;
    let newPoints = customer.points + customer.points_per_visit;

    // Auto-reward when goal reached
    if (newStamps >= customer.stamp_goal) {
      newStamps = 0; // Reset stamps
      rewardClaimed = true;

      // Log reward
      db.prepare(`
        INSERT INTO stamps_history (id, customer_id, action, value, note)
        VALUES (?, ?, 'reward_claimed', ?, 'Récompense obtenue - tampons réinitialisés')
      `).run(uuidv4(), req.params.id, customer.stamp_goal);
    }

    // Update customer
    db.prepare(`
      UPDATE customers
      SET stamps = ?, points = ?, total_visits = total_visits + 1
      WHERE id = ?
    `).run(newStamps, newPoints, req.params.id);

    // Log stamp
    db.prepare(`
      INSERT INTO stamps_history (id, customer_id, action, value, note)
      VALUES (?, ?, 'stamp_added', 1, ?)
    `).run(uuidv4(), req.params.id, note || 'Tampon ajouté');

    // Log points
    db.prepare(`
      INSERT INTO stamps_history (id, customer_id, action, value, note)
      VALUES (?, ?, 'points_added', ?, 'Points par visite')
    `).run(uuidv4(), req.params.id, customer.points_per_visit);

    const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);

    return res.json({
      data: updatedCustomer,
      reward_claimed: rewardClaimed,
      message: rewardClaimed
        ? `🎉 Félicitations ! ${customer.first_name} a obtenu sa récompense !`
        : `✅ Tampon ajouté pour ${customer.first_name}`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur lors de l\'ajout du tampon' });
  }
});

// POST /api/customers/:id/points
router.post('/:id/points', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { points, note } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ error: 'Le nombre de points doit être positif' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any;
    if (!customer) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    db.prepare('UPDATE customers SET points = points + ? WHERE id = ?').run(points, req.params.id);

    db.prepare(`
      INSERT INTO stamps_history (id, customer_id, action, value, note)
      VALUES (?, ?, 'points_added', ?, ?)
    `).run(uuidv4(), req.params.id, points, note || 'Points ajoutés manuellement');

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    return res.json({ data: updated, message: `${points} points ajoutés` });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/customers/:id/history
router.get('/:id/history', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const history = db.prepare(`
      SELECT * FROM stamps_history
      WHERE customer_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(req.params.id);

    return res.json({ data: history });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
