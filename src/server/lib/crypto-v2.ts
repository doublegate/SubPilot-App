import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Enhanced encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption with random salts
 */

// Declare global type for TypeScript
declare global {
  var __encryptionWarningShown: boolean | undefined;
}

/**
 * Get encryption key from environment
 */
const getEncryptionSecret = (): string => {
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

  return secret;
};

/**
 * Derive encryption key with random salt
 */
const deriveKey = async (secret: string, salt: Buffer): Promise<Buffer> => {
  const key = (await scryptAsync(secret, salt, 32)) as Buffer;
  return key;
};

/**
 * Enhanced encrypt function with random salt per operation
 * @param text - The plain text to encrypt
 * @returns Encrypted string in format: salt:iv:authTag:encrypted
 */
export const encryptWithSalt = async (text: string): Promise<string> => {
  const secret = getEncryptionSecret();
  const salt = randomBytes(32); // Random salt per encryption
  const key = await deriveKey(secret, salt);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine salt, iv, authTag, and encrypted data
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
};

/**
 * Enhanced decrypt function with salt support
 * @param encryptedText - The encrypted string in format: salt:iv:authTag:encrypted
 * @returns Decrypted plain text
 */
export const decryptWithSalt = async (
  encryptedText: string
): Promise<string> => {
  const parts = encryptedText.split(':');

  // Handle both old format (3 parts) and new format (4 parts)
  if (parts.length === 3) {
    // Legacy format without salt - use old decrypt function
    throw new Error(
      'Legacy encryption format detected. Please re-encrypt data.'
    );
  }

  if (parts.length !== 4) {
    throw new Error('Invalid encrypted format');
  }

  const [saltBase64, ivBase64, authTagBase64, encryptedBase64] = parts;

  if (
    !saltBase64 ||
    !ivBase64 ||
    !authTagBase64 ||
    encryptedBase64 === undefined
  ) {
    throw new Error('Invalid encrypted format');
  }

  const secret = getEncryptionSecret();
  const salt = Buffer.from(saltBase64, 'base64');
  const key = await deriveKey(secret, salt);
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
 * Re-encrypt data with new salt-based encryption
 * Used for migrating existing encrypted data
 */
export const reEncrypt = async (
  oldEncryptedText: string,
  decryptFn: (text: string) => Promise<string>
): Promise<string> => {
  try {
    // Decrypt with old method
    const plainText = await decryptFn(oldEncryptedText);
    // Re-encrypt with new method
    return await encryptWithSalt(plainText);
  } catch (error) {
    throw new Error('Failed to re-encrypt data: ' + (error as Error).message);
  }
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

// Export enhanced versions as default
export const encrypt = encryptWithSalt;
export const decrypt = decryptWithSalt;
