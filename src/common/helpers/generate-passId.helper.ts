import moment from 'moment';

export const generatePassId = (stageNumber: number, reservedDate: Date, randomNumber: number) => {
  return `${moment(reservedDate).format('YYYYMMDD')}-S${stageNumber}-${randomNumber}`;
};
