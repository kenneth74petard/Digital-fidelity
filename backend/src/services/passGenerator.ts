import crypto from 'crypto';
import zlib from 'zlib';
import JSZip from 'jszip';

const CRC32_TABLE = makeCrcTable();

// TODO [PRODUCTION]: Import passkit-generator and use real Apple certificates
// import { PKPass } from 'passkit-generator';

export interface PassData {
  customerId: string;
  customerName: string;
  stamps: number;
  stampGoal: number;
  points: number;
  discountPct: number;
  restaurantName: string;
  restaurantColor: string;
  serialNumber: string;
  authToken: string;
}

/**
 * Generates an unsigned .pkpass file (ZIP structure)
 * TODO [PRODUCTION]: Replace with real passkit-generator + Apple Developer certificates
 */
export async function generatePassFile(data: PassData): Promise<Buffer> {
  // TODO [PRODUCTION]: Use passkit-generator with real Apple signing:
  // const pass = await PKPass.from({
  //   model: './certs/pass-model',
  //   certificates: {
  //     wwdr: fs.readFileSync(process.env.APPLE_WWDR_PATH!),
  //     signerCert: fs.readFileSync(process.env.APPLE_CERT_PATH!),
  //     signerKey: fs.readFileSync(process.env.APPLE_KEY_PATH!),
  //     signerKeyPassphrase: process.env.APPLE_KEY_PASSPHRASE,
  //   },
  // }, { serialNumber: data.serialNumber });

  const passJson = generatePassJson(data);
  const zip = new JSZip();

  // Add pass.json
  zip.file('pass.json', JSON.stringify(passJson, null, 2));

  // Add placeholder icon images (1x1 colored PNG)
  const iconPng = generateColoredPng(data.restaurantColor);
  zip.file('icon.png', iconPng);
  zip.file('icon@2x.png', iconPng);
  zip.file('logo.png', iconPng);
  zip.file('logo@2x.png', iconPng);

  // Add manifest.json (SHA1 hashes)
  const passJsonStr = JSON.stringify(passJson, null, 2);
  const manifest = {
    'pass.json': sha1(passJsonStr),
    'icon.png': sha1(iconPng),
    'icon@2x.png': sha1(iconPng),
    'logo.png': sha1(iconPng),
    'logo@2x.png': sha1(iconPng),
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // TODO [PRODUCTION]: Replace placeholder signature with real PKCS#7 signature from Apple cert
  const mockSignature = Buffer.from(
    `UNSIGNED_PASS_NOT_VALID\nThis pass requires a real Apple Developer certificate.\nSerial: ${data.serialNumber}\nTimestamp: ${new Date().toISOString()}`
  );
  zip.file('signature', mockSignature);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return buffer;
}

function generatePassJson(data: PassData) {
  const stampFields = [];
  for (let i = 0; i < data.stampGoal; i++) {
    stampFields.push({
      key: `stamp_${i}`,
      label: i < data.stamps ? '●' : '○',
      value: i < data.stamps ? '✓' : '',
    });
  }

  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || 'pass.com.votrerestaurant.fidelite',
    serialNumber: data.serialNumber,
    teamIdentifier: process.env.APPLE_TEAM_ID || 'TEAM_ID_REQUIRED',
    organizationName: data.restaurantName,
    description: `Carte de fidélité ${data.restaurantName}`,
    logoText: data.restaurantName,
    foregroundColor: 'rgb(245, 240, 232)',
    backgroundColor: `rgb(${hexToRgb(data.restaurantColor)})`,
    labelColor: 'rgb(201, 168, 76)',
    authenticationToken: data.authToken,
    webServiceURL: `${process.env.API_URL || 'http://localhost:3000'}/api/passes`,
    storeCard: {
      headerFields: [
        {
          key: 'points',
          label: 'Points',
          value: data.points,
          textAlignment: 'PKTextAlignmentRight',
        },
      ],
      primaryFields: [
        {
          key: 'stamps',
          label: `Tampons (${data.stamps}/${data.stampGoal})`,
          value: stampFields.map((s) => s.label).join(' '),
        },
      ],
      secondaryFields: [
        {
          key: 'member',
          label: 'Membre',
          value: data.customerName,
        },
        {
          key: 'discount',
          label: 'Réduction',
          value: data.discountPct > 0 ? `-${data.discountPct}%` : 'Aucune',
          textAlignment: 'PKTextAlignmentRight',
        },
      ],
      auxiliaryFields: [
        {
          key: 'wallet_notice',
          label: 'Configuration requise',
          value: 'Certificats Apple Developer requis pour installation Wallet',
        },
      ],
      backFields: [
        {
          key: 'info',
          label: 'Informations',
          value: `Carte de fidélité ${data.restaurantName}\nCumul: ${data.stamps}/${data.stampGoal} tampons\nPoints: ${data.points}\n\nConfiguration requise: certificats Apple Developer + signature Wallet.`,
        },
      ],
    },
    barcodes: [
      {
        message: `fidelite:${data.customerId}`,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: data.customerName,
      },
    ],
  };
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '26, 26, 36';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function sha1(data: string | Buffer): string {
  return crypto.createHash('sha1').update(data).digest('hex');
}

/**
 * Generate a minimal 8x8 colored PNG placeholder
 */
function generateColoredPng(hexColor: string): Buffer {
  // Minimal valid PNG (1x1 pixel) placeholder
  // TODO [PRODUCTION]: Replace with actual restaurant logo images
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const width = 1;
  const height = 1;

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createPngChunk('IHDR', ihdrData);

  // IDAT chunk (image data)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
  const r = result ? parseInt(result[1], 16) : 201;
  const g = result ? parseInt(result[2], 16) : 168;
  const b = result ? parseInt(result[3], 16) : 76;

  const rawData = Buffer.from([0, r, g, b]); // filter byte + RGB
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createPngChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrcTable(): number[] {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}
