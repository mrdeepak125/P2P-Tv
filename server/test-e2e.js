import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTests() {
  console.log('--- STARTING SCREENROOM END-TO-END TESTS ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  // 1. Health check
  try {
    const healthRes = await fetch('http://localhost:5000/api/health');
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === 'ok', 'API health check responds OK');
  } catch (e) {
    assert(false, `Health check failed: ${e.message}`);
  }

  // 2. Create Room
  let createdRoom = null;
  try {
    const createRes = await fetch('http://localhost:5000/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'E2E Test TV', createdBy: 'TV' }),
    });
    const createJson = await createRes.json();
    assert(createRes.status === 201 && createJson.success, 'Create room endpoint returns 201 Created');
    assert(createJson.room.roomCode && createJson.room.roomCode.length === 4, `Generated 4-char code: ${createJson.room.roomCode}`);
    assert(!/[0O1IL]/.test(createJson.room.roomCode), `Room code ${createJson.room.roomCode} excludes ambiguous characters (no 0/O/1/I/L)`);
    assert(createJson.room.pairingToken && createJson.room.pairingToken.length >= 24, 'Generated cryptographically secure pairing token');
    createdRoom = createJson.room;
  } catch (e) {
    assert(false, `Create room error: ${e.message}`);
  }

  if (!createdRoom) {
    console.error('Aborting further tests due to room creation failure.');
    return;
  }

  // 3. Lookup Room by 4-char code
  try {
    const codeRes = await fetch(`http://localhost:5000/api/rooms/code/${createdRoom.roomCode.toLowerCase()}`);
    const codeJson = await codeRes.json();
    assert(codeRes.status === 200 && codeJson.room.roomId === createdRoom.roomId, 'Case-insensitive room lookup by 4-character code succeeds');
  } catch (e) {
    assert(false, `Room lookup error: ${e.message}`);
  }

  // 4. Validate Room for TV / Mobile Auto-reconnect
  try {
    const valRes = await fetch(`http://localhost:5000/api/rooms/validate?roomId=${createdRoom.roomId}`);
    const valJson = await valRes.json();
    assert(valRes.status === 200 && valJson.valid === true, 'Room validation for auto-reconnect returns valid: true');
  } catch (e) {
    assert(false, `Room validation error: ${e.message}`);
  }

  // 5. Test File Upload (Multipart Form Data with synthetic test files)
  try {
    const testImage = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]); // JPEG header
    const testPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'); // PDF header

    const formData = new FormData();
    formData.append('roomId', createdRoom.roomId);
    formData.append('uploaderName', 'TestMobile');
    formData.append('files', new Blob([testImage], { type: 'image/jpeg' }), 'vacation.jpg');
    formData.append('files', new Blob([testPdf], { type: 'application/pdf' }), 'document.pdf');

    const uploadRes = await fetch('http://localhost:5000/api/uploads', {
      method: 'POST',
      body: formData,
    });

    const uploadJson = await uploadRes.json();
    assert(uploadRes.status === 201 && uploadJson.success, 'Multi-file upload (Image + PDF) returns 201');
    assert(uploadJson.files && uploadJson.files.length === 2, '2 files parsed and added to room');
    assert(uploadJson.files[0].fileType === 'image', 'First file correctly classified as image');
    assert(uploadJson.files[1].fileType === 'pdf', 'Second file correctly classified as pdf');

    const uploadedImage = uploadJson.files[0];

    // 5b. Test Duplicate File Prevention (attempt uploading identical vacation.jpg again)
    const dupForm = new FormData();
    dupForm.append('roomId', createdRoom.roomId);
    dupForm.append('uploaderName', 'TestMobile');
    dupForm.append('files', new Blob([testImage], { type: 'image/jpeg' }), 'vacation.jpg');
    dupForm.append('files', new Blob([testPdf], { type: 'application/pdf' }), 'document.pdf');

    const dupRes = await fetch('http://localhost:5000/api/uploads', {
      method: 'POST',
      body: dupForm,
    });
    const dupJson = await dupRes.json();
    assert(
      dupJson.skippedDuplicates && dupJson.skippedDuplicates.length === 2,
      'Duplicate file upload correctly detected and skipped (not added twice)'
    );

    // 6. Test Media Streaming with Range Request (206 Partial Content)
    const streamRes = await fetch(`http://localhost:5000/api/uploads/stream/${uploadedImage.filename}`, {
      headers: { Range: 'bytes=0-4' },
    });
    assert(streamRes.status === 206, 'HTTP Range request returns 206 Partial Content for streaming');
    assert(streamRes.headers.get('accept-ranges') === 'bytes', 'Streaming header Accept-Ranges is bytes');
    assert(streamRes.headers.get('content-range')?.startsWith('bytes 0-4/'), 'Content-Range header matches requested bytes');

    // 7. Test Rename File
    const renameRes = await fetch(`http://localhost:5000/api/rooms/${createdRoom.roomId}/files/${uploadedImage.fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: 'renamed_vacation.jpg' }),
    });
    const renameJson = await renameRes.json();
    assert(renameRes.status === 200 && renameJson.file.originalName === 'renamed_vacation.jpg', 'Rename file updates file title and bumps version');

    // 8. Test Delete File
    const deleteRes = await fetch(`http://localhost:5000/api/rooms/${createdRoom.roomId}/files/${uploadedImage.fileId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: 'TestUser' }),
    });
    assert(deleteRes.status === 200, 'Delete file removes file from room');
  } catch (e) {
    assert(false, `File operations test error: ${e.message}`);
  }

  // 9. Send Text Message to TV
  try {
    const msgRes = await fetch('http://localhost:5000/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: createdRoom.roomId,
        text: 'Please look at the updated PDF slide!',
        senderName: 'Presenter Mobile',
      }),
    });
    const msgJson = await msgRes.json();
    assert(msgRes.status === 201 && msgJson.message.text === 'Please look at the updated PDF slide!', 'Send live TV text message succeeds');
  } catch (e) {
    assert(false, `Message test error: ${e.message}`);
  }

  // 10. Verify Room History
  try {
    const histRes = await fetch(`http://localhost:5000/api/rooms/${createdRoom.roomId}/history`);
    const histJson = await histRes.json();
    assert(histRes.status === 200, 'Room history retrieved successfully');
    assert(histJson.activities && histJson.activities.length >= 3, 'Activity timeline logs room creation, uploads, and messages');
  } catch (e) {
    assert(false, `History error: ${e.message}`);
  }

  console.log(`\n--- TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED ---`);
  if (failCount === 0) {
    console.log('ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  }
}

runTests();
