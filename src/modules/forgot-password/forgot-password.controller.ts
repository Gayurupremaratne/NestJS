import { ForgotPasswordService } from './forgot-password.service';
import { JsonResponseSerializer } from '@common/serializers';
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { Public } from 'nest-keycloak-connect';
import { ForgotPasswordDto, RecoverCodeDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { ApiTags } from '@nestjs/swagger';

@UseInterceptors(new ResponseInterceptor())
@Controller()
@ApiTags('Forgot Password')
export class ForgotPasswordController {
  constructor(private readonly authService: ForgotPasswordService) {}

  @Post('/forgot-password')
  @Public()
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(data.email);
    return JsonResponseSerializer(result);
  }

  @Post('/recovery-code')
  @Public()
  async recoveryCode(@Body() data: RecoverCodeDto) {
    const result = await this.authService.verifyRecoveryCode(data);
    return JsonResponseSerializer(result);
  }

  @Post('/reset-password')
  @Public()
  async resetPassword(@Body() data: ResetPasswordDto) {
    const result = await this.authService.resetPassword(data);
    return JsonResponseSerializer(result);
  }
}
