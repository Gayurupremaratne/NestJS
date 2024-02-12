import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  EmergencyContactDto,
  EmergencyContactExtendedDto,
} from '../auth/dto/emergency-contact.dto';
import { PrismaService } from '@prisma-orm/prisma.service';
import { EmergencyContactAdminDto } from './dto/update-emergency.dto';
import { GetEmergencyContactParamDto } from './dto/params-emergency.dto';
import * as Sentry from '@sentry/node';

@Injectable()
export class EmergencyContactService {
  constructor(private readonly prisma: PrismaService) {}
  /**
   *  Create/ Update Emergency Contact
   *  @param  EmergencyContactExtendedDto
   *  @response StoryConsumptionResponseDto
   */

  async upsertEmergencyContact(
    sub,
    data: EmergencyContactDto | EmergencyContactAdminDto,
  ): Promise<EmergencyContactDto> {
    try {
      if (typeof (data as EmergencyContactAdminDto)?.userId === 'undefined') {
        data['userId'] = sub;
      }

      return await this.prisma.emergencyContact.upsert({
        where: {
          userId: data['userId'],
        },
        create: data,
        update: data,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'emergency-contact' }, level: 'error' });
      throw new InternalServerErrorException('Emergency Contact Update Failed');
    }
  }

  /**
   *  Get Emergency Contact by logged In user
   *  @param  EmergencyContactExtendedDto
   *  @response EmergencyContactExtendedDto
   */

  async getEmergencyContact(sub: string): Promise<EmergencyContactExtendedDto> {
    try {
      return await this.prisma.emergencyContact.findFirst({
        where: {
          userId: sub,
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'emergency-contact' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }

  /**
   *  Get Emergency Contact by User Id
   *  @param  EmergencyContactExtendedDto
   *  @response EmergencyContactExtendedDto
   */

  async getEmergencyContactByUserId(
    data: GetEmergencyContactParamDto,
  ): Promise<EmergencyContactExtendedDto> {
    try {
      return await this.prisma.emergencyContact.findFirst({
        where: {
          userId: data?.userId,
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { module: 'emergency-contact' }, level: 'error' });
      throw new InternalServerErrorException();
    }
  }
}
