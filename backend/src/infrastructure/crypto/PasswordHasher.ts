import bcrypt from 'bcryptjs';

export interface PasswordHasher {
  hash(value: string): Promise<string>;
  compare(value: string, hash: string): Promise<boolean>;
}

export class BcryptPasswordHasher implements PasswordHasher {
  private readonly rounds = process.env.NODE_ENV === 'test' ? 4 : 12;

  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.rounds);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
