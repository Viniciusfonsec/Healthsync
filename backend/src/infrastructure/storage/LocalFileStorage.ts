import fs from 'node:fs/promises';
import path from 'node:path';

export interface StoredFile {
  path: string;
}

export class LocalFileStorage {
  constructor(private readonly root: string) { }

  async init(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async write(id: string | number, data: Buffer): Promise<StoredFile> {
    const file = path.join(this.root, `${id}.bin`);
    await fs.writeFile(file, data, { flag: 'wx' });
    return { path: file };
  }

  async read(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }
}
