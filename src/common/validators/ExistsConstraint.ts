import { PrismaService } from '../../prisma/prisma.service';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';

const existsHandler = (valid: boolean): boolean => {
  return valid;
};

@ValidatorConstraint({ name: 'Exists', async: true })
@Injectable()
export class ExistsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}
  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [model, property = 'id', handler] = args.constraints;
    if (!value || !model) return handler(false);
    try {
      if (Array.isArray(value)) {
        const records = await Promise.all(
          value.map((val) =>
            this.prisma[model as string].findUnique({
              where: {
                [property]: val,
              },
            }),
          ),
        );
        return handler(records.every((record) => record !== null));
      } else {
        const record = await this.prisma[model as string].findUnique({
          where: {
            [property]: value,
          },
        });

        return handler(record !== null);
      }
    } catch (exception) {
      return handler(false);
    }
  }
  defaultMessage(args: ValidationArguments) {
    return `${args.property} entered is not valid`;
  }
}

export function Exists(
  model: string,
  property: string,
  handler: typeof existsHandler = existsHandler,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [model, property, handler],
      validator: ExistsConstraint,
    });
  };
}
