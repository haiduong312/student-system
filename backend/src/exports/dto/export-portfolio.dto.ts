import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const PORTFOLIO_SECTIONS = [
  'profile',
  'skills',
  'evidences',
  'analysis',
  'recommendations',
  'roadmap',
] as const;

export type PortfolioSection = (typeof PORTFOLIO_SECTIONS)[number];

export class ExportPortfolioDto {
  @ApiPropertyOptional({
    description: 'Student id. Lecturer and admin exports require this field.',
  })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({
    enum: PORTFOLIO_SECTIONS,
    isArray: true,
    default: PORTFOLIO_SECTIONS,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(PORTFOLIO_SECTIONS, { each: true })
  sections?: PortfolioSection[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'boolean' },
    description:
      'Set email, phone, dateOfBirth, externalLinks, or evidenceLinks to false to hide them',
  })
  @IsOptional()
  @IsObject()
  privacy?: Record<string, boolean>;
}
