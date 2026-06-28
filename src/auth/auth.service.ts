import { randomInt } from 'crypto';
import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { JwtPayload, RequestUser } from './types/jwt-payload.type';
import { FirstLoginDto } from './dto/first-login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private bcryptSaltRounds: number;
  private maxLoginAttempts: number;
  private lockoutDurationMinutes: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService<AppConfig, true>,
    private auditService: AuditService,
  ) {
    const authConfig = this.configService.get('auth', { infer: true });
    this.bcryptSaltRounds = authConfig.bcryptSaltRounds;
    this.maxLoginAttempts = authConfig.maxLoginAttempts;
    this.lockoutDurationMinutes = authConfig.lockoutDurationMinutes;
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      return null;
    }

    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(`Account is locked. Try again after ${user.lockedUntil.toISOString()}`);
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    
    if (!isMatch) {
      const attempts = user.failedLoginAttempts + 1;
      const updates: any = { failedLoginAttempts: attempts };
      if (attempts >= this.maxLoginAttempts) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + this.lockoutDurationMinutes);
        updates.lockedUntil = lockedUntil;
      }
      await this.prisma.user.update({ where: { id: user.id }, data: updates });
      return null;
    }

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const { passwordHash, refreshTokenHash, ...result } = user;
    return result;
  }

  async login(user: RequestUser) {
    if (!user.firstLoginCompleted || user.mustChangePassword) {
      throw new ForbiddenException({
        message: 'You must change your password before proceeding.',
        code: 'MUST_CHANGE_PASSWORD',
      });
    }

    return this.generateTokenPair(user);
  }

  async logout(userId: string, communityId?: string): Promise<{ success: boolean }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    await this.auditService.write({
      communityId: communityId ?? null,
      actorId: userId,
      action: AuditAction.LOGOUT,
      tableName: 'users',
      recordId: userId,
    });

    return { success: true };
  }

  async generateTokenPair(user: Partial<RequestUser>) {
    const payload: JwtPayload = {
      sub: user.id!,
      username: user.username!,
      communityId: user.communityId!,
      role: user.role!,
      status: user.status!,
    };

    const authConfig = this.configService.get('auth', { infer: true });

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: authConfig.jwtRefreshSecret,
        expiresIn: authConfig.jwtRefreshExpiresIn as any,
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, this.bcryptSaltRounds);
    
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access Denied');
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isRefreshTokenValid) {
      throw new ForbiddenException('Access Denied');
    }

    return this.generateTokenPair(user as any);
  }

  async firstLogin(dto: FirstLoginDto) {
    const user = await this.validateUser(dto.username, dto.currentPassword);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptSaltRounds);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        phone: dto.phone,
        email: dto.email,
        firstLoginCompleted: true,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        status: 'ACTIVE',
      },
    });

    return this.generateTokenPair(updatedUser);
  }

  async forgotPassword(phone: string) {
    const user = await this.prisma.user.findFirst({ where: { phone, deletedAt: null } });
    if (!user) {
      return { success: true, message: 'If the phone number exists, an OTP will be sent.' };
    }

    const otp = randomInt(100000, 1000000).toString(); // 6 digit OTP — crypto.randomInt is CSPRNG-backed
    const otpHash = await bcrypt.hash(otp, this.bcryptSaltRounds);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await this.prisma.passwordResetOtp.create({
      data: {
        communityId: user.communityId,
        phone: user.phone,
        otpHash,
        expiresAt,
      },
    });

    // TODO: Integrate SMS provider here
    // OTP value is intentionally NOT logged. Retrieve from DB (password_reset_otps) for local testing.
    this.logger.debug(`Password reset OTP created for phone ending ...${phone.slice(-4)}`);

    return { success: true, message: 'If the phone number exists, an OTP will be sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: {
        phone: dto.phone,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new ForbiddenException('Invalid or expired OTP');
    }

    const isMatch = await bcrypt.compare(dto.otp, otpRecord.otpHash);
    if (!isMatch) {
      throw new ForbiddenException('Invalid or expired OTP');
    }

    const user = await this.prisma.user.findFirst({ where: { phone: dto.phone, deletedAt: null } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptSaltRounds);

    await this.prisma.$transaction([
      this.prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      }),
    ]);

    return { success: true, message: 'Password has been reset successfully' };
  }
}
