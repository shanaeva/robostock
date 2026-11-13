import { Logger, Module, StandardSchemaValidationPipe } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { environmentSchema } from './config/environment.js';
import { HealthController } from './health.controller.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: environmentSchema,
    }),
    PrismaModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements OnApplicationShutdown {
  private readonly logger = new Logger(AppModule.name);

  onApplicationShutdown(signal?: string): void {
    this.logger.log(`Application stopped (${signal ?? 'app.close'})`);
  }
}
