import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { LabelFedex } from '../../entities/label-fedex.entity.js';
import { LabelsController } from './labels.controller.js';
import { LabelsService } from './labels.service.js';

/** Koneksi CAS aktif kecuali CAS_DB_ENABLED=false (mis. server tanpa db CAS). */
const CAS_ENABLED = process.env.CAS_DB_ENABLED !== 'false';

/** LabelsModule — repository default (awbxray_bgd) + instance CAS (awbxray_cas)
 *  lewat named connection 'cas'. Token provider HARUS terdaftar di modul ini
 *  supaya LabelsController (scope injector LabelsModule) bisa meng-inject-nya. */
@Module({
  imports: [
    TypeOrmModule.forFeature([LabelFedex]),
    ...(CAS_ENABLED ? [TypeOrmModule.forFeature([LabelFedex], 'cas')] : []),
  ],
  controllers: [LabelsController],
  providers: [
    LabelsService,
    ...(CAS_ENABLED
      ? [{
          provide: 'CAS_LABELS_SERVICE',
          inject: [getRepositoryToken(LabelFedex, 'cas')],
          useFactory: (repo: import('typeorm').Repository<typeof LabelFedex>) =>
            new LabelsService(repo as never),
        }]
      : []),
  ],
})
export class LabelsModule {}
