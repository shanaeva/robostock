import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { readCookie } from '../../common/cookies.js';
import type { Environment } from '../../config/environment.js';
import { createCsrf, verifyCsrf } from './auth.crypto.js';
import { CSRF_TTL_MS } from './auth.constants.js';
import {
  clearCredentials,
  cookieOptions,
  setCredentials,
} from './auth.utils.js';
import {
  AuthGuard,
  SecurityGuard,
  type AuthenticatedRequest,
} from './auth.guard.js';
import {
  forgotPasswordSchema,
  loginSchema,
  parseInput,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
@UseGuards(SecurityGuard)
export class AuthController {
  private readonly nodeEnv: string;
  private readonly csrfSecret: string;

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ConfigService) config: ConfigService<Environment>,
  ) {
    this.nodeEnv = config.getOrThrow('NODE_ENV');
    this.csrfSecret = config.getOrThrow('CSRF_SECRET');
  }

  @Get('csrf')
  csrf(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const existing = readCookie(request, 'csrf_token');
    const csrfToken =
      existing && verifyCsrf(this.csrfSecret, existing)
        ? existing
        : createCsrf(this.csrfSecret);
    response.cookie('csrf_token', csrfToken, {
      ...cookieOptions(this.nodeEnv),
      httpOnly: false,
      maxAge: CSRF_TTL_MS,
    });
    return { csrfToken };
  }

  @Get('settings')
  settings() {
    return this.auth.getSettings();
  }

  @Post('register')
  @HttpCode(202)
  register(@Body() body: unknown) {
    return this.auth.register(parseInput(registerSchema, body));
  }

  @Post('resend-verification')
  @HttpCode(202)
  resendVerification(@Body() body: unknown) {
    const input = parseInput(resendVerificationSchema, body);
    return this.auth.resendVerification(input.email);
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() body: unknown) {
    const input = parseInput(verifyEmailSchema, body);
    return this.auth.verifyEmail(input.email, input.code, input.password);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const input = parseInput(loginSchema, body);
    const result = await this.auth.login(input);
    setCredentials(response, result, input.rememberMe, this.nodeEnv);
    return { user: result.user };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.auth!.user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const result = await this.auth.refresh(
        readCookie(request, 'refresh_token'),
      );
      setCredentials(response, result, false, this.nodeEnv);
      return { user: result.user };
    } catch (error) {
      clearCredentials(response, this.nodeEnv);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.logout(
      readCookie(request, 'access_token'),
      readCookie(request, 'refresh_token'),
    );
    clearCredentials(response, this.nodeEnv);
    return result;
  }

  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.logoutAll(request.auth!.user.id);
    clearCredentials(response, this.nodeEnv);
    return result;
  }

  @Post('forgot-password')
  @HttpCode(202)
  forgotPassword(@Body() body: unknown) {
    const input = parseInput(forgotPasswordSchema, body);
    return this.auth.forgotPassword(input.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() body: unknown) {
    const input = parseInput(resetPasswordSchema, body);
    return this.auth.resetPassword(input);
  }
}
