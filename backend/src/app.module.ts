import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AirwaybillXray, AirwaybillXrayDetail } from './entities/airwaybill-xray.entity.js';
import { WatchedFile } from './entities/watched-file.entity.js';
import { User } from './entities/user.entity.js';
import { LabelFedex } from './entities/label-fedex.entity.js';
import { AwbService } from './modules/awb/awb.service.js';
import { AwbResolver } from './modules/awb/awb.resolver.js';
import { HostawbService } from './modules/awb/hostawb.service.js';
import { AwbRegistry } from './modules/awb/awb-registry.service.js';
import { AwbEventsService } from './modules/awb/awb-events.service.js';
import { AwbEventsController } from './modules/awb/awb-events.controller.js';
import { AuthService } from './modules/auth/auth.service.js';
import { AuthResolver } from './modules/auth/auth.resolver.js';
import { OcrQueueService } from './modules/ocr/ocr-queue.service.js';
import { OcrResolver } from './modules/ocr/ocr.resolver.js';
import { YoloService } from './modules/vision/yolo.service.js';
import { OpenCvService } from './modules/vision/opencv.service.js';
import { VisionController } from './modules/vision/vision.controller.js';
import { UploadsController } from './modules/upload/uploads.controller.js';
import { LabelsModule } from './modules/labels/labels.module.js';
import { LabelsService } from './modules/labels/labels.service.js';

const ENTITIES = [AirwaybillXray, AirwaybillXrayDetail, WatchedFile, User, LabelFedex];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'awbxray_bgd',
      entities: ENTITIES,
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
    }),
    // Koneksi gudang CAS — database kembar (awbxray_cas) di MySQL yang sama.
    // Nonaktif dengan CAS_DB_ENABLED=false (mis. server tanpa db CAS).
    ...(process.env.CAS_DB_ENABLED === 'false'
      ? []
      : [TypeOrmModule.forRoot({
          name: 'cas',
          type: 'mysql' as const,
          host: process.env.CAS_DB_HOST ?? '127.0.0.1',
          port: Number(process.env.CAS_DB_PORT ?? 3308),
          username: process.env.CAS_DB_USER ?? process.env.DB_USER ?? 'root',
          password: process.env.CAS_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '',
          database: process.env.CAS_DB_NAME ?? 'awbxray_cas',
          entities: ENTITIES,
          synchronize: false,
          logging: process.env.DB_LOGGING === 'true',
        })]),
    TypeOrmModule.forFeature([AirwaybillXray, AirwaybillXrayDetail, WatchedFile, User]),
    LabelsModule,
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'dev-secret-change-me', signOptions: { expiresIn: '7d' } }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      path: '/graphql',
      playground: true,
      introspection: true,
      context: (context: { req: import('express').Request }) => ({ req: context.req }),
    }),
  ],
  controllers: [AppController, UploadsController, AwbEventsController, VisionController],
  providers: [
    AppService,
    AwbService,
    AwbResolver,
    HostawbService,
    AwbRegistry,
    AwbEventsService,
    AuthService,
    AuthResolver,
    OcrQueueService,
    OcrResolver,
    YoloService,
    OpenCvService,
    // Labels gudang CAS — instance kedua dengan repository koneksi 'cas'
    ...(process.env.CAS_DB_ENABLED === 'false'
      ? []
      : [{
          provide: 'CAS_LABELS_SERVICE',
          inject: [getDataSourceToken('cas')],
          useFactory: (source: import('typeorm').DataSource) => new LabelsService(source.getRepository(LabelFedex)),
        }]),
  ],
})
// (middleware gudang dipasang di main.ts pada instance express paling depan)
export class AppModule {}

