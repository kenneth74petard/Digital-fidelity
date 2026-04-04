import QRCode from 'qrcode';

/**
 * Generate QR code as base64 PNG for a customer
 */
export async function generateQrCode(customerId: string): Promise<string> {
  const qrData = `fidelite:${customerId}`;

  const dataUrl = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a24',
      light: '#f5f0e8',
    },
  });

  // Return base64 part only (strip data:image/png;base64, prefix)
  return dataUrl.split(',')[1];
}

/**
 * Generate QR code as SVG string
 */
export async function generateQrCodeSvg(customerId: string): Promise<string> {
  const qrData = `fidelite:${customerId}`;

  return await QRCode.toString(qrData, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a24',
      light: '#f5f0e8',
    },
  });
}
