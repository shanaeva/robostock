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
import type { CookieOptions, Request, Response } from 'express';
import { readCookie } from '../../common/cookies.js';
import type { Environment } from '../../config/environment.js';
import { createCsrf, verifyCsrf } from './auth.crypto.js';
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
import { ACCESS_TTL_SECONDS, AuthService } from './auth.service.js';

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

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.nodeEnv === 'production',
      sameSite: this.nodeEnv === 'production' ? 'strict' : 'lax',
      path: '/',
    };
  }

  private setCredentials(
    response: Response,
    result: Awaited<ReturnType<AuthService['login']>>,
    rememberMe: boolean,
    sessionExpiresAt?: Date,
  ): void {
    const options = this.cookieOptions();
    response.cookie('access_token', result.accessToken, {
      ...options,
      ...(rememberMe ? { maxAge: ACCESS_TTL_SECONDS * 1000 } : {}),
    });
    response.cookie('refresh_token', result.refreshToken, {
      ...options,
      ...(rememberMe && sessionExpiresAt ? { expires: sessionExpiresAt } : {}),
    });
  }

  private clearCredentials(response: Response): void {
    response.clearCookie('access_token', this.cookieOptions());
    response.clearCookie('refresh_token', this.cookieOptions());
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
      ...this.cookieOptions(),
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000,
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
    this.setCredentials(response, result, input.rememberMe);
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
      this.setCredentials(response, result, false);
      return { user: result.user };
    } catch (error) {
      this.clearCredentials(response);
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
    this.clearCredentials(response);
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
    this.clearCredentials(response);
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
