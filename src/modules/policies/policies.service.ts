import { PolicyDto } from '@policies/dto/policy.dto';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UpdatePolicyDto } from '@policies/dto/update-policy.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@prisma-orm/prisma.service';
import { plainToClass } from 'class-transformer';
import { validate } from 'uuid';
import * as Sentry from '@sentry/node';

@Injectable()
export class PoliciesService {
  constructor(private prismaService: PrismaService) {}

  async create(createPolicyDto: Prisma.PolicyCreateInput) {
    try {
      return await this.prismaService.policy.create({
        data: createPolicyDto,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'policies' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  async findAll() {
    return await this.prismaService.policy.findMany({
      where: {
        parentPolicyId: null,
      },
      include: {
        policyTranslations: true,
        childPolicies: {
          orderBy: {
            order: 'asc',
          },
          include: {
            policyTranslations: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOne(idOrSlug: string): Promise<PolicyDto | null> {
    const isId = validate(idOrSlug);

    const record = await this.prismaService.policy.findFirst({
      where: isId
        ? {
            id: idOrSlug,
          }
        : { slug: idOrSlug },
      include: {
        policyTranslations: true,
        parentPolicy: true,
        childPolicies: {
          orderBy: {
            order: 'asc',
          },
          include: {
            policyTranslations: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException();
    }

    return plainToClass(PolicyDto, record);
  }

  async update(id: string, updatePolicyDto: UpdatePolicyDto) {
    // Every time you update the policy, the acceptances must be cleared.
    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const policy = await transaction.policy.update({
          where: {
            id,
          },
          data: updatePolicyDto,
        });

        await transaction.policyAcceptances.deleteMany({
          where: {
            policyId: policy.id,
          },
        });

        return policy;
      });
    } catch (exception) {
      Sentry.captureException(exception, { tags: { module: 'policies' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  async remove(id: string) {
    await this.prismaService.policy.delete({
      where: {
        id: id,
      },
    });
  }

  async nextOrder(parentId?: string) {
    const data = await this.prismaService.policy.aggregate({
      where: {
        parentPolicyId: parentId,
      },
      _max: {
        order: true,
      },
    });

    return data._max.order + 1 || 0;
  }
}
