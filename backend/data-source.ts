import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AirwaybillXray, AirwaybillXrayDetail } from './src/entities/airwaybill-xray.entity.js';
import { WatchedFile } from './src/entities/watched-file.entity.js';
import { User } from './src/entities/user.entity.js';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'awbxray',
  entities: [AirwaybillXray, AirwaybillXrayDetail, WatchedFile, User],
  migrations: [`${import.meta.dirname}/src/migrations/*.ts`],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
