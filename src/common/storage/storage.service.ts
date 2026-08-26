import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join, normalize, resolve, sep } from 'path';

const MEDIA_FOLDER = 'media';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {}

  getUploadRoot(): string {
    const uploadPath =
      this.configService.get<string>('app.uploadPath') || 'uploads';
    return resolve(process.cwd(), uploadPath);
  }

  getMediaDir(): string {
    return join(this.getUploadRoot(), MEDIA_FOLDER);
  }

  /**
   * Persist a media file under uploads/media/{filename}.
   * Returns relative storageKey and public url path.
   */
  async saveMediaFile(
    filename: string,
    buffer: Buffer,
  ): Promise<{ storageKey: string; absolutePath: string; url: string }> {
    this.assertSafeFilename(filename);

    const mediaDir = this.getMediaDir();
    await fs.mkdir(mediaDir, { recursive: true });

    const absolutePath = this.resolveMediaPath(filename);
    await fs.writeFile(absolutePath, buffer);

    const storageKey = `${MEDIA_FOLDER}/${filename}`;
    const url = `/uploads/${storageKey}`;

    return { storageKey, absolutePath, url };
  }

  async deleteMediaFile(storageKey: string): Promise<boolean> {
    try {
      const absolutePath = this.resolvePathFromStorageKey(storageKey);
      await fs.unlink(absolutePath);
      return true;
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        this.logger.warn(
          `Media file already missing for storageKey=${storageKey}`,
        );
        return false;
      }
      throw error;
    }
  }

  /**
   * Resolve and verify a media filename stays inside the media directory.
   */
  resolveMediaPath(filename: string): string {
    this.assertSafeFilename(filename);
    const mediaDir = this.getMediaDir();
    const absolutePath = resolve(mediaDir, filename);
    this.assertInsideDirectory(absolutePath, mediaDir);
    return absolutePath;
  }

  resolvePathFromStorageKey(storageKey: string): string {
    const normalized = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
    if (
      normalized.includes('..') ||
      normalized.startsWith('/') ||
      !normalized.startsWith(`${MEDIA_FOLDER}/`)
    ) {
      throw new BadRequestException('Invalid storage key.');
    }

    const relative = normalized.slice(MEDIA_FOLDER.length + 1);
    return this.resolveMediaPath(relative);
  }

  private assertSafeFilename(filename: string): void {
    if (!filename || typeof filename !== 'string') {
      throw new BadRequestException('Invalid filename.');
    }
    if (
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\') ||
      filename.includes('\0') ||
      /^[a-zA-Z]:/.test(filename)
    ) {
      throw new BadRequestException('Invalid filename.');
    }
  }

  private assertInsideDirectory(absolutePath: string, rootDir: string): void {
    const normalizedRoot = normalize(rootDir + sep);
    const normalizedPath = normalize(absolutePath);
    if (
      normalizedPath !== rootDir &&
      !normalizedPath.startsWith(normalizedRoot)
    ) {
      throw new BadRequestException('Invalid storage path.');
    }
  }
}
