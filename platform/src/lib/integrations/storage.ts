import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * File storage seam. `LocalDiskStorageProvider` writes to a private
 * `storage/uploads` folder (outside `public/`, gitignored) and files are
 * only ever served through the authenticated `/api/documents/[id]/file`
 * route, never a static URL — so access control is enforced by RBAC, not
 * by obscurity. A production deployment would swap in an S3 provider
 * (same interface) fronted by short-lived signed URLs.
 */
export interface StorageProvider {
  save(fileName: string, data: Buffer): Promise<{ storageKey: string }>;
  read(storageKey: string): Promise<Buffer>;
}

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");

class LocalDiskStorageProvider implements StorageProvider {
  async save(fileName: string, data: Buffer): Promise<{ storageKey: string }> {
    await fs.mkdir(UPLOAD_ROOT, { recursive: true });
    const safeExt = path.extname(fileName).slice(0, 10);
    const storageKey = `${crypto.randomUUID()}${safeExt}`;
    await fs.writeFile(path.join(UPLOAD_ROOT, storageKey), data);
    return { storageKey };
  }

  async read(storageKey: string): Promise<Buffer> {
    return fs.readFile(path.join(UPLOAD_ROOT, path.basename(storageKey)));
  }
}

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!provider) provider = new LocalDiskStorageProvider();
  return provider;
}
