import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { REFRESH_TOKEN_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginResponseDto, ProfileResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiForbiddenResponse({ description: 'User account is not active' })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(dto);
    this.setRefreshTokenCookie(response, session.refreshToken);
    return this.toCookieSessionResponse(session);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE_NAME)
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  @ApiForbiddenResponse({ description: 'Refresh token is revoked or inactive' })
  @Post('refresh')
  async refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.getRefreshTokenFromCookie(request);
    const session = await this.authService.refreshTokens(user.id, refreshToken);
    this.setRefreshTokenCookie(response, session.refreshToken);
    return this.toCookieSessionResponse(session);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ schema: { example: { loggedOut: true } } })
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.clearRefreshTokenCookie(response);
    return this.authService.logout(user.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: ProfileResponseDto })
  @Get('profile')
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: ProfileResponseDto })
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ schema: { example: { passwordChanged: true } } })
  @ApiBadRequestResponse({ description: 'New password is invalid or unchanged' })
  @ApiUnauthorizedResponse({ description: 'Current password is incorrect' })
  @Post('change-password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: this.getRefreshTokenMaxAge(),
    });
  }

  private clearRefreshTokenCookie(response: Response) {
    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  private getRefreshTokenFromCookie(request: Request) {
    const cookieHeader = request.headers.cookie;
    const refreshToken = cookieHeader
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`))
      ?.slice(REFRESH_TOKEN_COOKIE_NAME.length + 1);

    return refreshToken ? decodeURIComponent(refreshToken) : '';
  }

  private getRefreshTokenMaxAge() {
    const value = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const match = value.match(/^(\d+)([smhd])?$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;

    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
  }

  private toCookieSessionResponse<T extends { refreshToken: string }>(session: T) {
    const { refreshToken: _refreshToken, ...response } = session;
    return response;
  }
}
