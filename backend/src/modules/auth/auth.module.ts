import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard, OptionalAuthGuard, SecurityGuard } from './auth.guard.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    SecurityGuard,
    AuthGuard,
    OptionalAuthGuard,
  ],
  exports: [AuthService, AuthGuard, OptionalAuthGuard, SecurityGuard],
})
export class AuthModule {}
