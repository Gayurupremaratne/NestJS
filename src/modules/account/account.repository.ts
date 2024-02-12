import { USER_DELETE_TOKEN_EXPIRATION_IN_MINUTES } from '@common/constants';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserDeleteRequest } from '@prisma/client';
import * as Sentry from '@sentry/node';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { DeleteAccountRequest } from './dto/delete-account-request.dto';

@Injectable()
export class AccountRepository {
  constructor(private prisma: PrismaService) {}

  async getUserDeleteRequest(userId: string, token: string): Promise<UserDeleteRequest> {
    try {
      return await this.prisma.userDeleteRequest.findUnique({
        where: { userId_token: { userId, token } },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'account' }, level: 'error' });
      throw new BadRequestException('Invalid token');
    }
  }

  async createUserDeleteRequest(data: DeleteAccountRequest): Promise<UserDeleteRequest> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email: data.email } });
      const expiredAt = moment()
        .add(USER_DELETE_TOKEN_EXPIRATION_IN_MINUTES, 'minutes')
        .toISOString();
      const token = uuidv4();
      const deleteRequest = await this.prisma.userDeleteRequest.create({
        data: { userId: user.id, token, expiredAt },
      });

      return deleteRequest;
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'account' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }
}
