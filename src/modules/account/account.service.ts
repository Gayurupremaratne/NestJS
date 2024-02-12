import { CONFIG_NAMESPACES, EMAIL_TEMPLATES, MAIL_FROM, QUEUES } from '@common/constants';
import { IAppConfig } from '@common/types';
import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserDeleteRequest } from '@prisma/client';
import { UserDto } from '@user/dto/user.dto';
import { UserQueuePublisher } from '@user/queue/user-queue.publisher';
import { UserService } from '@user/user.service';
import { Queue } from 'bull';
import { plainToClass } from 'class-transformer';
import moment from 'moment';
import { AccountRepository } from './account.repository';
import { DeleteAccountConfirm } from './dto/delete-account-confirm.dto';
import { DeleteAccountRequest } from './dto/delete-account-request.dto';
import { DeleteAccountResponse } from './dto/delete-account-response.dto';

@Injectable()
export class AccountService {
  constructor(
    private accountRepository: AccountRepository,
    @InjectQueue(QUEUES.MAIL) private readonly sendEmailQueueAccount: Queue,
    private configService: ConfigService,
    private userService: UserService,
    private readonly userPublisher: UserQueuePublisher,
  ) {}

  async deleteAccountRequest(data: DeleteAccountRequest) {
    const userDeleteResponse = await this.accountRepository.createUserDeleteRequest(data);
    const user = await this.userService.getUser(userDeleteResponse.userId);
    await this.sendAccountDeleteMail(user, userDeleteResponse);
    return plainToClass(
      DeleteAccountResponse,
      await this.accountRepository.createUserDeleteRequest(data),
    );
  }

  async deleteAccountConfirm(data: DeleteAccountConfirm) {
    const userDeleteRequest = await this.accountRepository.getUserDeleteRequest(
      data.userId,
      data.token,
    );
    if (this.isTokenExpired(userDeleteRequest.expiredAt)) {
      throw new BadRequestException('Token expired');
    }
    await this.userPublisher.scheduleDeleteUser({ id: data.userId });
    return data;
  }

  private isTokenExpired(expiredAt: Date) {
    return moment().isAfter(expiredAt);
  }

  async sendAccountDeleteMail(user: UserDto, deleteRequest: UserDeleteRequest) {
    const mailOptions = {
      to: user.email,
      subject: `${MAIL_FROM} - Account delete confirmation`,
    };

    const deleteUrl = `${this.configService.get<IAppConfig['ADMIN_URL']>(
      'ADMIN_URL',
    )}/delete-account/confirmation/${user.id}/token/${deleteRequest.token}`;

    const templateVars = {
      user_firstName: user.firstName,
      user_lastName: user.lastName,
      user_email: user.email,
      delete_url: deleteUrl,
      cdn_url: this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP)['CDN_URL'],
    };

    await this.sendEmailQueueAccount.add(
      {
        mailOptions,
        templateName: EMAIL_TEMPLATES.ACCOUNT_DELETION,
        templateVars,
      },
      { attempts: 20, backoff: 900000 },
    );
  }
}
