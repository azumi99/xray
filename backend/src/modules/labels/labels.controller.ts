import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LabelsService } from './labels.service.js';

@Controller('labels')
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Get()
  list() {
    return this.labels.list();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.labels.remove(Number(id));
  }

  @Post('delete-many')
  removeMany(@Body() body: { ids?: number[] }) {
    if (!Array.isArray(body?.ids)) throw new BadRequestException('Body { ids: [] } wajib');
    return this.labels.removeMany(body.ids.map(Number));
  }

  /** Import file Excel (multipart field "file") — replace all */
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file) throw new BadRequestException('File Excel wajib diunggah (field: file)');
    return this.labels.importBuffer(file.buffer);
  }

  /** Import JSON langsung (dipakai script/internal) */
  @Post('import-rows')
  async importRows(@Body() body: { rows?: unknown[] }) {
    if (!Array.isArray(body?.rows)) throw new BadRequestException('Body { rows: [] } wajib');
    return this.labels.importRows(body.rows as never);
  }

  @Post('clear')
  clear() {
    return this.labels.clear();
  }
}
