import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { testR2Connection, getR2Config, uploadToR2, deleteFromR2 } from './services/r2Storage.js';

async function checkR2() {
  console.log('=== CLOUDFLARE R2 DIAGNOSTIC TOOL ===');
  const cfg = getR2Config();

  console.log('Account ID: ', cfg.accountId || '(missing)');
  console.log('Bucket Name:', cfg.bucketName || '(missing)');
  console.log('Access Key: ', cfg.accessKeyId ? `${cfg.accessKeyId.slice(0, 8)}...` : '❌ EMPTY');
  console.log('Secret Key: ', cfg.secretAccessKey ? '********' : '❌ EMPTY');

  if (!cfg.accessKeyId || !cfg.secretAccessKey) {
    console.log('\n❌ ERROR: Cloudflare R2 credentials are NOT set in server/.env!');
    console.log('\n--- HOW TO GET YOUR KEYS IN 30 SECONDS ---');
    console.log('1. Go to your Cloudflare Dashboard: https://dash.cloudflare.com');
    console.log('2. Click on "R2 Object Storage" in the left sidebar.');
    console.log('3. On the right side, click "Manage R2 API Tokens".');
    console.log('4. Click "Create API Token":');
    console.log('   - Permissions: "Object Read & Write"');
    console.log('   - Bucket: select "screentv"');
    console.log('5. Click "Create API Token".');
    console.log('6. Copy the "Access Key ID" and "Secret Access Key".');
    console.log('7. Open server/.env and paste them:');
    console.log('   R2_ACCESS_KEY_ID=your_access_key');
    console.log('   R2_SECRET_ACCESS_KEY=your_secret_key');
    console.log('\nRun "node server/test-r2.js" again after saving .env!\n');
    return;
  }

  console.log('\nConnecting to Cloudflare R2 bucket "' + cfg.bucketName + '"...');
  const res = await testR2Connection();

  if (res.connected) {
    console.log('✅ SUCCESS! Connected to Cloudflare R2 bucket "' + cfg.bucketName + '"!');
    console.log('Bucket currently contains:', res.itemCount, 'objects');

    // Test a live upload
    try {
      console.log('Testing upload of probe file "screenroom-probe.txt"...');
      const testBuffer = Buffer.from('ScreenRoom Cloudflare R2 Connectivity Test Probe: ' + new Date().toISOString());
      const up = await uploadToR2({
        buffer: testBuffer,
        filename: 'screenroom-probe.txt',
        mimeType: 'text/plain',
      });
      console.log('✅ Upload succeeded! URL:', up.url);
      await deleteFromR2('screenroom-probe.txt');
      console.log('✅ Probe file cleaned up.');
      console.log('\n🎉 Cloudflare R2 is 100% OPERATIONAL for ScreenRoom!\n');
    } catch (upErr) {
      console.error('❌ Upload test failed:', upErr.message);
    }
  } else {
    console.error('❌ FAILED to connect to Cloudflare R2:', res.message);
  }
}

checkR2();

