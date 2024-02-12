import {
  ValidationOptions,
  registerDecorator,
  ValidationArguments,
  buildMessage,
  isPassportNumber,
} from 'class-validator';

export function IsPassportNumberForCountry(
  property: string,
  validationOptions?: ValidationOptions,
) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPassportNumberForCountry',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // the property name that holds the country code
          const [nationalityCodeField] = args.constraints;

          // the value of the country code on the target object
          const nationalityCode = (args.object as any)[nationalityCodeField];

          // validate phone number for specified country
          return isPassportNumber(value, nationalityCode);
        },
        // specify custom error message
        defaultMessage: buildMessage(
          () => `$property must be a valid passport number in the specified country`,
          validationOptions,
        ),
      },
    });
  };
}
