import {
  applyDecorators,
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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
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
import { CurrentOwnerId } from '../../common/decorators/current-owner-id.decorator.js';
import { apiErrorSchema } from '../../common/api-error.schema.js';
import { AuthGuard, SecurityGuard } from '../auth/auth.guard.js';

function ProtectWarehouseWrite() {
  return applyDecorators(
    UseGuards(SecurityGuard),
    ApiHeader({ name: 'X-CSRF-Token', required: true }),
    ApiForbiddenResponse({ standardSchema: apiErrorSchema }),
    ApiTooManyRequestsResponse({ standardSchema: apiErrorSchema }),
  );
}

@ApiTags('warehouses')
@ApiInternalServerErrorResponse({ standardSchema: apiErrorSchema })
@ApiUnauthorizedResponse({ standardSchema: apiErrorSchema })
@Controller('warehouses')
@UseGuards(AuthGuard)
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
    @CurrentOwnerId() ownerId: string,
    @Query({ schema: listWarehousesQuerySchema }) query: ListWarehousesQuery,
  ) {
    return this.warehouses.list(ownerId, query);
  }

  @Post()
  @ProtectWarehouseWrite()
  @ApiOperation({ operationId: 'createWarehouse', summary: 'Создать склад' })
  @ApiCreatedResponse({ standardSchema: warehouseCreatedSchema })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiConflictResponse({ standardSchema: apiErrorSchema })
  create(
    @CurrentOwnerId() ownerId: string,
    @Body({ schema: createWarehouseSchema }) input: CreateWarehouseInput,
  ) {
    return this.warehouses.create(ownerId, input);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getWarehouse' })
  @ApiOkResponse({ standardSchema: warehouseDetailsSchema })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiNotFoundResponse({ standardSchema: apiErrorSchema })
  get(
    @CurrentOwnerId() ownerId: string,
    @Param('id', { schema: warehouseIdSchema }) id: string,
  ) {
    return this.warehouses.get(ownerId, id);
  }

  @Patch(':id')
  @ProtectWarehouseWrite()
  @HttpCode(204)
  @ApiOperation({
    operationId: 'updateWarehouse',
    summary: 'Переименовать склад',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiNotFoundResponse({ standardSchema: apiErrorSchema })
  @ApiConflictResponse({ standardSchema: apiErrorSchema })
  rename(
    @CurrentOwnerId() ownerId: string,
    @Param('id', { schema: warehouseIdSchema }) id: string,
    @Body({ schema: updateWarehouseSchema }) input: UpdateWarehouseInput,
  ) {
    return this.warehouses.rename(ownerId, id, input);
  }

  @Delete(':id')
  @ProtectWarehouseWrite()
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteWarehouse', summary: 'Удалить склад' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiNotFoundResponse({ standardSchema: apiErrorSchema })
  remove(
    @CurrentOwnerId() ownerId: string,
    @Param('id', { schema: warehouseIdSchema }) id: string,
  ) {
    return this.warehouses.remove(ownerId, id);
  }
}
