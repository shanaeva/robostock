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
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
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
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary: 'Apply an atomic batch of map object changes',
    description:
      'Changes are applied strictly in order and either all succeed or none are saved. ' +
      'Every robot must end up orthogonally adjacent to at least one station; the station direction does not matter. ' +
      'Robots cannot be moved, and a station cannot be deleted while a robot is adjacent to it.',
  })
  @ApiNoContentResponse({ description: 'The batch was applied' })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiUnauthorizedResponse({ standardSchema: apiErrorSchema })
  @ApiForbiddenResponse({
    description: 'Missing or invalid CSRF token, or a foreign Origin',
    standardSchema: apiErrorSchema,
  })
  @ApiNotFoundResponse({
    description:
      'The warehouse does not exist or is not owned by the user, or an object was not found in it',
    standardSchema: apiErrorSchema,
  })
  @ApiUnprocessableEntityResponse({ standardSchema: apiErrorSchema })
  @ApiTooManyRequestsResponse({ standardSchema: apiErrorSchema })
  @ApiServiceUnavailableResponse({
    description:
      'The map is busy; nothing was saved and the batch can be retried',
    standardSchema: apiErrorSchema,
  })
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
