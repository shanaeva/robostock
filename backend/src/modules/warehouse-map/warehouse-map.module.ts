import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { WarehouseMapController } from './warehouse-map.controller.js';
import {
  WAREHOUSE_MAP_STORAGE,
  WarehouseMapService,
} from './warehouse-map.service.js';
import { PrismaWarehouseMapStorage } from './warehouse-map.storage.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WarehouseMapController],
  providers: [
    WarehouseMapService,
    { provide: WAREHOUSE_MAP_STORAGE, useClass: PrismaWarehouseMapStorage },
  ],
})
export class WarehouseMapModule {}
