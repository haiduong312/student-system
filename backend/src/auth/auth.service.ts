import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser, JwtPayload } from './interfaces/authenticated-user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const authUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
    };

    const tokens = await this.signTokens(authUser);

    await this.usersService.updateRefreshTokenHash(user.id, tokens.refreshToken);
    await this.usersService.markLastLogin(user.id);

    return {
      ...tokens,
      user: authUser,
    };
  }

  async logout(userId: string) {
    await this.usersService.clearRefreshTokenHash(userId);
    return { loggedOut: true };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user?.refreshTokenHash) {
      throw new ForbiddenException('Refresh token is not available');
    }

    const refreshTokenMatched = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!refreshTokenMatched) {
      await this.usersService.clearRefreshTokenHash(user.id);
      throw new ForbiddenException('Invalid refresh token');
    }

    const tokens = await this.signTokens({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
    });

    await this.usersService.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findProfileById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    const currentPasswordMatched = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatched) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.usersService.updatePassword(userId, dto.newPassword);
    return { passwordChanged: true };
  }

  async validateJwtPayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async signTokens(user: AuthenticatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessTokenExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    const refreshTokenExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
        expiresIn: accessTokenExpiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
        expiresIn: refreshTokenExpiresIn as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.toSeconds(accessTokenExpiresIn),
    };
  }

  private toSeconds(value: string): number {
    const match = value.match(/^(\d+)([smhd])?$/);
    if (!match) {
      return 900;
    }

    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 60 * 60 * 24,
    };

    return amount * multipliers[unit];
  }
}
