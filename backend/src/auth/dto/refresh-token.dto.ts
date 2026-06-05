import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token returned by login or refresh endpoint' })
  @IsString()
  @IsJWT()
  refreshToken: string;
}
