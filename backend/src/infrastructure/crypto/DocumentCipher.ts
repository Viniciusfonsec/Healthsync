import crypto from 'node:crypto';

export interface EncryptedFile {
  encrypted: Buffer;
  iv: string;
  authTag: string;
}

export class DocumentCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(data: Buffer): EncryptedFile {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
    };
  }

  decrypt(data: Buffer, iv: string, authTag: string): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }
}
