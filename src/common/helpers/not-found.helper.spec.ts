import * as Helpers from './index';
import { NotFoundException } from '@nestjs/common';

describe('NotFoundHelper', () => {
  it('should be defined', () => {
    expect(Helpers.NotFoundHelper).toBeDefined();
  });
  it('returns true if parameter is true', () => {
    expect(Helpers.NotFoundHelper(true)).toEqual(true);
  });
  it('throws NotFoundException if parameter is false', () => {
    expect(() => {
      Helpers.NotFoundHelper(false);
    }).toThrow(NotFoundException);
  });
});
