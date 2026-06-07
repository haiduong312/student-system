import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RoadmapItemStatus,
  RoadmapItemType,
  RoadmapPhase,
  RoadmapStatus,
} from '@prisma/client';

export class RoadmapItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  skillId: string | null;

  @ApiPropertyOptional({ nullable: true })
  skillName: string | null;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: RoadmapItemType })
  itemType: RoadmapItemType;

  @ApiProperty()
  weight: number;

  @ApiProperty({ enum: RoadmapItemStatus })
  status: RoadmapItemStatus;

  @ApiPropertyOptional({ nullable: true })
  deadline: Date | null;
}

export class RoadmapPhaseResponseDto {
  @ApiProperty({ enum: RoadmapPhase })
  phase: RoadmapPhase;

  @ApiProperty({ type: [RoadmapItemResponseDto] })
  items: RoadmapItemResponseDto[];
}

export class RoadmapResponseDto {
  @ApiProperty()
  roadmapId: string;

  @ApiProperty()
  version: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  careerGoal: string;

  @ApiPropertyOptional({ nullable: true })
  specialization: string | null;

  @ApiProperty()
  progressPercent: number;

  @ApiProperty({ enum: RoadmapStatus })
  status: RoadmapStatus;

  @ApiProperty({ type: [RoadmapPhaseResponseDto] })
  phases: RoadmapPhaseResponseDto[];
}

export class RoadmapHistoryItemDto {
  @ApiProperty()
  roadmapId: string;

  @ApiProperty()
  version: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  progressPercent: number;

  @ApiProperty({ enum: RoadmapStatus })
  status: RoadmapStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
