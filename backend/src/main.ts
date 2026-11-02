import 'dotenv/config';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '50mb' });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.enableCors();
  app.setGlobalPrefix('api');

  // Mode hybrid (DB di server, kode di lokal): file uploads milik record produksi
  // tidak ada di disk lokal → proxy ke server produksi. File capture lokal tetap
  // diserve dari disk (static di atas jalan lebih dulu).
  const REMOTE_UPLOADS = process.env.REMOTE_UPLOADS_BASE;
  if (REMOTE_UPLOADS) {
    app.use('/uploads', (req: import('express').Request, res: import('express').Response) => {
      const name = basename(req.path);
      const local = join(process.cwd(), 'uploads', name);
      if (existsSync(local)) {
        res.status(200).sendFile(local);
        return;
      }
      void fetch(`${REMOTE_UPLOADS}/${name}`)
        .then((upstream) => {
          if (!upstream.ok || !upstream.body) {
            res.status(404).json({ message: 'File not found' });
            return;
          }
          res.setHeader('content-type', upstream.headers.get('content-type') ?? 'image/jpeg');
          res.setHeader('cache-control', 'public, max-age=3600');
          void upstream.body.pipeTo(
            new WritableStream({
              write: (chunk) => { res.write(chunk); },
              close: () => { res.end(); },
            }),
          );
        })
        .catch(() => res.status(502).json({ message: 'Remote uploads unreachable' }));
    });
  }

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
