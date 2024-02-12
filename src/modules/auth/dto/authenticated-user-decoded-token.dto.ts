export enum IdentityProvider {
  Google = 'google',
  Facebook = 'facebook',
  Apple = 'apple',
}
export interface KeycloakRealmAccess {
  roles: string[];
}

export interface AuthenticatedUserAccount {
  roles: string[];
}

export interface AuthenticatedUserResourceAccess {
  account: AuthenticatedUserAccount;
}

export interface AuthenticatedUserDecodedTokenDto {
  exp: number;
  iat: number;
  auth_time: number;
  jti: string;
  iss: string;
  aud: string;
  sub: string;
  typ: string;
  azp: string;
  session_state: string;
  acr: string;
  'allowed-origins': string[];
  realm_access: KeycloakRealmAccess;
  resource_access: AuthenticatedUserResourceAccess;
  scope: string;
  sid: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
  picture: string;
  identity_provider: IdentityProvider;
}
