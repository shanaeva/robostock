import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../modules/auth/auth.guard.js';

export const CurrentOwnerId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const { auth } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!auth) {
      throw new UnauthorizedException();
    }

    return auth.user.id;
  },
);
