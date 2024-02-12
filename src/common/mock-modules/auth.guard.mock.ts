import { CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class MockAuthGuard implements CanActivate {
  async canActivate(): Promise<boolean> {
    return true;
  }
}
