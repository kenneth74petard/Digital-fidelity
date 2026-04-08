import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── GET /register/:restaurantId ─── Formulaire d'inscription ───────────────
router.get('/:restaurantId', (req: Request, res: Response) => {
  const db = getDb();
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.restaurantId) as any;
  if (!restaurant) return res.status(404).send(errorPage('Commerce introuvable'));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(formPage(restaurant));
});

// ─── POST /register/:restaurantId ─── Traitement ────────────────────────────
router.post('/:restaurantId', (req: Request, res: Response) => {
  const { restaurantId } = req.params;
  const { first_name, last_name, email, terms, marketing_consent } = req.body;

  const safeFirstName = String(first_name || '').trim();
  const safeLastName = String(last_name || '').trim();
  const safeEmail = String(email || '').trim().toLowerCase();
  const marketingConsent = String(marketing_consent || '').trim() === '1';

  if (!safeFirstName || !safeLastName || !safeEmail || !terms) {
    return res.status(400).send(errorPage('Tous les champs sont requis.'));
  }

  if (!EMAIL_REGEX.test(safeEmail)) {
    return res.status(400).send(errorPage('Adresse email invalide.'));
  }

  const db = getDb();
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(restaurantId) as any;
  if (!restaurant) return res.status(404).send(errorPage('Commerce introuvable'));

  const now = new Date().toISOString();

  // Client déjà inscrit → renvoyer directement sur sa carte
  const existing = db.prepare('SELECT id FROM customers WHERE email = ? AND restaurant_id = ?').get(safeEmail, restaurantId) as any;
  if (existing) {
    return res.redirect(`/register/${restaurantId}/card/${existing.id}`);
  }

  const id = uuidv4();

  const registerTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO customers (id, restaurant_id, first_name, last_name, email, gdpr_consent, marketing_consent, gdpr_consent_at, marketing_consent_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      id,
      restaurantId,
      safeFirstName,
      safeLastName,
      safeEmail,
      marketingConsent ? 1 : 0,
      now,
      marketingConsent ? now : null
    );

    db.prepare('INSERT INTO passes (id, customer_id, serial_number, auth_token) VALUES (?, ?, ?, ?)').run(uuidv4(), id, uuidv4(), uuidv4());
    db.prepare('INSERT INTO gdpr_log (id, customer_id, action, performed_by) VALUES (?, ?, ?, ?)').run(uuidv4(), id, 'consent_given', 'customer_self');
  });

  registerTx();

  return res.redirect(`/register/${restaurantId}/card/${id}`);
});

// ─── GET /register/:restaurantId/card/:customerId ─── Page carte ─────────────
router.get('/:restaurantId/card/:customerId', (req: Request, res: Response) => {
  const db = getDb();
  const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.restaurantId) as any;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND restaurant_id = ?').get(req.params.customerId, req.params.restaurantId) as any;

  if (!restaurant || !customer) return res.status(404).send(errorPage('Carte introuvable'));

  const walletLiveMode = process.env.WALLET_LIVE_MODE === 'true';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(cardPage(restaurant, customer, walletLiveMode));
});

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '201,168,76';
}

