import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  createWarehouseSchema,
  listWarehousesQuerySchema,
  updateWarehouseSchema,
  warehouseCreatedSchema,
  warehouseDetailsSchema,
  warehouseIdSchema,
  warehousesResponseSchema,
} from './warehouses.schemas.js';
import type {
  CreateWarehouseInput,
  ListWarehousesQuery,
  UpdateWarehouseInput,
} from './warehouses.schemas.js';
import { WarehousesService } from './warehouses.service.js';
import { apiErrorSchema } from '../common/api-error.schema.js';

// Заглушка до появления авторизации. Должен быть валидным uuid.
export const OWNER_ID = '4cfa132e-efa5-4148-b573-3587652e870f';

@ApiTags('warehouses')
@ApiInternalServerErrorResponse({ standardSchema: apiErrorSchema })
@Controller('warehouses')
export class WarehousesController {
  constructor(
    @Inject(WarehousesService) private readonly warehouses: WarehousesService,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'listWarehouses',
    summary: 'Получить список складов для таблицы',
  })
  @ApiOkResponse({ standardSchema: warehousesResponseSchema })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  list(
    @Query({ schema: listWarehousesQuerySchema }) query: ListWarehousesQuery,
  ) {
    return this.warehouses.list(OWNER_ID, query);
  }

  @Post()
  @ApiOperation({ operationId: 'createWarehouse', summary: 'Создать склад' })
  @ApiCreatedResponse({ standardSchema: warehouseCreatedSchema })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  create(@Body({ schema: createWarehouseSchema }) input: CreateWarehouseInput) {
    return this.warehouses.create(OWNER_ID, input);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getWarehouse' })
  @ApiOkResponse({ standardSchema: warehouseDetailsSchema })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiNotFoundResponse({ standardSchema: apiErrorSchema })
  get(@Param('id', { schema: warehouseIdSchema }) id: string) {
    return this.warehouses.get(OWNER_ID, id);
  }

  @Patch(':id')
  @HttpCode(204)
  @ApiOperation({
    operationId: 'updateWarehouse',
    summary: 'Переименовать склад',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiNotFoundResponse({ standardSchema: apiErrorSchema })
  rename(
    @Param('id', { schema: warehouseIdSchema }) id: string,
    @Body({ schema: updateWarehouseSchema }) input: UpdateWarehouseInput,
  ) {
    return this.warehouses.rename(OWNER_ID, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteWarehouse', summary: 'Удалить склад' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiNotFoundResponse({ standardSchema: apiErrorSchema })
  remove(@Param('id', { schema: warehouseIdSchema }) id: string) {
    return this.warehouses.remove(OWNER_ID, id);
  }
}
