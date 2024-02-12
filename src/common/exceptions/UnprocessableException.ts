import { UnprocessableEntityException } from '@nestjs/common';

const extractErrorMessage = (errors) => {
  let errorMesssage = 'Something went wrong';
  if (errors && errors.length > 0) {
    if (errors[0].children && errors[0].children.length > 0) {
      return extractErrorMessage(errors[0].children);
    }
    errorMesssage = errors[0].constraints[Object.keys(errors[0].constraints)[0]];
  }
  return errorMesssage;
};

export const UnprocessableException = (errors) => {
  const message = extractErrorMessage(errors);
  return new UnprocessableEntityException({
    statusCode: 422,
    error: 'Unprocessable Entity',
    message,
  });
};