function safeHexColor(value: string | undefined, fallback = '#c9a84c') {
  return /^#[0-9a-fA-F]{6}$/.test(value || '') ? (value as string) : fallback;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function errorPage(msg: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Erreur</title>
  <style>body{background:#0f0f17;color:#e8e0d0;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .box{text-align:center}h1{color:#ef4444;font-size:20px;margin-bottom:12px}p{color:#888}</style></head>
  <body><div class="box"><h1>Oups</h1><p>${msg}</p></div></body></html>`;
}

function formPage(r: any) {
  const c = safeHexColor(r.color_primary);
  const rgb = hexToRgb(c);
  const restaurantName = escapeHtml(r.name);
  const logoEmoji = escapeHtml(r.logo_emoji || '🏪');
  const restaurantId = encodeURIComponent(String(r.id || ''));
  const stampGoal = Math.min(Number(r.stamp_goal || 10), 10);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <title>Rejoindre ${restaurantName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0f0f17;color:#e8e0d0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
    .wrap{width:100%;max-width:400px}

    /* Card preview en haut */
    .preview-card{
      background:linear-gradient(135deg,${c},rgba(${rgb},0.7));
      border-radius:20px;padding:24px;margin-bottom:28px;
      box-shadow:0 20px 60px rgba(${rgb},0.35);
      position:relative;overflow:hidden;
    }
    .preview-card::before{
      content:'';position:absolute;top:-40px;right:-40px;
      width:160px;height:160px;border-radius:50%;
      background:rgba(255,255,255,0.08);
    }
    .card-top{display:flex;align-items:center;gap:12px;margin-bottom:20px}
    .card-logo{font-size:36px}
    .card-name{font-size:18px;font-weight:700;color:#fff}
    .card-sub{font-size:12px;color:rgba(255,255,255,0.65);margin-top:2px}
    .card-dots{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}
    .dot{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.2);border:1.5px solid rgba(255,255,255,0.35)}
    .card-footer{display:flex;justify-content:space-between;align-items:flex-end}
    .card-member{font-size:13px;color:rgba(255,255,255,0.55);letter-spacing:.5px;text-transform:uppercase}
    .card-member-name{font-size:16px;font-weight:600;color:#fff;margin-top:2px}
    .wallet-badge{background:rgba(255,255,255,0.15);border-radius:6px;padding:4px 10px;font-size:10px;color:rgba(255,255,255,0.7);font-weight:600;letter-spacing:.5px}

    /* Formulaire */
    .form-title{font-size:20px;font-weight:700;color:#fff;margin-bottom:6px}
    .form-sub{font-size:13px;color:#888;margin-bottom:24px;line-height:1.5}

    label{display:block;font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.7px;margin-bottom:6px;margin-top:16px}
    .row{display:flex;gap:10px}
    .row>div{flex:1}
    input[type=text],input[type=email]{
      width:100%;background:#1a1a24;border:1px solid #2a2a3a;border-radius:12px;
      padding:14px 16px;color:#e8e0d0;font-size:15px;outline:none;
      transition:border-color .2s;-webkit-appearance:none;
    }
    input:focus{border-color:${c}}
    input::placeholder{color:#444}

    .terms-box{background:#1a1a24;border:1px solid #2a2a3a;border-radius:12px;padding:16px;margin-top:20px}
    .terms-check{display:flex;align-items:flex-start;gap:12px}
    .terms-check input[type=checkbox]{width:20px;height:20px;margin-top:1px;accent-color:${c};flex-shrink:0;cursor:pointer}
    .terms-label{font-size:13px;color:#aaa;line-height:1.5}
    .terms-label a{color:${c};text-decoration:none}

    button{
      width:100%;background:${c};color:#000;font-size:16px;font-weight:700;
      border:none;border-radius:14px;padding:17px;margin-top:24px;cursor:pointer;
      transition:opacity .15s;-webkit-appearance:none;
      display:flex;align-items:center;justify-content:center;gap:8px;
    }
    button:hover{opacity:.9}
    button:active{opacity:.8;transform:scale(.99)}
    .btn-icon{font-size:18px}
  </style>
</head>
<body>
<div class="wrap">

  <!-- Aperçu carte -->
  <div class="preview-card">
    <div class="card-top">
        <div class="card-logo">${logoEmoji}</div>
      <div>
          <div class="card-name">${restaurantName}</div>
        <div class="card-sub">Programme de fidélité</div>
      </div>
    </div>
    <div class="card-dots">
        ${Array.from({length: stampGoal}, () => `<div class="dot"></div>`).join('')}
    </div>
    <div class="card-footer">
      <div>
        <div class="card-member">Membre</div>
        <div class="card-member-name">Votre nom</div>
      </div>
      <div class="wallet-badge">FIDÉLITÉ</div>
    </div>
  </div>

  <!-- Formulaire -->
  <div class="form-title">Obtenir ma carte</div>
  <div class="form-sub">Inscrivez-vous en quelques secondes pour rejoindre le programme de fidélité.</div>

  <form method="POST" action="/register/${restaurantId}">
    <div class="row">
      <div>
        <label>Prénom *</label>
        <input type="text" name="first_name" required placeholder="Marie" autocomplete="given-name">
      </div>
      <div>
        <label>Nom *</label>
        <input type="text" name="last_name" required placeholder="Dupont" autocomplete="family-name">
      </div>
    </div>

    <label>Adresse email *</label>
    <input type="email" name="email" required placeholder="marie@email.com" autocomplete="email">

    <div class="terms-box">
      <div class="terms-check">
        <input type="checkbox" name="terms" value="1" id="terms" required>
        <label class="terms-label" for="terms">
          J'accepte que <strong style="color:#e8e0d0">${restaurantName}</strong> utilise mes données pour gérer ma carte de fidélité. <a href="#">Conditions générales</a>
        </label>
      </div>
      <div class="terms-check" style="margin-top:12px">
        <input type="checkbox" name="marketing_consent" value="1" id="marketing_consent">
        <label class="terms-label" for="marketing_consent">
          J'accepte de recevoir des offres marketing par email (optionnel).
        </label>
      </div>
    </div>

    <button type="submit">
      <span class="btn-icon">💳</span>
      Obtenir ma carte de fidélité
    </button>
  </form>
</div>
</body>
</html>`;
}

function cardPage(r: any, customer: any, walletLiveMode: boolean) {
  const c = safeHexColor(r.color_primary);
  const rgb = hexToRgb(c);
  const isStamps = r.loyalty_type === 'stamps' || !r.loyalty_type;
  const stampGoal = Number(r.stamp_goal || 10);
  const displayDots = Math.min(stampGoal, 10);
  const fullName = escapeHtml(`${customer.first_name} ${customer.last_name}`);
  const shortId = escapeHtml(String(customer.id || '').substring(0, 8).toUpperCase());
  const restaurantName = escapeHtml(r.name);
  const logoEmoji = escapeHtml(r.logo_emoji || '🏪');
  const safePoints = Number(customer.points || 0);
  const safeStamps = Math.max(0, Number(customer.stamps || 0));
  const safeCustomerId = encodeURIComponent(String(customer.id || ''));

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0f0f17">
  <title>Ma carte — ${restaurantName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0f0f17;color:#e8e0d0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 20px 40px}

    .success-badge{
      background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25);
      border-radius:24px;padding:8px 18px;display:inline-flex;align-items:center;gap:8px;
      font-size:13px;color:#4ade80;font-weight:600;margin-bottom:28px;
    }
    .check-icon{width:18px;height:18px;background:#4ade80;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}

    h1{font-size:26px;font-weight:800;color:#fff;margin-bottom:8px;text-align:center}
    .subtitle{font-size:15px;color:#666;margin-bottom:36px;text-align:center}

    /* La carte */
    .wallet-card{
      width:100%;max-width:360px;
      background:linear-gradient(145deg,${c} 0%,rgba(${rgb},0.75) 100%);
      border-radius:24px;padding:28px;
      box-shadow:0 24px 80px rgba(${rgb},0.4),0 4px 20px rgba(0,0,0,0.5);
      position:relative;overflow:hidden;margin-bottom:32px;
    }
    .wallet-card::before{
      content:'';position:absolute;top:-60px;right:-60px;
      width:220px;height:220px;border-radius:50%;
      background:rgba(255,255,255,0.07);
    }
    .wallet-card::after{
      content:'';position:absolute;bottom:-80px;left:-40px;
      width:180px;height:180px;border-radius:50%;
      background:rgba(255,255,255,0.04);
    }

    .card-header{display:flex;align-items:center;gap:14px;margin-bottom:28px;position:relative;z-index:1}
    .card-logo{font-size:40px;line-height:1}
    .card-restaurant{font-size:19px;font-weight:700;color:#fff}
    .card-type{font-size:11px;color:rgba(255,255,255,0.6);margin-top:3px;text-transform:uppercase;letter-spacing:.8px}

    /* Tampons */
    .stamps-section{margin-bottom:24px;position:relative;z-index:1}
    .stamps-label{font-size:11px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}
    .stamp-dots{display:flex;gap:8px;flex-wrap:wrap}
    .stamp-dot{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.3)}
    .stamp-dot.filled{background:#fff;border-color:#fff}
    .stamps-count{font-size:13px;color:rgba(255,255,255,0.7);margin-top:8px}

    /* Points */
    .points-section{margin-bottom:24px;position:relative;z-index:1}
    .points-value{font-size:48px;font-weight:800;color:#fff;line-height:1}
    .points-label{font-size:13px;color:rgba(255,255,255,0.65);margin-top:4px}

    .card-footer{display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:1}
    .member-label{font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
    .member-name{font-size:16px;font-weight:600;color:#fff}
    .member-id{font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;font-family:monospace}
    .nfc-icon{font-size:26px;color:rgba(255,255,255,0.4)}

    /* CTA */
    .cta-section{width:100%;max-width:360px}
    .wallet-btn{
      width:100%;background:#fff;color:#000;font-size:16px;font-weight:700;
      border:none;border-radius:14px;padding:17px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;gap:10px;
      transition:all .15s;box-shadow:0 4px 20px rgba(255,255,255,0.1);
      margin-bottom:12px;-webkit-appearance:none;
    }
    .wallet-btn:active{opacity:.9;transform:scale(.99)}
    .wallet-logo{width:22px;height:22px}

    .sim-note{font-size:12px;color:#444;text-align:center;line-height:1.6;padding:0 8px}
    .sim-note a{color:${c};text-decoration:none}

    .add-home-btn{
      width:100%;background:transparent;color:${c};font-size:14px;font-weight:600;
      border:1.5px solid rgba(${rgb},0.4);border-radius:14px;padding:14px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;gap:8px;
      -webkit-appearance:none;margin-bottom:16px;
    }
  </style>
</head>
<body>

  <div class="success-badge">
    <div class="check-icon">
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    Inscription confirmée
  </div>

  <h1>Votre carte est prête</h1>
  <p class="subtitle">Bienvenue dans le programme fidélité de <strong style="color:#fff">${restaurantName}</strong></p>

  <!-- La carte -->
  <div class="wallet-card">
    <div class="card-header">
        <div class="card-logo">${logoEmoji}</div>
      <div>
          <div class="card-restaurant">${restaurantName}</div>
        <div class="card-type">Carte de fidélité</div>
      </div>
    </div>

    ${isStamps ? `
    <div class="stamps-section">
      <div class="stamps-label">Tampons</div>
      <div class="stamp-dots">
          ${Array.from({length: displayDots}, (_, i) => `<div class="stamp-dot${i < safeStamps ? ' filled' : ''}"></div>`).join('')}
      </div>
        <div class="stamps-count">${safeStamps}/${stampGoal} tampons</div>
    </div>
    ` : `
    <div class="points-section">
        <div class="points-value">${safePoints}</div>
      <div class="points-label">points fidélité</div>
    </div>
    `}

    <div class="card-footer">
      <div>
        <div class="member-label">Membre</div>
        <div class="member-name">${fullName}</div>
        <div class="member-id">#${shortId}</div>
      </div>
      <div class="nfc-icon">⊕</div>
    </div>
  </div>

  <!-- Bouton Wallet -->
  <div class="cta-section">
    ${!walletLiveMode ? `
    <button class="add-home-btn" onclick="showAddToHome()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12l7-7 7 7"/>
      </svg>
      Ajouter à l'écran d'accueil
    </button>
    <p class="sim-note">
      Apple Wallet nécessite un <a href="#">certificat développeur Apple</a>.<br>
      En attendant, ajoutez cette page à votre écran d'accueil pour un accès rapide.
    </p>
    ` : `
    <a href="/api/passes/${safeCustomerId}/download" class="wallet-btn">
      <svg class="wallet-logo" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#000"/>
        <path d="M8 12h8M12 8v8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Ajouter à Apple Wallet
    </a>
    `}
  </div>

  <script>
    function showAddToHome() {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isAndroid = /android/i.test(navigator.userAgent);

      if (isIos) {
        alert("Pour ajouter cette carte à votre écran d'accueil :\\n\\n1. Appuyez sur le bouton Partager (⬆) en bas de Safari\\n2. Faites défiler et choisissez \\"Sur l'écran d'accueil\\"\\n3. Appuyez sur \\"Ajouter\\"");
      } else if (isAndroid) {
        alert("Pour ajouter cette carte à votre écran d'accueil :\\n\\n1. Appuyez sur le menu ⋮ en haut à droite de Chrome\\n2. Choisissez \\"Ajouter à l'écran d'accueil\\"\\n3. Appuyez sur \\"Ajouter\\"");
      } else {
        alert("Sur mobile, ajoutez cette page à votre écran d'accueil pour un accès rapide à votre carte fidélité.");
      }
    }
  </script>
</body>
</html>`;
}

export default router;
