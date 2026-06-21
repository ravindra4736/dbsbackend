import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {}

  async saveFile(folder: string, filename: string, buffer: Buffer) {
    const uploadPath = this.configService.get<string>('app.uploadPath') || 'uploads';
    const dir = join(process.cwd(), uploadPath, folder);
    await fs.mkdir(dir, { recursive: true });

    const filepath = join(dir, filename);
    await fs.writeFile(filepath, buffer);
    return filepath;
  }

  getFileUrl(folder: string, filename: string) {
    const uploadPath = this.configService.get<string>('app.uploadPath');
    return `${this.configService.get<string>('app.url')}/${uploadPath}/${folder}/${filename}`;
  }
}
