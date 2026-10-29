import 'dotenv/config';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '50mb' });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.enableCors();
  app.setGlobalPrefix('api');

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('AWB X-Ray API')
      .setDescription('API backend untuk aplikasi AWB X-Ray')
      .setVersion('1.0.0')
      .build(),
  );

  app.use(
    '/docs',
    apiReference({
      content: document,
      theme: 'purple',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
