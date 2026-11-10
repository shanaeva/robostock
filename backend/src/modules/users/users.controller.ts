import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { apiErrorSchema } from '../../common/api-error.schema.js';
import { paginationSchema } from '../../common/pagination.schema.js';
import type { Pagination } from '../../common/pagination.schema.js';
import {
  createUserSchema,
  userIdSchema,
  userResponseSchema,
  usersResponseSchema,
} from './users.schemas.js';
import type { CreateUserInput } from './users.schemas.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiInternalServerErrorResponse({ standardSchema: apiErrorSchema })
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ standardSchema: userResponseSchema })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiConflictResponse({ standardSchema: apiErrorSchema })
  create(@Body({ schema: createUserSchema }) input: CreateUserInput) {
    return this.users.create(input);
  }

  @Get()
  @ApiOperation({
    summary: 'List users, newest first (createdAt DESC, id DESC)',
  })
  @ApiOkResponse({ standardSchema: usersResponseSchema })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  findAll(@Query({ schema: paginationSchema }) query: Pagination) {
    return this.users.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by UUID' })
  @ApiOkResponse({ standardSchema: userResponseSchema })
  @ApiBadRequestResponse({ standardSchema: apiErrorSchema })
  @ApiNotFoundResponse({ standardSchema: apiErrorSchema })
  findOne(@Param('id', { schema: userIdSchema }) id: string) {
    return this.users.findOne(id);
  }
}
