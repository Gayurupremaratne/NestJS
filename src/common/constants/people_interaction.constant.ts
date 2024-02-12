/**
 * People interaction enum for stages
 */
export const PEOPLE_INTERACTIONS = ['LOW', 'HIGH'] as const;

export type PeopleInteractions = (typeof PEOPLE_INTERACTIONS)[number];

export const PEOPLE_INTERACTIONS_CODE: { [key in PeopleInteractions]: number } = {
  LOW: 0,
  HIGH: 1,
};
