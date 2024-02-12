import { JsonResponse } from '@common/types';

export const JsonResponseSerializer = <T>(data: T): JsonResponse<T> => {
  return {
    data,
  };
};
