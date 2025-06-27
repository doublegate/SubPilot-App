import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { env } from '@/env.js';

const scryptAsync = promisify(scrypt);

/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

// Use separate ENCRYPTION_KEY for better security
// Falls back to NEXTAUTH_SECRET only in development
const getEncryptionKey = async (): Promise<Buffer> => {
  let secret: string;

  if (process.env.ENCRYPTION_KEY) {
    secret = process.env.ENCRYPTION_KEY;
  } else if (env.NODE_ENV === 'development' && env.NEXTAUTH_SECRET) {
    console.warn(
      '⚠️  Using NEXTAUTH_SECRET for encryption in development. Set ENCRYPTION_KEY for production.'
    );
    secret = env.NEXTAUTH_SECRET;
  } else {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for encryption'
    );
  }

  // Validate key strength
  if (secret.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }

  const salt = 'subpilot-encryption-salt-v1'; // Versioned salt for future key rotation
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

  if (!ivBase64 || !authTagBase64 || encryptedBase64 === undefined) {
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
