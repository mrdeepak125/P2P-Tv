import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Characters excluding ambiguous: 0/O, 1/I/L
const SAFE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generate a clean, 4-character alphanumeric room code
 */
export function generateRoomCode() {
  let code = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    code += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
  }
  return code;
}

/**
 * Generate a secure cryptographically random pairing token
 */
export function generatePairingToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Generate unique UUID for items
 */
export function generateId() {
  return uuidv4();
}

