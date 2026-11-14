import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LabelsService } from './labels.service.js';
import { currentWarehouse } from '../../warehouse.js';

@Controller('labels')
export class LabelsController {
  constructor(
    private readonly labels: LabelsService,
    // Instance gudang CAS (repository koneksi 'cas') — tidak ada bila CAS disabled
    @Optional() @Inject('CAS_LABELS_SERVICE') private readonly casLabels?: LabelsService | null,
  ) {}

  /** Labels per gudang: ?wh=cas → database awbxray_cas, default BGD.
   *  (middleware warehouse juga meng-set ALS dari query — dua jalur sama-sama jalan) */
  private pick(wh?: string) {
    return wh === 'cas' || (wh === undefined && currentWarehouse() === 'cas')
      ? (this.casLabels ?? this.labels)
      : this.labels;
  }

  @Get()
  list(@Query('wh') wh?: string) {
    return this.pick(wh).list();
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('wh') wh?: string) {
    return this.pick(wh).remove(Number(id));
  }

  @Post('delete-many')
  removeMany(@Body() body: { ids?: number[] }, @Query('wh') wh?: string) {
    if (!Array.isArray(body?.ids)) throw new BadRequestException('Body { ids: [] } wajib');
    return this.pick(wh).removeMany(body.ids.map(Number));
  }

  /** Import file Excel (multipart field "file") — replace all */
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file?: { buffer: Buffer }, @Query('wh') wh?: string) {
    if (!file) throw new BadRequestException('File Excel wajib diunggah (field: file)');
    return this.pick(wh).importBuffer(file.buffer);
  }

  /** Import JSON langsung (dipakai script/internal) */
  @Post('import-rows')
  async importRows(@Body() body: { rows?: unknown[] }, @Query('wh') wh?: string) {
    if (!Array.isArray(body?.rows)) throw new BadRequestException('Body { rows: [] } wajib');
    return this.pick(wh).importRows(body.rows as never);
  }

  @Post('clear')
  clear(@Query('wh') wh?: string) {
    return this.pick(wh).clear();
  }
}
