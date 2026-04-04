import { v4 as uuidv4 } from 'uuid';
import { getDb } from './schema';

async function seed() {
  const db = getDb();

  console.log('🌱 Seeding database with demo data...');

  // Clear existing data
  db.exec('DELETE FROM stamps_history');
  db.exec('DELETE FROM passes');
  db.exec('DELETE FROM notifications');
  db.exec('DELETE FROM customers');
  db.exec('DELETE FROM restaurants');

  // Create demo restaurant
  const restaurantId = uuidv4();
  db.prepare(`
    INSERT INTO restaurants (id, name, description, color_primary, color_secondary, logo_emoji, stamp_goal, points_per_visit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    restaurantId,
    'Le Petit Bistrot',
    'Cuisine française traditionnelle au cœur de la ville',
    '#c9a84c',
    '#1a1a24',
    '🥐',
    10,
    100
  );

  console.log(`✅ Restaurant créé: Le Petit Bistrot (${restaurantId})`);

  // Create demo customers
  const customers = [
    { first: 'Marie', last: 'Dupont', email: 'marie.dupont@email.com', stamps: 8, points: 750, visits: 8 },
    { first: 'Pierre', last: 'Martin', email: 'pierre.martin@email.com', stamps: 10, points: 1200, visits: 12 },
    { first: 'Sophie', last: 'Bernard', email: 'sophie.bernard@email.com', stamps: 3, points: 300, visits: 3 },
    { first: 'Jean', last: 'Leroy', email: 'jean.leroy@email.com', stamps: 6, points: 600, visits: 6 },
    { first: 'Alice', last: 'Moreau', email: 'alice.moreau@email.com', stamps: 0, points: 0, visits: 0 },
    { first: 'Thomas', last: 'Simon', email: 'thomas.simon@email.com', stamps: 9, points: 900, visits: 9 },
    { first: 'Emma', last: 'Laurent', email: 'emma.laurent@email.com', stamps: 5, points: 500, visits: 5 },
  ];

  for (const c of customers) {
    const customerId = uuidv4();
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO customers (id, restaurant_id, first_name, last_name, email, stamps, points, total_visits, gdpr_consent, marketing_consent, gdpr_consent_at, marketing_consent_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'), ?)
    `).run(customerId, restaurantId, c.first, c.last, c.email, c.stamps, c.points, c.visits, createdAt);

    // Create pass
    db.prepare(`
      INSERT INTO passes (id, customer_id, serial_number, auth_token)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), customerId, uuidv4(), uuidv4());

    // Add history entries
    for (let i = 0; i < c.visits; i++) {
      db.prepare(`
        INSERT INTO stamps_history (id, customer_id, action, value, note, created_at)
        VALUES (?, ?, 'stamp_added', 1, 'Visite enregistrée', datetime('now', '-' || ? || ' days'))
      `).run(uuidv4(), customerId, i + 1);
    }

    console.log(`✅ Client créé: ${c.first} ${c.last}`);
  }

  // Create demo notifications
  const notifications = [
    { title: 'Menu du jour', body: 'Découvrez notre menu du jour avec une entrée, un plat et un dessert !', type: 'menu', status: 'sent', daysAgo: 5 },
    { title: 'Offre spéciale week-end', body: '-20% sur tous les desserts ce week-end avec votre carte fidélité', type: 'offer', status: 'sent', daysAgo: 2 },
    { title: 'Soirée jazz vendredi', body: 'Rejoignez-nous vendredi soir pour une soirée jazz en direct !', type: 'event', status: 'scheduled', daysAgo: -2 },
  ];

  for (const n of notifications) {
    const sentAt = n.status === 'sent'
      ? new Date(Date.now() - n.daysAgo * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const scheduledAt = n.status === 'scheduled'
      ? new Date(Date.now() - n.daysAgo * 24 * 60 * 60 * 1000).toISOString()
      : null;

    db.prepare(`
      INSERT INTO notifications (id, restaurant_id, title, body, type, scheduled_at, sent_at, recipients_count, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), restaurantId, n.title, n.body, n.type, scheduledAt, sentAt, customers.length, n.status);
  }

  console.log('✅ Notifications de démo créées');
  console.log('\n🎉 Base de données initialisée avec succès!');
  console.log(`📋 Restaurant ID: ${restaurantId}`);
  console.log('   Sauvegardez cet ID pour la configuration de l\'app mobile.');
}

seed().catch(console.error);
