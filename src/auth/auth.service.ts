import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
  sessionId: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists.');
    }

    // Default role for registered users is Author
    const authorRole = await this.prisma.role.findUnique({
      where: { slug: 'author' },
    });

    if (!authorRole) {
      throw new BadRequestException('Default registration role does not exist.');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName || null,
        status: 'ACTIVE',
      },
    });

    // Assign author role via UserRole junction table
    await this.prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: authorRole.id,
      },
    });

    // Fetch user with roles
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Create session & generate tokens
    const tokens = await this.createSession(user.id, userWithRoles, '0.0.0.0', 'Registration');
    return tokens;
  }

  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      await this.activityLogsService.log({
        userId: user?.id,
        action: 'LOGIN_FAILED',
        resource: 'User',
        resourceId: user?.id,
        metadata: { message: `Failed login attempt from IP: ${ipAddress}` },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Check account status
    if (user.status === 'INACTIVE') {
      await this.activityLogsService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'User',
        resourceId: user.id,
        metadata: { message: `Inactive user login attempt from IP: ${ipAddress}` },
        ipAddress,
        userAgent,
      });
      throw new ForbiddenException('Your account is inactive. Please contact an administrator.');
    } else if (user.status === 'SUSPENDED') {
      await this.activityLogsService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'User',
        resourceId: user.id,
        metadata: { message: `Suspended user login attempt from IP: ${ipAddress}` },
        ipAddress,
        userAgent,
      });
      throw new ForbiddenException('Your account is suspended. Please contact an administrator.');
    }

    // Update last login info
    await this.usersService.updateLoginMetadata(user.id, ipAddress);

    // Create session & generate tokens
    const tokens = await this.createSession(user.id, user, ipAddress, userAgent);

    // Log Login activity
    await this.activityLogsService.log({
      userId: user.id,
      action: 'LOGIN',
      resource: 'User',
      resourceId: user.id,
      metadata: { message: `User logged in from IP: ${ipAddress}` },
      ipAddress,
      userAgent,
    });

    return tokens;
  }

  async logout(userId: string, sessionId: string, ipAddress?: string, userAgent?: string) {
    await this.revokeSession(userId, sessionId);

    await this.activityLogsService.log({
      userId,
      action: 'LOGOUT',
      resource: 'UserSession',
      resourceId: sessionId,
      metadata: { message: `User logged out of session: ${sessionId}` },
      ipAddress,
      userAgent,
    });

    return { message: 'Logout successful' };
  }

  async logoutAll(userId: string, ipAddress?: string, userAgent?: string) {
    await this.revokeAllSessions(userId);

    await this.activityLogsService.log({
      userId,
      action: 'LOGOUT',
      resource: 'User',
      resourceId: userId,
      metadata: { message: `User logged out of all devices` },
      ipAddress,
      userAgent,
    });

    return { message: 'Logged out of all devices successfully' };
  }

  async refreshTokens(refreshToken: string, ipAddress: string, userAgent: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const { sub: userId, sessionId } = payload;

      // 1. Check Redis cache first, fall back to DB
      const cacheKey = `session:active:${userId}:${sessionId}`;
      let session = await this.redisService.get<{
        id: string;
        userId: string;
        refreshTokenHash: string;
        expiresAt: string;
      }>(cacheKey);

      if (!session) {
        // Fall back to database
        const dbSession = await this.prisma.userSession.findFirst({
          where: {
            id: sessionId,
            userId,
            revokedAt: null,
            expiresAt: { gte: new Date() },
          },
        });

        if (!dbSession) {
          throw new UnauthorizedException('Session is invalid or expired.');
        }

        session = {
          id: dbSession.id,
          userId: dbSession.userId,
          refreshTokenHash: dbSession.refreshTokenHash,
          expiresAt: dbSession.expiresAt.toISOString(),
        };

        // Cache it in Redis
        const ttl = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
        if (ttl > 0) {
          await this.redisService.set(cacheKey, session, ttl);
        }
      }

      // 2. Verify token hash
      const isTokenValid = await argon2.verify(session.refreshTokenHash, refreshToken);
      if (!isTokenValid) {
        // Token reuse detected! Revoke all sessions for safety.
        await this.revokeAllSessions(userId);
        throw new UnauthorizedException('Token reuse detected. All sessions revoked for safety.');
      }

      // 3. Generate new tokens
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
        throw new UnauthorizedException('User is no longer active.');
      }

      // RTR: generate new tokens
      if (!user.userRoles || user.userRoles.length === 0) {
        throw new UnauthorizedException('User has no assigned roles.');
      }
      const roles = user.userRoles.map((ur: any) => ur.role.slug);
      const jwtPayload = this.createJwtPayload(user.id, user.email, roles, session.id);
      const accessToken = await this.signAccessToken(jwtPayload);
      const newRefreshToken = await this.signRefreshToken(jwtPayload);

      const newRefreshTokenHash = await argon2.hash(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Update session in DB
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt,
          ipAddress,
          userAgent,
        },
      });

      // Update session in cache
      const cacheTtl = Math.floor((newExpiresAt.getTime() - Date.now()) / 1000);
      await this.redisService.set(
        cacheKey,
        {
          id: session.id,
          userId,
          refreshTokenHash: newRefreshTokenHash,
          expiresAt: newExpiresAt.toISOString(),
        },
        cacheTtl,
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles,
        },
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Token validation failed.');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      // Return a standard success message to prevent user enumeration
      return { message: 'If the email exists, a password reset link has been generated.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const cacheKey = `password_reset:${resetToken}`;

    // Cache the reset token for 1 hour
    await this.redisService.set(cacheKey, user.id, 3600);

    // Mock Email Send
    console.log(`[MAIL MOCK] Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a password reset link has been generated.' };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const cacheKey = `password_reset:${resetToken}`;
    const userId = await this.redisService.get<string>(cacheKey);

    if (!userId) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const newPasswordHash = await argon2.hash(newPassword);
    await this.usersService.updatePassword(userId, newPasswordHash);

    // Remove reset token from cache
    await this.redisService.del(cacheKey);

    await this.revokeAllSessions(userId);

    await this.activityLogsService.log({
      userId,
      action: 'RESET_PASSWORD',
      resource: 'User',
      resourceId: userId,
      metadata: { message: 'Password reset completed via token request' },
    });

    return { message: 'Password has been reset successfully.' };
  }

  // Create Session and cache in Redis
  private async createSession(
    userId: string,
    user: any,
    ipAddress: string,
    userAgent: string,
  ) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (!user.userRoles || user.userRoles.length === 0) {
      throw new Error('User must have at least one role assigned.');
    }

    const roles = user.userRoles.map((ur: any) => ur.role.slug);
    const payload = this.createJwtPayload(userId, user.email, roles, sessionId);
    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken(payload);

    const refreshTokenHash = await argon2.hash(refreshToken);

    // Save User Session to Database
    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Cache active session in Redis
    const cacheKey = `session:active:${userId}:${sessionId}`;
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await this.redisService.set(
      cacheKey,
      {
        id: sessionId,
        userId,
        refreshTokenHash,
        expiresAt: expiresAt.toISOString(),
      },
      ttlSeconds,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
    };
  }

  // Revoke specific session
  private async revokeSession(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Remove from Redis Cache
    const cacheKey = `session:active:${userId}:${sessionId}`;
    await this.redisService.del(cacheKey);
  }

  // Revoke all sessions for a user
  private async revokeAllSessions(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.redisService.delByPattern(`session:active:${userId}:*`);
  }

  private createJwtPayload(
    userId: string,
    email: string,
    roles: string[],
    sessionId: string,
  ): JwtPayload {
    return {
      sub: userId,
      email,
      roles,
      sessionId,
    };
  }

  private signAccessToken(payload: JwtPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredConfig('jwt.secret'),
      expiresIn: this.getJwtExpiration('jwt.expiresIn'),
    });
  }

  private signRefreshToken(payload: JwtPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredConfig('jwt.refreshSecret'),
      expiresIn: this.getJwtExpiration('jwt.refreshExpiresIn'),
    });
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required configuration: ${key}`);
    }
    return value;
  }

  private getJwtExpiration(key: string): StringValue | number {
    const value = this.getRequiredConfig(key);
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }

    if (!/^\d+(?:\.\d+)?\s*(?:ms|s|m|h|d|w|y)$/i.test(value)) {
      throw new Error(`Invalid JWT expiration configuration: ${key}`);
    }

    return value as StringValue;
  }
}
