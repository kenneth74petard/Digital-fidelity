import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { generatePassFile } from '../services/passGenerator';
import { generateQrCode } from '../services/qrcode';

const router = Router();

// GET /api/passes/:customerId/download — Generate .pkpass file
router.get('/:customerId/download', async (req: Request, res: Response) => {
  try {
    const db = getDb();

    const row = db.prepare(`
      SELECT c.*, p.serial_number, p.auth_token, r.name as restaurant_name, r.color_primary, r.stamp_goal, r.points_per_visit
      FROM customers c
      JOIN passes p ON p.customer_id = c.id
      JOIN restaurants r ON r.id = c.restaurant_id
      WHERE c.id = ?
    `).get(req.params.customerId) as any;

    if (!row) {
      return res.status(404).json({ error: 'Client ou carte non trouvée' });
    }

    const walletLiveMode = process.env.WALLET_LIVE_MODE === 'true';

    if (!walletLiveMode) {
      console.log(`[WALLET_SETUP_REQUIRED] Generating unsigned .pkpass for customer ${req.params.customerId}`);
    }

    const passBuffer = await generatePassFile({
      customerId: row.id,
      customerName: `${row.first_name} ${row.last_name}`,
      stamps: row.stamps,
      stampGoal: row.stamp_goal,
      points: row.points,
      discountPct: row.discount_pct,
      restaurantName: row.restaurant_name,
      restaurantColor: row.color_primary,
      serialNumber: row.serial_number,
      authToken: row.auth_token,
    });

    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="fidelite-${row.first_name.toLowerCase()}.pkpass"`,
      'Content-Length': passBuffer.length,
      'X-Wallet-Live-Mode': walletLiveMode ? 'true' : 'false',
    });

    return res.send(passBuffer);
  } catch (error) {
    console.error('Pass generation error:', error);
    return res.status(500).json({ error: 'Erreur lors de la génération de la carte' });
  }
});

// GET /api/passes/:customerId/qr — Return QR code as base64 PNG
router.get('/:customerId/qr', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const qrBase64 = await generateQrCode(req.params.customerId);
    return res.json({ data: { qr_base64: qrBase64 } });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur lors de la génération du QR code' });
  }
});

// POST /api/passes/register — Apple Wallet device registration
// TODO [PRODUCTION]: Implement real Apple Wallet device registration with APNs
router.post('/register', (req: Request, res: Response) => {
  // TODO [PRODUCTION]: Store device token and associate with pass for push updates
  // This endpoint is called by iOS Wallet when a pass is added
  console.log('[WALLET] Apple Wallet registration received (endpoint pending implementation)');
  console.log('  Device:', req.body.deviceLibraryIdentifier);
  console.log('  Pass:', req.body.passTypeIdentifier, req.body.serialNumber);
  return res.status(200).json({ message: 'Registration acknowledged' });
});

export default router;
