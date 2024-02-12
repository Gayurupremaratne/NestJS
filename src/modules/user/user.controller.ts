import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { CustomAuthRequest, JsonResponse } from '@common/types';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthGuard } from '../casl/authorization-guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileDto } from './dto/profile.dto';
import { QueryParamsDto } from './dto/query-params.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDelete } from './dto/user-delete.dto';
import { UserEmail, UserEmailDto } from './dto/user-email.dto';
import { UserIdentifierDto } from './dto/user-get-params.dto';
import { UserPermissionsDto } from './dto/user-permissions.dto';
import { UserRoleIdentifierDto } from './dto/user-role-get-params.dto';
import { UserDto } from './dto/user.dto';
import { UserQueuePublisher } from './queue/user-queue.publisher';
import { UserService } from './user.service';

@UseInterceptors(new ResponseInterceptor())
@Controller('users')
@ApiTags('Users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userPublisher: UserQueuePublisher,
  ) {}

  @Put('change-password')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async changePassword(
    @AuthenticatedUser() user,
    @Body() userData: ChangePasswordDto,
  ): Promise<JsonResponse<UserDto>> {
    return JsonResponseSerializer(await this.userService.changePassword(user.sub, userData));
  }

  @Get()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.USER })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllUsers(@Query() queryParams: QueryParamsDto): Promise<JsonResponse<UserDto>> {
    return JsonResponseSerializer(await this.userService.getAllUsers(queryParams));
  }

  // me endpoint - PT-111
  @Get('/me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async getMe(@AuthenticatedUser() user): Promise<JsonResponse<ProfileDto | null>> {
    const loggedInUserData: UserDto = await this.userService.getUser(user.sub);
    const userPermissions: UserPermissionsDto[] = await this.userService.getUserPermissions(
      loggedInUserData.role.id,
    );
    const notifications = await this.userService.getUserNotificationStatus(user.sub);

    const response: ProfileDto = {
      apiData: loggedInUserData,
      userPermissions: userPermissions,
      notificationStatus: notifications,
    };

    return JsonResponseSerializer(response);
  }

  @Get(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.USER })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getUser(@Param() reqParams: UserIdentifierDto): Promise<JsonResponse<UserDto | null>> {
    return JsonResponseSerializer(await this.userService.getUser(reqParams.id));
  }

  @Put()
  @ApiBearerAuth()
  async updateUser(
    @Req() request: CustomAuthRequest,
    @Body() userData: UpdateUserDto,
  ): Promise<JsonResponse<UserDto>> {
    let userId: string;
    const isValidUser = await this.userService.validateUpdateUserPermission(request.user.sub);
    const authUserData = await this.userService.getUser(request.user.sub);
    const checkPermissionToEditUserRoleByAdmin =
      await this.userService.checkPermissionToEditUserRoleByAdmin(
        authUserData.role.id,
        userData.role_id,
      );

    if (userData.id === request.user.sub) {
      if (typeof userData.role_id !== 'undefined' && userData.role_id !== authUserData.role.id) {
        throw new ForbiddenException('You are not allowed to edit the role');
      } else {
        userId = request.user.sub;
      }
    } else if (isValidUser) {
      if (checkPermissionToEditUserRoleByAdmin) {
        userId = userData.id;
      } else {
        throw new ForbiddenException('You are not allowed to edit the role');
      }
    } else {
      throw new ForbiddenException('You are not allowed to perform this action');
    }
    return JsonResponseSerializer(await this.userService.updateUser(userId, userData));
  }

  @Get('role/:id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.ROLE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getUsersByRoleId(
    @Param() reqParams: UserRoleIdentifierDto,
    @Query() queryParams: QueryParamsDto,
  ): Promise<JsonResponse<UserDto>> {
    return JsonResponseSerializer(
      await this.userService.getUsersByRoleId(reqParams.id, queryParams),
    );
  }

  @Post('email/wildcard')
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.USER })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getUserByEmail(@Body() data: UserEmailDto): Promise<JsonResponse<UserEmail[] | null>> {
    return JsonResponseSerializer(await this.userService.getUserByEmail(data.email));
  }

  @Delete()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async deleteUser(
    @Body() userData: UserDelete,
    @AuthenticatedUser() authUser,
  ): Promise<JsonResponse<UserDelete>> {
    const userDeleteData: UserDelete = { id: '' };
    const isValidUser = await this.userService.validateAdminUserDelete(authUser.sub);
    if (userData.id === authUser.sub) {
      userDeleteData.id = authUser.sub;
    } else if (isValidUser) {
      userDeleteData.id = userData.id;
    } else {
      throw new InternalServerErrorException('Failed to delete user');
    }
    return JsonResponseSerializer(await this.userPublisher.scheduleDeleteUser(userDeleteData));
  }
}
