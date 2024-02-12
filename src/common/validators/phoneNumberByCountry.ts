import {
  ValidationOptions,
  registerDecorator,
  ValidationArguments,
  buildMessage,
  isPhoneNumber,
} from 'class-validator';

export function IsPhoneNumberForCountry(property: string, validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumberForCountry',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // the property name that holds the country code
          const [countryCodeField] = args.constraints;

          // the value of the country code on the target object
          const countryCodeFieldCode = (args.object as any)[countryCodeField];

          // validate phone number for specified country
          return isPhoneNumber(countryCodeFieldCode.concat(value), countryCodeFieldCode);
        },
        // specify custom error message
        defaultMessage: buildMessage(
          () => `$property must be a valid contact number in the specified country`,
          validationOptions,
        ),
      },
    });
  };
}
