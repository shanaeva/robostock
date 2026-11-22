import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { apiErrorSchema } from '../../common/api-error.schema.js';
import {
  AuthGuard,
  SecurityGuard,
  type AuthenticatedRequest,
} from '../auth/auth.guard.js';
import {
  batchObjectChangesSchema,
  warehouseIdSchema,
} from './warehouse-map.schemas.js';
import type { BatchObjectChangesInput } from './warehouse-map.schemas.js';
import { WarehouseMapService } from './warehouse-map.service.js';

@ApiTags('warehouse-map')
@ApiInternalServerErrorResponse({ standardSchema: apiErrorSchema })
@Controller('warehouses')
@UseGuards(SecurityGuard, AuthGuard)
export class WarehouseMapController {
  constructor(
    @Inject(WarehouseMapService)
    private readonly warehouseMap: WarehouseMapService,
  ) {}

  @Patch(':warehouseId/objects')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Apply an atomic batch of map object changes',
    description:
      'Changes are applied strictly in order and either all succeed or none are saved. ' +
      'Every robot must end up orthogonally adjacent to at least one station.',
  })
  @ApiNoContentResponse({ description: 'The batch was applied' })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiUnauthorizedResponse({ standardSchema: apiErrorSchema })
  @ApiForbiddenResponse({ standardSchema: apiErrorSchema })
  @ApiNotFoundResponse({ standardSchema: apiErrorSchema })
  @ApiUnprocessableEntityResponse({ standardSchema: apiErrorSchema })
  applyChanges(
    @Param('warehouseId', { schema: warehouseIdSchema }) warehouseId: string,
    @Body({ schema: batchObjectChangesSchema }) input: BatchObjectChangesInput,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.auth?.user.id;

    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.warehouseMap.applyChanges(warehouseId, userId, input.changes);
  }
}
