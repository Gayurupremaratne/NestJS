import * as Mustache from 'mustache';

import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

import { map, size } from 'lodash';

import { RawRuleOf, MongoAbility, ForcedSubject, createMongoAbility } from '@casl/ability';

import { Injectable, CanActivate, NotFoundException } from '@nestjs/common';
import { UserDto } from '@user/dto/user.dto';
import { RBAC_SUBJECTS_ARRAY } from '@common/constants';

export const actions = ['read', 'manage', 'create', 'update', 'delete'] as const;

export const subjects = RBAC_SUBJECTS_ARRAY;

export type Abilities = [
  (typeof actions)[number],
  (typeof subjects)[number] | ForcedSubject<Exclude<(typeof subjects)[number], 'all'>>,
];

export type AppAbility = MongoAbility<Abilities>;

@Injectable()
export class MockAbilitiesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  createAbility = (rules: RawRuleOf<AppAbility>[]) => createMongoAbility<AppAbility>(rules);

  async canActivate(): Promise<boolean> {
    return true;
  }

  parseCondition(permissions: any, currentUser: UserDto) {
    const data = map(permissions, (permission) => {
      if (size(permission.conditions)) {
        const parsedVal = Mustache.render(permission.conditions['id'], currentUser);
        return {
          ...permission,
          conditions: { id: +parsedVal },
        };
      }
      return permission;
    });
    return data;
  }

  async getSubjectById(id: number, subName: string) {
    const subject = await this.prisma[subName].findUnique({
      where: {
        id,
      },
    });
    if (!subject) throw new NotFoundException(`${subName} not found`);
    return subject;
  }
}
