import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

// Declare global type for TypeScript
declare global {
  var __encryptionWarningShown: boolean | undefined;
}

// Use separate ENCRYPTION_KEY for better security
// Falls back to NEXTAUTH_SECRET only in development
const getEncryptionKey = async (): Promise<Buffer> => {
  let secret: string;

  if (process.env.ENCRYPTION_KEY) {
    secret = process.env.ENCRYPTION_KEY;
  } else if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXTAUTH_SECRET
  ) {
    // Log warning without exposing sensitive information
    if (!global.__encryptionWarningShown) {
      console.warn(
        '⚠️  Development mode: Using fallback encryption configuration. Set ENCRYPTION_KEY for production.'
      );
      global.__encryptionWarningShown = true; // Only show warning once
    }
    secret = process.env.NEXTAUTH_SECRET;
  } else {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for encryption'
    );
  }

  // Validate key strength
  if (secret.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }

  // Use a deterministic salt based on the key for consistency
  // This ensures the same key always produces the same derived key
  const salt =
    Buffer.from('subpilot-encryption-v1').toString('hex') + secret.slice(0, 8);
  const key = (await scryptAsync(secret, salt, 32)) as Buffer;
  return key;
};

/**
 * Encrypt sensitive data (e.g., Plaid access tokens)
 * @param text - The plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export const encrypt = async (text: string): Promise<string> => {
  const key = await getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and encrypted data
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
};

/**
 * Decrypt sensitive data
 * @param encryptedText - The encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plain text
 */
export const decrypt = async (encryptedText: string): Promise<string> => {
  const [ivBase64, authTagBase64, encryptedBase64] = encryptedText.split(':');

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error('Invalid encrypted format');
  }

  const key = await getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

/**
 * Hash sensitive data for secure comparison
 * @param data - The data to hash
 * @returns SHA-256 hash of the data
 */
export const hashData = async (data: string): Promise<string> => {
  const { createHash } = await import('crypto');
  return createHash('sha256').update(data).digest('hex');
};
