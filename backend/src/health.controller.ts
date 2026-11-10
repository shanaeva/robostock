import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { apiErrorSchema } from './common/api-error.schema.js';
import { PrismaService } from './prisma/prisma.service.js';

const healthResponseSchema = z
  .object({ status: z.literal('ok'), database: z.literal('up') })
  .meta({ id: 'Health' });

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check application and PostgreSQL availability' })
  @ApiOkResponse({ standardSchema: healthResponseSchema })
  @ApiServiceUnavailableResponse({ standardSchema: apiErrorSchema })
  async check(): Promise<z.infer<typeof healthResponseSchema>> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
