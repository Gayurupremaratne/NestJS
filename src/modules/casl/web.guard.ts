import { Injectable, ExecutionContext } from '@nestjs/common';
import { AbilitiesGuard } from './abilities.guard';
import { Request } from 'express';
import { PLATFORM } from '@common/constants';

@Injectable()
export class WebGuard extends AbilitiesGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const platform = request.headers.platform;

    if (platform === PLATFORM.web) {
      return super.canActivate(context);
    }
    return true;
  }
}
