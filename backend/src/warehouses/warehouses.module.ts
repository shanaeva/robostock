import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WarehousesService } from './warehouses.service.js';
import { WarehousesController } from './warehouses.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [WarehousesController],
  providers: [WarehousesService],
})
export class WarehousesModule {}
