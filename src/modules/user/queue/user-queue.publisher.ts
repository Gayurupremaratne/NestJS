import { QUEUES, QUEUE_ATTEMPT_COUNT } from '@common/constants';
import { BackoffOpts as QueueBackoffOpts } from '@common/types/queue-config.types';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Sentry from '@sentry/node';
import { UserDelete } from '@user/dto/user-delete.dto';
import { UserRepository } from '@user/user.repository';
import { Queue } from 'bull';
import { OrderService } from '../../order/order.service';

@Injectable()
export class UserQueuePublisher {
  constructor(
    @InjectQueue(QUEUES.USER_DELETE) private readonly userDeleteQueue: Queue,
    private readonly userRepository: UserRepository,
    private readonly orderService: OrderService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'user-delete' })
  async cronJobUserDeletion(): Promise<UserDelete[]> {
    try {
      Sentry.captureMessage(
        'User deletion cron job started at ' + new Date().toISOString(),
        'info',
      );
      const usersToBeDeleted = await this.userRepository.getUsersForDeletion();
      //publish users to delete queue
      return await this.pushUsersToDeleteQueue(usersToBeDeleted);
    } catch (error) {
      Sentry.captureException(error);
    }
  }

  public async pushUsersToDeleteQueue(usersToBeDeleted: UserDelete[]): Promise<UserDelete[]> {
    const queueBackOffOpts: QueueBackoffOpts = {
      type: 'exponential',
      delay: 5000,
    };
    const usersPushedToDeleteQueue: UserDelete[] = [];

    for (const userData of usersToBeDeleted) {
      await this.userDeleteQueue.add(userData, {
        removeOnComplete: true,
        attempts: QUEUE_ATTEMPT_COUNT,
        backoff: queueBackOffOpts,
      });
      usersPushedToDeleteQueue.push(userData);
    }

    return usersPushedToDeleteQueue;
  }

  async scheduleDeleteUser(userData: UserDelete): Promise<UserDelete> {
    const userId = userData.id;
    try {
      await this.orderService.cancelOrdersByUserId(userId);
      await this.userRepository.scheduleUserForDeletion(userId);

      return userData;
    } catch (error) {
      Sentry.captureException(error);
      throw new InternalServerErrorException('Failed to schedule delete user');
    }
  }
}
