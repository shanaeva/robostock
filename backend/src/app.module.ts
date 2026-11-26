import { Logger, Module, StandardSchemaValidationPipe } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { environmentSchema } from './config/environment.js';
import { HealthController } from './health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { WarehouseMapModule } from './modules/warehouse-map/warehouse-map.module.js';
import { WarehousesModule } from './modules/warehouses/warehouses.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // In test, also load .env.test so tests can override dev defaults (e.g. AUTH_EMAIL_ENABLED=false).
      envFilePath:
        process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
      validate: (env) => environmentSchema.parse(env),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WarehousesModule,
    WarehouseMapModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
  ],
})
export class AppModule implements OnApplicationShutdown {
  private readonly logger = new Logger(AppModule.name);

  onApplicationShutdown(signal?: string): void {
    this.logger.log(`Application stopped (${signal ?? 'app.close'})`);
  }
}
