import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Environment } from './config/environment.js';

export function configureApp(app: INestApplication): void {
  app.use(helmet());
  app.enableShutdownHooks();

  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  const origin = config.get('FRONTEND_ORIGIN', { infer: true });

  app.enableCors({
    origin: origin ?? 'http://localhost:3000',
    credentials: true,
  });

  const document = new DocumentBuilder()
    .setTitle('NestJS Starter Kit')
    .setDescription(
      'Example API. Authentication is required before public production use.',
    )
    .setVersion('1.0')
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    () => SwaggerModule.createDocument(app, document),
    {
      jsonDocumentUrl: 'docs-json',
      raw: ['json'],
    },
  );
}
