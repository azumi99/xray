import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabelFedex } from '../../entities/label-fedex.entity.js';
import { LabelsController } from './labels.controller.js';
import { LabelsService } from './labels.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([LabelFedex])],
  controllers: [LabelsController],
  providers: [LabelsService],
})
export class LabelsModule {}
