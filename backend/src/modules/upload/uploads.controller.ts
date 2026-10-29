import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

type UploadedImage = { buffer: Buffer; originalname?: string };

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async upload(@UploadedFile() file?: UploadedImage): Promise<{ image_path: string }> {
    if (!file) throw new Error('No image file provided');
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `awb_${Date.now()}${extname(file.originalname || '') || '.jpg'}`;
    await writeFile(join(UPLOAD_DIR, filename), file.buffer);
    return { image_path: `/uploads/${filename}` };
  }
}
