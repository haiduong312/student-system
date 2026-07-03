import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportType } from '@prisma/client';

export class ExportHistoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ExportType })
  exportType: ExportType;

  @ApiPropertyOptional({ nullable: true })
  fileUrl: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Returned only when an admin views all export logs',
  })
  userId?: string | null;
}

export class ExportHistoryPaginationMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPreviousPage: boolean;
}

export class ExportHistoryResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ type: [ExportHistoryItemDto] })
  data: ExportHistoryItemDto[];

  @ApiProperty({ type: ExportHistoryPaginationMetaDto })
  meta: ExportHistoryPaginationMetaDto;
}
