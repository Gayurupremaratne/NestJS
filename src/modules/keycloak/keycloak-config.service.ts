import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KeycloakConnectOptions,
  KeycloakConnectOptionsFactory,
  TokenValidation,
} from 'nest-keycloak-connect';

@Injectable()
export class KeycloakConfigService implements KeycloakConnectOptionsFactory {
  url: string;
  realm: string;
  clientId: string;
  secret: string;

  constructor(configService: ConfigService) {
    this.url = configService.get<string>('KEYCLOAK_URL');
    this.realm = configService.get<string>('KEYCLOAK_REALM');
    this.clientId = configService.get<string>('KEYCLOAK_CLIENT_ID');
    this.secret = configService.get<string>('KEYCLOAK_SECRET');
  }

  createKeycloakConnectOptions(): KeycloakConnectOptions {
    return {
      authServerUrl: this.url,
      realm: this.realm,
      clientId: this.clientId,
      secret: this.secret,
      tokenValidation: TokenValidation.OFFLINE,
    };
  }
}
