import { randomBytes } from 'crypto';

export default function generateRandomString(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const randomBytesBuffer = randomBytes(Math.ceil(8 / 2));
      const randomString = randomBytesBuffer.toString('hex').slice(0, 8);
      resolve(randomString);
    } catch (error) {
      reject(error);
    }
  });
}
