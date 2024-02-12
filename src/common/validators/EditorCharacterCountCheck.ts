import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';

interface EditorNode {
  time: number;
  blocks: [{ id: string; type: string; data: { text: string; level: string } }];
  version: string;
}

@ValidatorConstraint({ name: 'IsCharacterCount', async: false })
export class CharacterCountValidator implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const [max] = args.constraints;

    const content: EditorNode = JSON.parse(value);
    const totalLength = content.blocks.reduce((sum, block) => sum + block?.data?.text?.length, 0);

    return totalLength <= max;
  }

  defaultMessage(args: ValidationArguments) {
    const [max] = args.constraints;
    return `Content cannot have more than ${max} characters`;
  }
}

export function IsCharacterCount(max: number) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `Content cannot have more than ${max} characters.`,
      },
      constraints: [max],
      validator: CharacterCountValidator,
    });
  };
}
