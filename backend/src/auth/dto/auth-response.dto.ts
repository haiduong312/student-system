import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ required: false, nullable: true })
  lastLoginAt?: Date | null;
}

export class TokenPairDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({ example: 900 })
  expiresIn: number;
}

export class LoginResponseDto extends TokenPairDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class ProfileResponseDto extends AuthUserDto {
  @ApiProperty({ required: false, nullable: true })
  student?: unknown;

  @ApiProperty({ required: false, nullable: true })
  lecturer?: unknown;
}
