import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/authenticated-user.interface';

const refreshTokenExtractor = (request: Request): string | null => {
  if (request?.body?.refreshToken) {
    return request.body.refreshToken;
  }

  return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
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
