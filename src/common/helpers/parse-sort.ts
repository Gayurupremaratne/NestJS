import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Parses a sorting parameter and generates an order-by object based on the provided column name.
 *
 * @param {string} sort - The sorting parameter. It can be in the format 'columnName' for ascending order,
 *                        '-columnName' for descending order, or 'nestedModel,nestedColumn' for sorting
 *                        by a nested model's column in ascending order, or '-nestedModel,nestedColumn'
 *                       for sorting by a nested model's column in descending order.
 * @param {Prisma.ModelName} model - The Prisma model name for which the sorting is applied.
 * @returns {(Record<string, 'asc' | 'desc'> | { [key: string]: { [key: string]: string; } })} An order-by object specifying the column and sorting direction.
 * Returns an empty object if the sort parameter is invalid or the column does not exist.
 */

export function parseSortOrder(
  sort: string,
  model: Prisma.ModelName,
):
  | { [key: string]: 'asc' | 'desc' }
  | {
      [key: string]: {
        [key: string]: string;
      };
    } {
  const prisma = new PrismaClient();

  if (!sort && Object.keys(prisma[model].fields).includes('createdAt')) {
    return { createdAt: 'desc' };
  }

  const isDescending = sort.startsWith('-');
  const column = isDescending ? sort.slice(1) : sort;
  const order = isDescending ? 'desc' : 'asc';

  // Check if the sort parameter contains a comma (e.g., "role,name").
  // if so, we assume that the sorting is applied to a nested model.
  const dotIndex = column.indexOf(',');
  if (dotIndex !== -1) {
    const nestedModelName = column.substring(0, dotIndex).toLowerCase();
    const nestedColumnName = column.substring(dotIndex + 1);

    if (Object.keys(prisma).includes(nestedModelName) && nestedModelName !== model.toLowerCase()) {
      if (Object.keys(prisma[nestedModelName].fields).includes(nestedColumnName)) {
        return {
          [nestedModelName]: {
            [nestedColumnName]: order,
          },
        };
      }
    }
  }

  if (Object.keys(prisma[model].fields).includes(column)) {
    return { [column]: order };
  }

  return {};
}
