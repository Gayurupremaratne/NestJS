import * as crypto from 'crypto';

export default function generateOTPAsync(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate a random 4-digit number between 1000 and 9999 (inclusive)
    const min = 1000;
    const max = 9999;
    crypto.randomInt(min, max + 1, (err, otp) => {
      if (err) {
        reject(err);
      } else {
        resolve(otp.toString());
      }
    });
  });
}
