import { Injectable } from '@nestjs/common';
import { RoadmapItemType } from '@prisma/client';
import { MissingSkillForRoadmap, RoadmapItemDraft } from './roadmap-builder.types';

@Injectable()
export class RoadmapBuilderService {
  buildItems(missingSkills: MissingSkillForRoadmap[]): RoadmapItemDraft[] {
    return missingSkills
      .slice()
      .sort((a, b) => {
        if (a.learningOrder !== b.learningOrder) {
          return a.learningOrder - b.learningOrder;
        }

        return b.priorityScore - a.priorityScore;
      })
      .map((skill, index) => ({
        skillId: skill.skillId,
        title: `Improve ${skill.skillName}`,
        description: `Close a ${skill.gap}-level gap in ${skill.skillName}. Priority score: ${skill.priorityScore}.`,
        itemType: this.resolveItemType(skill.gap),
        orderIndex: index + 1,
        weight: Math.max(skill.priorityScore, 1),
      }));
  }

  private resolveItemType(gap: number) {
    if (gap >= 2) {
      return RoadmapItemType.LEARN;
    }

    return RoadmapItemType.PRACTICE;
  }
}
