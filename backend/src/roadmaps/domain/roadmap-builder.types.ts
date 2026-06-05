import { RoadmapItemType } from '@prisma/client';

export interface MissingSkillForRoadmap {
  skillId: string;
  skillName: string;
  gap: number;
  priorityScore: number;
  learningOrder: number;
}

export interface RoadmapItemDraft {
  skillId: string;
  title: string;
  description: string;
  itemType: RoadmapItemType;
  orderIndex: number;
  weight: number;
}
