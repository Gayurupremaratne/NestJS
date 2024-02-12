import * as Mustache from 'mustache';

import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

import { map, size } from 'lodash';

import { RequiredRule, CHECK_ABILITY } from '../../common/decorators/abilities.decorator';

import {
  subject,
  RawRuleOf,
  MongoAbility,
  ForcedSubject,
  ForbiddenError,
  createMongoAbility,
} from '@casl/ability';

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserDto } from '@user/dto/user.dto';
import { Request } from 'express';
import { RBAC_SUBJECTS_ARRAY } from '@common/constants';
import { Role } from '@prisma/client';

export const actions = ['read', 'manage', 'create', 'update', 'delete'] as const;

export const subjects = RBAC_SUBJECTS_ARRAY;

export type Abilities = [
  (typeof actions)[number],
  (typeof subjects)[number] | ForcedSubject<Exclude<(typeof subjects)[number], 'all'>>,
];

export type AppAbility = MongoAbility<Abilities>;

@Injectable()
export class AbilitiesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  createAbility = (rules: RawRuleOf<AppAbility>[]) => createMongoAbility<AppAbility>(rules);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const rules: any =
      this.reflector.get<RequiredRule[]>(CHECK_ABILITY, context.getHandler()) || [];
    const currentUser = context.switchToHttp().getRequest().user;

    let currentUserRole: Role;

    if (currentUser) {
      currentUserRole = await this.prisma.user
        .findUnique({ where: { id: currentUser.sub } })
        .role();
    } else {
      currentUserRole = await this.prisma.user
        .findUnique({ where: { email: request.body.email } })
        .role();
    }

    const userPermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: currentUserRole.id,
      },
      include: { permission: true },
    });

    const parsedUserPermissions = this.parseCondition(userPermissions, currentUser);

    try {
      const ability = this.createAbility(Object(parsedUserPermissions));

      for await (const rule of rules) {
        let sub = {};
        if (size(rule?.conditions)) {
          const subId = +request.params['id'];
          sub = await this.getSubjectById(subId, rule.subject);
        }

        ForbiddenError.from(ability)
          .setMessage('You are not allowed to perform this action')
          .throwUnlessCan(rule.action, subject(rule.subject, sub));
      }
      return true;
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  parseCondition(permissions: any, currentUser: UserDto) {
    const data = map(permissions, (permission) => {
      if (size(permission.conditions)) {
        const parsedVal = Mustache.render(permission?.permission.conditions['id'], currentUser);
        return {
          ...permission?.permission,
          conditions: { id: +parsedVal },
        };
      }
      return permission?.permission;
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
