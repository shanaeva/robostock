import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import type { Environment } from './config/environment.js';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });

  try {
    configureApp(app);
    await app.listen(port, '127.0.0.1');
    logger.log(`Application listening on http://localhost:${String(port)}`);
  } catch (error: unknown) {
    await app.close();
    throw error;
  }
}

try {
  await bootstrap();
} catch {
  logger.error(
    'Application startup failed. Check configuration and port availability.',
  );
  process.exitCode = 1;
}
