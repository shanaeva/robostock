import { Inject, Injectable } from '@nestjs/common';
import type { CodePurpose, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createSession(data: {
    userId: string;
    rememberMe: boolean;
    expiresAt: Date;
    tokenDigest: string;
  }) {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        rememberMe: data.rememberMe,
        expiresAt: data.expiresAt,
        tokens: {
          create: { digest: data.tokenDigest },
        },
      },
      select: { id: true },
    });
  }

  findRefreshToken(digest: string) {
    return this.prisma.refreshToken.findUnique({
      where: { digest },
      include: {
        session: {
          include: { user: true },
        },
      },
    });
  }

  rotateRefreshToken(
    tx: Prisma.TransactionClient,
    oldTokenId: string,
    sessionId: string,
    newDigest: string,
  ) {
    return Promise.all([
      tx.refreshToken.update({
        where: { id: oldTokenId },
        data: { usedAt: new Date() },
      }),
      tx.refreshToken.create({
        data: { sessionId, digest: newDigest },
        select: { id: true },
      }),
    ]);
  }

  revokeSession(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  findSessionWithUser(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
  }

  upsertEmailCode(data: {
    userId: string;
    purpose: CodePurpose;
    digest: string;
    expiresAt: Date;
  }) {
    return this.prisma.emailCode.upsert({
      where: { userId_purpose: { userId: data.userId, purpose: data.purpose } },
      create: {
        userId: data.userId,
        purpose: data.purpose,
        digest: data.digest,
        expiresAt: data.expiresAt,
      },
      update: {
        digest: data.digest,
        expiresAt: data.expiresAt,
        attempts: 0,
        consumedAt: null,
        sentAt: new Date(),
      },
    });
  }

  findActiveEmailCode(userId: string, purpose: CodePurpose) {
    return this.prisma.emailCode.findFirst({
      where: {
        userId,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  incrementCodeAttempts(id: string) {
    return this.prisma.emailCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  consumeEmailCode(id: string) {
    return this.prisma.emailCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  updatePasswordHash(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, verifiedAt: new Date() },
    });
  }

  $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }
}
