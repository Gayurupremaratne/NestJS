import {
  USER_DELETION_REQUEST_RATE_THROTTLER_LIMIT,
  USER_DELETION_REQUEST_RATE_THROTTLER_TTL,
} from '@common/constants';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import { Public } from 'nest-keycloak-connect';
import { AccountService } from './account.service';
import { DeleteAccountConfirm } from './dto/delete-account-confirm.dto';
import { DeleteAccountRequest } from './dto/delete-account-request.dto';

@UseInterceptors(new ResponseInterceptor())
@Controller('account-deletion')
@ApiTags('Account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Public()
  @Post('request')
  @Throttle({
    default: {
      limit: USER_DELETION_REQUEST_RATE_THROTTLER_LIMIT,
      ttl: seconds(USER_DELETION_REQUEST_RATE_THROTTLER_TTL),
    },
  })
  async accountDeleteRequest(@Body() data: DeleteAccountRequest) {
    return JsonResponseSerializer(await this.accountService.deleteAccountRequest(data));
  }

  @Public()
  @Post('confirm')
  @Throttle({
    default: {
      limit: USER_DELETION_REQUEST_RATE_THROTTLER_LIMIT,
      ttl: seconds(USER_DELETION_REQUEST_RATE_THROTTLER_TTL),
    },
  })
  async accountDeleteConfirm(@Body() data: DeleteAccountConfirm) {
    return JsonResponseSerializer(await this.accountService.deleteAccountConfirm(data));
  }
}
