import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isTimeWithoutDate', async: false })
class IsTimeWithoutDateConstraint implements ValidatorConstraintInterface {
  validate(time: string) {
    // Regular expression to match time in format hh:mm:ss
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
    return timeRegex.test(time);
  }
}

export function IsTimeWithoutDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        ...validationOptions,
        message: 'Invalid time format. Use hh:mm:ss',
      },
      constraints: [],
      validator: IsTimeWithoutDateConstraint,
    });
  };
}
