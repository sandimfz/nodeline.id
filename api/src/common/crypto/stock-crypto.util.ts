import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts/decrypts StockUnit content (API keys, links) at rest.
 * Key is the 32-byte (64 hex char) STOCK_ENCRYPTION_KEY from validated env.
 * In production that value must come from a secret manager, never committed.
 *
 * Wire format (base64): [ iv (12) | authTag (16) | ciphertext ]
 */
@Injectable()
export class StockCryptoUtil {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('stock.encryptionKey');
    if (!raw) {
      // Validated at bootstrap by envValidationSchema, so this is defensive only.
      throw new Error('STOCK_ENCRYPTION_KEY is not configured');
    }
    this.key = Buffer.from(raw, 'hex');
    if (this.key.length !== 32) {
      throw new Error('STOCK_ENCRYPTION_KEY must decode to 32 bytes');
    }
  }

  encryptContent(plain: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decryptContent(encoded: string): string {
    const data = Buffer.from(encoded, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
