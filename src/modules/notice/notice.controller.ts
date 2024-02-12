import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { NoticeService } from './notice.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { RBAC_ACTIONS, RBAC_SUBJECTS } from '@common/constants';
import { checkAbilities } from '@common/decorators/abilities.decorator';
import { ResponseInterceptor } from '@common/interceptors/response.interceptor';
import { JsonResponseSerializer } from '@common/serializers';
import { JsonResponse } from '@common/types';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Notice } from '@prisma/client';
import { AuthenticatedUser } from 'nest-keycloak-connect';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { AbilitiesGuard } from '../casl/abilities.guard';
import { AuthGuard } from '../casl/authorization-guard';
import { GetNoticePaginationDto } from './dto/get-notice.dto';
import { NoticeIdentifierDto, NoticeStageIdentifierDto } from './dto/notice-identifier.dto';

@Controller('notices')
@ApiTags('Notice')
@UseInterceptors(new ResponseInterceptor())
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Post()
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.CREATE, subject: RBAC_SUBJECTS.NOTICE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  @ApiHeader({
    name: 'Platform',
    description: 'If the platform header is MOBILE',
  })
  async createNotice(
    @AuthenticatedUser() user,
    @Body() createNoticeData: CreateNoticeDto,
  ): Promise<JsonResponse<Notice | Notice[]>> {
    return JsonResponseSerializer(
      await this.noticeService.createNotice(user.sub, createNoticeData),
    );
  }

  @Get('en')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.NOTICE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getAllNoticeEn(@Query() query: GetNoticePaginationDto) {
    return JsonResponseSerializer(await this.noticeService.getAll(query));
  }

  @Get(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.NOTICE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getNoticeById(
    @Param() queryParameters: NoticeIdentifierDto,
  ): Promise<JsonResponse<Notice>> {
    return JsonResponseSerializer(await this.noticeService.getNoticeById(queryParameters.id));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.DELETE, subject: RBAC_SUBJECTS.NOTICE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async deleteNotice(@Param() queryParameters: NoticeIdentifierDto): Promise<JsonResponse<Notice>> {
    return JsonResponseSerializer(await this.noticeService.deleteNotice(queryParameters.id));
  }

  @Put(':id')
  @ApiBearerAuth()
  @checkAbilities({ action: RBAC_ACTIONS.UPDATE, subject: RBAC_SUBJECTS.NOTICE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async updateNotice(
    @AuthenticatedUser() user,
    @Param() queryParameters: NoticeIdentifierDto,
    @Body() updateNoticeData: UpdateNoticeDto,
  ): Promise<JsonResponse<Notice | Notice[]>> {
    return JsonResponseSerializer(
      await this.noticeService.updateNotice(queryParameters.id, user.sub, updateNoticeData),
    );
  }

  @Get('/stage/:stageId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'This end point is used by the mobile to get latest 5 notices for a specific stage',
  })
  @checkAbilities({ action: RBAC_ACTIONS.READ, subject: RBAC_SUBJECTS.NOTICE })
  @UseGuards(AuthGuard, AbilitiesGuard)
  async getNoticesByStageId(
    @Param() queryParameters: NoticeStageIdentifierDto,
  ): Promise<JsonResponse<Notice[]>> {
    return JsonResponseSerializer(
      await this.noticeService.getNoticesByStageId(queryParameters.stageId),
    );
  }
}
