import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { $Enums } from '@prisma/client';

@Injectable()
export class FileReportStatusCheck implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();

    const enumValue = request.body.status;

    if (
      Object.values([
        $Enums.FILE_REPORT_STATUS.REMOVED,
        $Enums.FILE_REPORT_STATUS.RESOLVED,
      ]).includes(enumValue)
    ) {
      return true;
    }

    throw new HttpException('Invalid enum value', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
