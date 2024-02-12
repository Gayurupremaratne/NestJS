import { UserDto } from '../../user/dto/user.dto';

export class LoginResponseDto {
  userData?: UserDto;
  keycloakTokens?: KeycloakTokensDto;
}
export class RefreshTokenResponseDto {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
}

export class KeycloakTokensDto {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  id_token?: string;
  token_type?: string;
  'not-before-policy': number;
  session_state: string;
  scope: string;
}
