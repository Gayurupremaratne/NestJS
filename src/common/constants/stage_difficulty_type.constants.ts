/**
 * Stage difficulty enum for stages
 */
export const STAGE_DIFFICULTY_TYPES = ['BEGINNER', 'MODERATE', 'ADVANCED'] as const;

export type StageDifficultyTypes = (typeof STAGE_DIFFICULTY_TYPES)[number];

export const STAGE_DIFFICULTY_TYPE_CODE: { [key in StageDifficultyTypes]: number } = {
  BEGINNER: 0,
  MODERATE: 1,
  ADVANCED: 2,
};
