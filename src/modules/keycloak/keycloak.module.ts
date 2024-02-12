import { Module } from '@nestjs/common';
import { KeycloakConfigService } from './keycloak-config.service';
import { KeycloakService } from './keycloak.service';

@Module({
  providers: [KeycloakConfigService, KeycloakService],
  exports: [KeycloakConfigService, KeycloakService],
})
export class KeycloakModule {}
