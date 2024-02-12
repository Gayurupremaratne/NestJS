import { Injectable } from '@nestjs/common';
import { MockAbilitiesGuard } from '@common/mock-modules/abilities.guard.mock';

@Injectable()
export class MockWebGuard extends MockAbilitiesGuard {
  async canActivate(): Promise<boolean> {
    return true;
  }
}
