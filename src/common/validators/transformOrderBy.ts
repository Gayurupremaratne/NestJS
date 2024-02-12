import { UnprocessableEntityException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { plainToClass } from 'class-transformer';
import { IsString } from 'class-validator';

export class OrderByItem {
  @IsString()
  field: string;

  @IsString()
  sortBy: string;
}

export function TransformValidateOrderBy(acceptedFields: string[]) {
  return Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() !== '') {
      const sortFields = value.split(',');

      return sortFields.map((field) => {
        const sortOrder = field.startsWith('-') ? 'desc' : 'asc';
        const fieldName = field.replace('-', '').trim();

        if (fieldName && acceptedFields.includes(fieldName)) {
          const data = {
            field: fieldName,
            sortBy: sortOrder,
          };
          return plainToClass(OrderByItem, data);
        } else {
          throw new UnprocessableEntityException(`${fieldName} is not valid`);
        }
      });
    }
    return value;
  });
}
