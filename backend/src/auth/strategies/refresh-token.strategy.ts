import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { REFRESH_TOKEN_COOKIE_NAME } from '../auth.constants';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/authenticated-user.interface';

const getCookieValue = (request: Request, name: string): string | null => {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));
  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
};

const refreshTokenExtractor = (request: Request): string | null => {
  return getCookieValue(request, REFRESH_TOKEN_COOKIE_NAME);
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: refreshTokenExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      passReqToCallback: false,
    });
  }

  validate(payload: JwtPayload) {
    return this.authService.validateJwtPayload(payload);
  }
}
