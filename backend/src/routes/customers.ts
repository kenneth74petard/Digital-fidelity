import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getRestaurantScopeId(req: Request, res: Response): string | null {
  const scopeId = String(req.restaurantScopeId || '').trim();
  if (!scopeId) {
    res.status(403).json({ error: 'Scope commerce introuvable pour cette requete' });
    return null;
  }
  return scopeId;
}

// GET /api/customers?restaurantId=xxx&search=xxx&filter=xxx
router.get('/', (req: Request, res: Response) => {
  try {
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();
    const { restaurantId, search, filter } = req.query as Record<string, string>;

    const parsedLimit = Number.parseInt(String(req.query.limit ?? '50'), 10);
    const parsedOffset = Number.parseInt(String(req.query.offset ?? '0'), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 50;
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId est requis' });
    }

    if (restaurantId !== scopeRestaurantId) {
      return res.status(403).json({ error: 'Acces refuse a ce commerce' });
    }

    let whereClause = `WHERE c.restaurant_id = ?`;
    const params: (string | number)[] = [restaurantId];

    if (search) {
      whereClause += ` AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (filter === 'active') {
      whereClause += ` AND c.created_at >= datetime('now', '-30 days')`;
    } else if (filter === 'reward') {
      whereClause += ` AND c.stamps >= (SELECT stamp_goal FROM restaurants WHERE id = c.restaurant_id)`;
    }

    const total = (db.prepare(`
      SELECT COUNT(*) as count
      FROM customers c
      ${whereClause}
    `).get(...params) as any).count as number;

    const query = `
      SELECT c.*, p.serial_number
      FROM customers c
      LEFT JOIN passes p ON p.customer_id = c.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const customers = db.prepare(query).all(...params, limit, offset);
    return res.json({
      data: customers,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + customers.length < total,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/customers
router.post('/', (req: Request, res: Response) => {
  try {
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

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

    const safeFirstName = String(first_name || '').trim();
    const safeLastName = String(last_name || '').trim();
    const safeEmail = normalizeEmail(String(email || ''));
    const safePhone = phone ? String(phone).trim() : null;

    if (!restaurant_id || !safeFirstName || !safeLastName || !safeEmail) {
      return res.status(400).json({ error: 'Champs requis: restaurant_id, first_name, last_name, email' });
    }

    if (String(restaurant_id) !== scopeRestaurantId) {
      return res.status(403).json({ error: 'Acces refuse a ce commerce' });
    }

    if (!EMAIL_REGEX.test(safeEmail)) {
      return res.status(400).json({ error: 'Format email invalide' });
    }

    if (!gdpr_consent) {
      return res.status(400).json({ error: 'Le consentement RGPD est obligatoire' });
    }

    // Check email uniqueness within restaurant
    const existing = db.prepare(
      'SELECT id FROM customers WHERE email = ? AND restaurant_id = ?'
    ).get(safeEmail, restaurant_id);
    if (existing) {
      return res.status(409).json({ error: 'Un client avec cet email existe déjà' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const passId = uuidv4();

    const createCustomerTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO customers (id, restaurant_id, first_name, last_name, email, phone, gdpr_consent, marketing_consent, gdpr_consent_at, marketing_consent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        restaurant_id,
        safeFirstName,
        safeLastName,
        safeEmail,
        safePhone,
        gdpr_consent ? 1 : 0,
        marketing_consent ? 1 : 0,
        gdpr_consent ? now : null,
        marketing_consent ? now : null
      );

      db.prepare(`
        INSERT INTO passes (id, customer_id, serial_number, auth_token)
        VALUES (?, ?, ?, ?)
      `).run(passId, id, uuidv4(), uuidv4());

      db.prepare(`
        INSERT INTO gdpr_log (id, customer_id, action, performed_by)
        VALUES (?, ?, 'consent_given', 'customer')
      `).run(uuidv4(), id);
    });

    createCustomerTx();

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

// POST /api/customers/import — Import CSV en masse
router.post('/import', (req: Request, res: Response) => {
  const scopeRestaurantId = getRestaurantScopeId(req, res);
  if (!scopeRestaurantId) return;

  const { restaurant_id, rows } = req.body;

  if (!restaurant_id || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'restaurant_id et rows[] requis' });
  }

  if (String(restaurant_id) !== scopeRestaurantId) {
    return res.status(403).json({ error: 'Acces refuse a ce commerce' });
  }

  const db = getDb();
  const restaurant = db.prepare('SELECT id FROM restaurants WHERE id = ?').get(restaurant_id);
  if (!restaurant) return res.status(404).json({ error: 'Commerce non trouvé' });

  const results = { created: 0, duplicates: 0, errors: [] as string[] };
  const now = new Date().toISOString();

  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, restaurant_id, first_name, last_name, email, phone, gdpr_consent, marketing_consent, gdpr_consent_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
  `);
  const insertPass = db.prepare('INSERT INTO passes (id, customer_id, serial_number, auth_token) VALUES (?, ?, ?, ?)');
  const insertGdpr = db.prepare('INSERT INTO gdpr_log (id, customer_id, action, performed_by) VALUES (?, ?, ?, ?)');

  const runImport = db.transaction((rows: any[]) => {
    for (const row of rows) {
      const { first_name, last_name, email, phone } = row;
      if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
        results.errors.push(`Ligne ignorée — données manquantes: ${JSON.stringify(row)}`);
        continue;
      }
      const dup = db.prepare('SELECT id FROM customers WHERE email = ? AND restaurant_id = ?').get(email.trim(), restaurant_id);
      if (dup) { results.duplicates++; continue; }
      const id = uuidv4();
      insertCustomer.run(id, restaurant_id, first_name.trim(), last_name.trim(), email.trim(), phone?.trim() || null, now);
      insertPass.run(uuidv4(), id, uuidv4(), uuidv4());
      insertGdpr.run(uuidv4(), id, 'consent_given', 'csv_import');
      results.created++;
    }
  });

  try {
    runImport(rows);
    return res.json({ data: results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();
    const customer = db.prepare(`
      SELECT c.*, p.serial_number
      FROM customers c
      LEFT JOIN passes p ON p.customer_id = c.id
      WHERE c.id = ? AND c.restaurant_id = ?
    `).get(req.params.id, scopeRestaurantId);

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
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();
    const { first_name, last_name, email, phone, marketing_consent } = req.body;

    const existing = db.prepare('SELECT * FROM customers WHERE id = ? AND restaurant_id = ?').get(req.params.id, scopeRestaurantId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const safeFirstName = first_name !== undefined ? String(first_name).trim() : existing.first_name;
    const safeLastName = last_name !== undefined ? String(last_name).trim() : existing.last_name;
    const safeEmail = email !== undefined ? normalizeEmail(String(email || '')) : existing.email;
    const safePhone = phone !== undefined ? (String(phone).trim() || null) : existing.phone;
    const safeMarketingConsent = marketing_consent !== undefined ? (marketing_consent ? 1 : 0) : existing.marketing_consent;

    if (!safeFirstName || !safeLastName || !safeEmail) {
      return res.status(400).json({ error: 'first_name, last_name et email sont requis' });
    }

    if (!EMAIL_REGEX.test(safeEmail)) {
      return res.status(400).json({ error: 'Format email invalide' });
    }

    const emailConflict = db.prepare(
      'SELECT id FROM customers WHERE email = ? AND restaurant_id = ? AND id != ?'
    ).get(safeEmail, existing.restaurant_id, req.params.id);
    if (emailConflict) {
      return res.status(409).json({ error: 'Un client avec cet email existe déjà' });
    }

    db.prepare(`
      UPDATE customers
      SET first_name = ?, last_name = ?, email = ?, phone = ?, marketing_consent = ?
      WHERE id = ?
    `).run(safeFirstName, safeLastName, safeEmail, safePhone, safeMarketingConsent, req.params.id);

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
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();

    const customer = db.prepare('SELECT id, email FROM customers WHERE id = ? AND restaurant_id = ?').get(req.params.id, scopeRestaurantId) as { id: string; email: string } | undefined;
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
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();
    const { note } = req.body;

    const customer = db.prepare(`
      SELECT c.*, r.stamp_goal, r.points_per_visit
      FROM customers c
      JOIN restaurants r ON r.id = c.restaurant_id
      WHERE c.id = ? AND c.restaurant_id = ?
    `).get(req.params.id, scopeRestaurantId) as any;

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
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();
    const { points, note } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ error: 'Le nombre de points doit être positif' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND restaurant_id = ?').get(req.params.id, scopeRestaurantId) as any;
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
    const scopeRestaurantId = getRestaurantScopeId(req, res);
    if (!scopeRestaurantId) return;

    const db = getDb();
    const history = db.prepare(`
      SELECT sh.* FROM stamps_history sh
      JOIN customers c ON c.id = sh.customer_id
      WHERE sh.customer_id = ? AND c.restaurant_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(req.params.id, scopeRestaurantId);

    return res.json({ data: history });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
