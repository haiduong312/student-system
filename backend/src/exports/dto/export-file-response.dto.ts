import { ApiProperty } from '@nestjs/swagger';
import { ExportType } from '@prisma/client';

export class ExportFileResponseDto {
  @ApiProperty()
  fileUrl: string;

  @ApiProperty({ enum: ExportType })
  exportType: ExportType;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
