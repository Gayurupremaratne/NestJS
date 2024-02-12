import { Duration } from '../types';

//returns a duration in minutes for the given hours and minutes
export function hoursAndMinutesToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

//returns a duration in hours and minutes for the given minutes
export function minutesToHoursAndMinutes(minutes: number): Duration {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return { hours, minutes: remainingMinutes };
}
