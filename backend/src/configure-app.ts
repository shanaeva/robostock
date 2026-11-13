import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureApp(app: INestApplication): void {
  app.enableShutdownHooks();

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
