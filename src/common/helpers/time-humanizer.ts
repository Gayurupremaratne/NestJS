import moment from 'moment';

export const millisecondsToHumanReadableTime = (
  emailOtpSentAt: Date,
  codeExpirationPeriod: string,
) => {
  const timeLeftInMilliseconds =
    new Date(emailOtpSentAt).getTime() + +codeExpirationPeriod * 1000 - Date.now();

  return moment.duration(timeLeftInMilliseconds, 'milliseconds').humanize();
};
