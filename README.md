# FidélitéPro — Application de gestion de cartes de fidélité

Application complète de gestion de programme de fidélité pour restaurants, avec backend Node.js et application mobile Expo (React Native).

## Structure du projet

```
Digital-fidelity/
├── fidelity-app/         ← Application mobile Expo (React Native)
├── backend/              ← API REST Node.js + Express + SQLite
├── shared/               ← Types TypeScript partagés
└── README.md             ← Ce fichier
```

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Application Expo Go sur votre téléphone (pour les tests)

---

### 1. Démarrer le backend

```bash
cd backend

# Installer les dépendances
npm install

# Copier le fichier de configuration
cp .env.example .env

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

### 2. Créer votre premier restaurant (via l'API)

Si vous n'utilisez pas le seed, créez manuellement votre restaurant:

```bash
curl -X POST http://localhost:3000/api/restaurant/setup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Restaurant",
    "description": "Description de mon restaurant",
    "logo_emoji": "🍽️",
    "color_primary": "#c9a84c",
    "stamp_goal": 10,
    "points_per_visit": 100
  }'
```

Notez l'`id` retourné — il sera demandé par l'app lors du premier lancement.

---

### 3. Démarrer l'application mobile

```bash
cd fidelity-app

# Installer les dépendances
npm install

# Copier le fichier de configuration
cp .env.example .env

# Si vous testez sur un appareil physique, remplacez localhost par votre IP locale:
# EXPO_PUBLIC_API_URL=http://192.168.1.xxx:3000

# Démarrer Expo
npm start
```

Scannez le QR code avec Expo Go (Android) ou l'appareil photo (iOS).

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
- Aperçu de la carte de fidélité (simulation Apple Wallet)
- Page de détail: historique, édition, gestion des points

### Notifications Push
- Envoi immédiat à tous les clients avec consentement marketing
- Planification de notifications futures (minimum 1h à l'avance)
- Prévisualisation réaliste sur écran de verrouillage iPhone
- Historique des notifications envoyées
- **MODE SIMULATION**: notifications enregistrées en BDD mais non envoyées

### Paramètres
- Édition des informations du restaurant
- Gestion des clés VAPID pour les notifications push
- Conformité RGPD: politique de confidentialité, export des données
- Guide Apple Wallet: checklist de production, instructions pas-à-pas
- Zone de danger: réinitialisation complète

---

## 🔶 Mode Simulation

L'application fonctionne entièrement **sans certificat Apple Developer**:

| Fonctionnalité | Mode Simulation | Mode Production |
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
SIMULATION_MODE=false
APPLE_TEAM_ID=VOTRE_TEAM_ID
APPLE_PASS_TYPE_ID=pass.com.votrerestaurant.fidelite
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

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/restaurant/setup` | Créer un restaurant |
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

**Application mobile:**
- Expo ~51 + Expo Router
- React Native 0.74
- Zustand (gestion d'état)
- @shopify/flash-list (listes performantes)
- date-fns avec locale française
- react-native-reanimated
- axios
