import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  Res,
  Req,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthUserDto } from './dto/auth-user';
import { RefreshTokenDto, RefreshTokenRequest } from './dto/refresh-token';
import { AuthSocialLogin } from './dto/auth-social-login.dto';
import { JsonResponseSerializer } from '@common/serializers';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { AuthenticatedUser, Public } from 'nest-keycloak-connect';
import { RequestHeaders } from '@common/decorators/RequestHeadersDecorator';
import { PLATFORM, RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { Response, Request } from 'express';
import { RefreshTokenResponseDto } from '../keycloak/dto/keycloak.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { CustomAuthRequest, JsonResponse } from '@common/types';
import { VerifyEmailDto } from './dto/email-otp.dto';
import { EmergencyContactDto } from './dto/emergency-contact.dto';
import { HeaderValidationPipe } from '@common/pipes/header-validation.pipe';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { CreateAccountAdminDto } from './dto/create-account-admin.dto';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';

/**
 * Auth controller
 * @description This controller is used to handle auth requests
 */
@UseInterceptors(new ResponseInterceptor())
@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @Throttle({ default: { ttl: seconds(1), limit: 2 } })
  @Public()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.MANAGE, subject: RBAC_SUBJECTS.ADMIN_PORTAL })
  @ApiHeader({
    name: 'Platform',
    description: 'Valid Values: WEB/MOBILE',
  })
  @UsePipes(HeaderValidationPipe)
  async login(
    @RequestHeaders() { headers },
    @Body() reqBody: AuthUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(reqBody);
    if (headers?.platform === PLATFORM.web) {
      response.cookie('refresh_token', result.keycloakTokens.refresh_token, {
        expires: new Date(Date.now() + result.keycloakTokens.refresh_expires_in * 1000),
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/v1/refresh-token',
      });
      delete result.keycloakTokens.refresh_token;
    }
    return JsonResponseSerializer(result);
  }

  @Post('/refresh-token')
  @Public()
  @ApiHeader({
    name: 'Platform',
    description: 'Valid Values: WEB/MOBILE',
  })
  @UsePipes(HeaderValidationPipe)
  async refreshToken(
    @RequestHeaders() { headers },
    @Body() reqBody: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    let refresh_token: RefreshTokenRequest;
    let result: RefreshTokenResponseDto;

    //gets the refresh token from the cookie if the request is from web
    //otherwise gets the refresh token from the request body

    if (headers?.platform === PLATFORM.web) {
      refresh_token = request.cookies;
      result = await this.authService.getRefreshTokens(refresh_token);
      response.cookie('refresh_token', result.refresh_token, {
        expires: new Date(Date.now() + result.refresh_expires_in * 1000),
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/v1/refresh-token',
      });
      delete result.refresh_token;
    } else if (headers?.platform == PLATFORM.mobile) {
      result = await this.authService.getRefreshTokens(reqBody);
    }
    return JsonResponseSerializer(result);
  }

  @Post('/social-login')
  @Throttle({ default: { ttl: seconds(1), limit: 2 } })
  @Public()
  async socialLogin(@Body() reqBody: AuthSocialLogin) {
    const result = await this.authService.socialLogin(reqBody);

    return JsonResponseSerializer(result);
  }

  @Post('/create-account')
  @Public()
  @ApiHeader({
    name: 'Platform',
    description: 'Valid Values: WEB/MOBILE',
  })
  @UsePipes(HeaderValidationPipe)
  async createAccount(
    @RequestHeaders() { headers },
    @Body() data: CreateAccountDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.createAccount(data);
    if (headers?.platform == PLATFORM.web) {
      response.cookie('refresh_token', result.keycloakTokens.refresh_token, {
        expires: new Date(Date.now() + result.keycloakTokens.refresh_expires_in * 1000),
        sameSite: 'strict',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      delete result.keycloakTokens.refresh_token;
    }
    return JsonResponseSerializer(result);
  }

  @Post('/send-otp')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.AUTH })
  @UseGuards(AbilitiesGuard)
  async sendOtp(@Req() request: CustomAuthRequest) {
    const result = await this.authService.sendOtp(request.user.sub);
    return JsonResponseSerializer(result);
  }

  @Post('/verify-email')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.AUTH })
  @UseGuards(AbilitiesGuard)
  async verifyEmail(@Req() request: CustomAuthRequest, @Body() { code }: VerifyEmailDto) {
    const result = await this.authService.verifyOtp(code, request.user.sub);
    return JsonResponseSerializer(result);
  }

  @Post('/emergency-contact')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.AUTH })
  @UseGuards(AbilitiesGuard)
  async emergencyContact(@Req() request: CustomAuthRequest, @Body() data: EmergencyContactDto) {
    const result = await this.authService.emergencyContact(data, request.user.sub);
    return JsonResponseSerializer(result);
  }

  @Post('/user-consent')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.AUTH })
  @UseGuards(AbilitiesGuard)
  async userConsent(@Req() request: CustomAuthRequest) {
    const result = await this.authService.userConsent(request.user.sub);
    return JsonResponseSerializer(result);
  }

  @Post('/create-user-admin')
  @ApiBearerAuth()
  @checkAbilities(
    { action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.AUTH },
    { action: RBAC_ACTIONS.MANAGE, subject: RBAC_SUBJECTS.ALL },
  )
  @UseGuards(AbilitiesGuard)
  async createUserAdmin(@Body() data: CreateAccountAdminDto) {
    const result = await this.authService.createUserAdmin(data);
    return JsonResponseSerializer(result);
  }

  @Post('/logout')
  @ApiBearerAuth()
  async logout(@AuthenticatedUser() user): Promise<JsonResponse<boolean>> {
    const result = await this.authService.logout(user.sub);
    return JsonResponseSerializer(result);
  }
}
