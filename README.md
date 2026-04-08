# UP Fidelity — Web app de gestion de cartes de fidélité

Solution web complète de gestion de programme de fidélité pour commerces de proximité (restaurants, salons de coiffure, boulangeries, etc.), avec backend Node.js et interface web Expo (React).

## Structure du projet

```
Digital-fidelity/
├── fidelity-app/         ← Interface web Expo (React)
├── backend/              ← API REST Node.js + Express + SQLite
├── shared/               ← Types TypeScript partagés
└── README.md             ← Ce fichier
```

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- npm ou yarn
- Un navigateur web moderne (Chrome, Safari, Firefox)

---

### 1. Démarrer le backend

```bash
cd backend

# Installer les dépendances
npm install

# Copier le fichier de configuration
cp .env.example .env

# Configurer au minimum ADMIN_API_TOKEN dans backend/.env

# (Optionnel) Remplir la base de données avec des données de démo
npm run seed

# Démarrer le serveur en mode développement
npm run dev
```

Le serveur démarre sur `http://localhost:3000`.

**Vérifier que le serveur fonctionne:**
```bash
curl http://localhost:3000/health
```

---

### 2. Créer votre premier commerce (via l'API)

Si vous n'utilisez pas le seed, créez manuellement votre commerce:

```bash
curl -X POST http://localhost:3000/api/restaurant/setup \
  -H "Authorization: Bearer change-me" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Commerce",
    "description": "Description de mon commerce",
    "logo_emoji": "🏪",
    "color_primary": "#c9a84c",
    "stamp_goal": 10,
    "points_per_visit": 100
  }'
```

Notez l'`id` retourné — il sera demandé par l'interface web lors du premier lancement.

---

### 3. Démarrer l'interface web

```bash
cd fidelity-app

# Installer les dépendances
npm install

# Copier le fichier de configuration
cp .env.example .env

# Configurer EXPO_PUBLIC_ADMIN_TOKEN (meme valeur que ADMIN_API_TOKEN)

# Si vous testez depuis un autre appareil sur le meme reseau, remplacez localhost par votre IP locale:
# EXPO_PUBLIC_API_URL=http://192.168.1.xxx:3000

# Démarrer la web app
npm run web
```

---

## 📱 Fonctionnalités

### Tableau de bord (Dashboard)
- Statistiques en temps réel: clients totaux, tampons du jour, notifications envoyées
- Graphique des nouveaux clients sur 7 jours
- Liste des clients récents avec progression des tampons
- Boutons d'action rapides

### Gestion des clients
- Liste avec recherche et filtres (Tous / Actifs / Récompense disponible)
- Ajout de clients avec formulaire complet et consentements RGPD
- Ajout de tampon avec confirmation et détection automatique de récompense
- Aperçu de la carte de fidélité (prévisualisation Apple Wallet)
- Page de détail: historique, édition, gestion des points

### Notifications Push
- Envoi immédiat à tous les clients avec consentement marketing
- Planification de notifications futures (minimum 1h à l'avance)
- Prévisualisation réaliste sur écran de verrouillage iPhone
- Historique des notifications envoyées
- **MODE PRÉPRODUCTION**: notifications enregistrées en BDD mais non envoyées

### Paramètres
- Édition des informations du commerce
- Gestion des clés VAPID pour les notifications push
- Conformité RGPD: politique de confidentialité, export des données
- Guide Apple Wallet: checklist de production, instructions pas-à-pas
- Zone de danger: réinitialisation complète

---

## 🔶 Mode Préproduction

La web app fonctionne en mode préproduction **sans certificat Apple Developer**:

| Fonctionnalité | Mode Préproduction | Mode Live |
|---|---|---|
| Cartes `.pkpass` | Générées mais non installables | Installables dans Apple Wallet |
| Notifications push iOS | Enregistrées en BDD seulement | Envoyées via APNs |
| Web Push (PWA) | Désactivé | Via clés VAPID |
| QR codes | Fonctionnels | Fonctionnels |

---

## 🍎 Passage en production (Apple Wallet)

Pour les cartes Apple Wallet en production, vous aurez besoin de:

1. **Apple Developer Account** (99$/an) — [developer.apple.com](https://developer.apple.com)
2. **Pass Type ID** — Créé dans Certificates, Identifiers & Profiles
3. **APNs Certificate** — Pour les mises à jour du Wallet

Consultez `backend/certs/README.md` pour les instructions détaillées.

Une fois les certificats obtenus:
```env
# backend/.env
WALLET_LIVE_MODE=true
PUSH_LIVE_MODE=true
APPLE_TEAM_ID=VOTRE_TEAM_ID
APPLE_PASS_TYPE_ID=pass.com.votrecommerce.fidelite
APPLE_KEY_PATH=./certs/pass.key
APPLE_CERT_PATH=./certs/pass.pem
APPLE_WWDR_PATH=./certs/wwdr.pem
```

---

## 🔒 Conformité RGPD / LPD

- Consentement explicite requis à l'inscription (RGPD Art. 6)
- Consentement marketing séparé et optionnel
- Suppression complète des données via `DELETE /api/customers/:id`
- Journal d'accès aux données (`gdpr_log` table)
- Export des données disponible depuis les Réglages

---

## 📡 API REST — Endpoints principaux

Toutes les routes `/api/*` (sauf endpoints publics Wallet) exigent:
- `Authorization: Bearer <token>`
- Un scope restaurant (`x-restaurant-id` ou `restaurantId`/`restaurant_id`)

Exemple:

```bash
curl "http://localhost:3000/api/customers?restaurantId=<RESTAURANT_ID>" \
  -H "Authorization: Bearer change-me" \
  -H "x-restaurant-id: <RESTAURANT_ID>"
```

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/restaurant/setup` | Créer un commerce |
| GET | `/api/restaurant/:id` | Obtenir les infos |
| GET | `/api/customers?restaurantId=xxx` | Liste des clients |
| POST | `/api/customers` | Créer un client |
| POST | `/api/customers/:id/stamp` | Ajouter un tampon |
| GET | `/api/passes/:id/qr` | QR code en base64 |
| GET | `/api/passes/:id/download` | Télécharger le .pkpass |
| POST | `/api/notifications/send` | Envoyer une notification |
| POST | `/api/notifications/schedule` | Planifier une notification |
| GET | `/api/stats/:restaurantId` | Statistiques du tableau de bord |
| GET | `/health` | Santé du serveur |

---

## 🛠 Technologies utilisées

**Backend:**
- Node.js + Express + TypeScript
- better-sqlite3 (base de données SQLite)
- passkit-generator (structure .pkpass)
- qrcode (génération QR)
- web-push (notifications Web Push)
- node-cron (notifications planifiées)
- uuid

**Frontend web:**
- Expo ~51 + Expo Router (web)
- React + React Native Web
- Zustand (gestion d'état)
- @shopify/flash-list (listes performantes)
- date-fns avec locale française
- react-native-reanimated
- axios
