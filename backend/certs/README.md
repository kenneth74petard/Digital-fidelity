# Certificats Apple Developer — Instructions de production

## Mode actuel: PRÉPRODUCTION

En préproduction, aucun certificat n'est requis. Les cartes `.pkpass` générées
ne peuvent pas être installées dans Apple Wallet, mais ont la structure correcte.

---

## Pour la production, vous aurez besoin de:

### 1. Apple Developer Account (99$/an)
- Créez un compte sur https://developer.apple.com
- Inscrivez-vous au programme Apple Developer

### 2. Pass Type ID
1. Dans Certificates, Identifiers & Profiles → Identifiers
2. Créez un nouveau **Pass Type ID**
3. Exemple: `pass.com.votrecommerce.fidelite`
4. Téléchargez le certificat `.cer`
5. Convertissez en `.pem`:
   ```bash
   openssl x509 -inform DER -in pass.cer -out pass.pem
   ```

### 3. Clé privée pour la signature
```bash
openssl genrsa -out pass.key 2048
openssl req -new -key pass.key -out pass.csr
# Uploadez pass.csr dans Apple Developer Portal
# Téléchargez le certificat signé
```

### 4. WWDR Certificate (Apple Worldwide Developer Relations)
Téléchargez depuis: https://www.apple.com/certificateauthority/
Fichier: `AppleWWDRCAG3.cer`
```bash
openssl x509 -inform DER -in AppleWWDRCAG3.cer -out wwdr.pem
```

### 5. APNs pour les mises à jour du Wallet
1. Créez un **APNs Key** dans Apple Developer Portal
2. Téléchargez le fichier `.p8`
3. Notez le Key ID

### 6. Configuration du .env
```env
WALLET_LIVE_MODE=true
PUSH_LIVE_MODE=true
APPLE_TEAM_ID=VOTRE_TEAM_ID
APPLE_PASS_TYPE_ID=pass.com.votrecommerce.fidelite
APPLE_KEY_PATH=./certs/pass.key
APPLE_CERT_PATH=./certs/pass.pem
APPLE_WWDR_PATH=./certs/wwdr.pem
APNS_KEY_PATH=./certs/AuthKey_XXXXXXXXXX.p8
APNS_KEY_ID=VOTRE_KEY_ID
APNS_TEAM_ID=VOTRE_TEAM_ID
APNS_TOPIC=pass.com.votrecommerce.fidelite
```

### 7. Placez les fichiers dans ce dossier:
```
certs/
├── pass.key      ← Clé privée
├── pass.pem      ← Certificat Pass Type ID
├── wwdr.pem      ← Apple WWDR Certificate
└── AuthKey_XXX.p8 ← APNs Authentication Key
```

⚠️ **NE JAMAIS committer ces fichiers dans git!**
Le `.gitignore` exclut déjà `*.pem`, `*.p8`, `*.key`, `*.cer`.

---

## Ressources utiles
- [PassKit Documentation](https://developer.apple.com/documentation/passkit)
- [passkit-generator npm](https://www.npmjs.com/package/passkit-generator)
- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
