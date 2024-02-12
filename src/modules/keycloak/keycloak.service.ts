import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse, AxiosInstance } from 'axios';
//
import { CONFIG_NAMESPACES } from '../../common/constants';
import { IAppConfig } from '../../common/types';
import { KeycloakTokensDto, LoginResponseDto } from './dto/keycloak.dto';
import { KeycloakUserDto } from './dto/keycloak-user.dto';
import { KeycloakCreateUserDto } from './dto/keycloak-create-user.dto';
import { RefreshTokenResponseDto } from './dto/keycloak.dto';
import { UserDto } from '@user/dto/user.dto';
import { ChangePasswordDto } from '@user/dto/change-password.dto';
import * as Sentry from '@sentry/node';
import { INVALID_CREDENTIAL, INVALID_GRANT } from '@common/constants/common_error_description';

/**
 * Keycloak service
 * @description This service is used to interact with Keycloak server
 */
@Injectable()
export class KeycloakService {
  private readonly KEYCLOAK_URL: string;
  private readonly KEYCLOAK_REALM: string;
  private readonly KEYCLOAK_CLIENT_ID: string;
  private readonly KEYCLOAK_SECRET: string;
  private readonly KEYCLOAK_TOKEN_URL: string;
  private readonly KEYCLOAK_USER_INFO_URL: string;
  private readonly KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE: string;
  private readonly KEYCLOAK_PAT_GRANT_TYPE: string;
  private readonly KEYCLOAK_REDIRECT_URI: string;
  private readonly KEYCLOAK_REFRESH_TOKEN_GRANT_TYPE: string;
  private readonly KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE_SOCIAL_LOGINS: string;

  private readonly keycloakAxiosInstance: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const appConfig = this.configService.get<IAppConfig>(CONFIG_NAMESPACES.APP);

    // Keycloak config
    this.KEYCLOAK_URL = appConfig.KEYCLOAK_URL;
    this.KEYCLOAK_REALM = appConfig.KEYCLOAK_REALM;
    this.KEYCLOAK_CLIENT_ID = appConfig.KEYCLOAK_CLIENT_ID;
    this.KEYCLOAK_SECRET = appConfig.KEYCLOAK_SECRET;
    this.KEYCLOAK_TOKEN_URL = appConfig.KEYCLOAK_TOKEN_URL;
    this.KEYCLOAK_USER_INFO_URL = appConfig.KEYCLOAK_USER_INFO_URL;
    this.KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE = appConfig.KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE;
    this.KEYCLOAK_PAT_GRANT_TYPE = appConfig.KEYCLOAK_PAT_GRANT_TYPE;
    this.KEYCLOAK_REDIRECT_URI = appConfig.KEYCLOAK_REDIRECT_URI;
    this.KEYCLOAK_REFRESH_TOKEN_GRANT_TYPE = appConfig.KEYCLOAK_REFRESH_TOKEN_GRANT_TYPE;
    this.KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE_SOCIAL_LOGINS =
      appConfig.KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE_SOCIAL_LOGINS;

    // Axios instance
    this.keycloakAxiosInstance = axios.create({
      baseURL: this.KEYCLOAK_URL,
    });
  }

  async setKeycloakAuthHeader() {
    try {
      this.keycloakAxiosInstance.defaults.headers.common['Authorization'] =
        `Bearer ${await this.getPAT()}`;
      this.keycloakAxiosInstance.defaults.headers.common['Content-Type'] = 'application/json';
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Function to obtain a PAT (protection api token)
   * @returns PAT
   */
  async getPAT(): Promise<string> {
    const url = `/realms/${this.KEYCLOAK_REALM}/protocol/openid-connect/token`;

    const params = new URLSearchParams();
    params.append('grant_type', this.KEYCLOAK_PAT_GRANT_TYPE);
    params.append('client_id', this.KEYCLOAK_CLIENT_ID);
    params.append('client_secret', this.KEYCLOAK_SECRET);

    try {
      const result: AxiosResponse = await this.keycloakAxiosInstance.post(url, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return result?.data?.access_token;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error('Failed to obtain PAT');
    }
  }

  /**
   * Get user info
   * @param email
   * @returns user info
   */
  async getUser(email: string): Promise<KeycloakUserDto> {
    const encodedEmail = encodeURIComponent(email);
    const url = `/admin/realms/${this.KEYCLOAK_REALM}/users?username=${encodedEmail}`;

    try {
      await this.setKeycloakAuthHeader();
      const result: AxiosResponse = await this.keycloakAxiosInstance.get(url);

      if (result.data?.length === 0) {
        throw new InternalServerErrorException('Something went wrong! while fetching user');
      }

      return {
        id: result.data[0].id,
        firstName: result.data[0].firstName,
        lastName: result.data[0].lastName,
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get the tokens fron Keycloak
   * @param username
   * @param password
   * @returns tokens
   */
  async login(email: string, password: string, user: UserDto): Promise<LoginResponseDto> {
    const params = new URLSearchParams();
    params.append('grant_type', this.KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE);
    params.append('client_id', this.KEYCLOAK_CLIENT_ID);
    params.append('client_secret', this.KEYCLOAK_SECRET);
    params.append('username', email);
    params.append('password', password);

    const url = `/realms/${this.KEYCLOAK_REALM}/${this.KEYCLOAK_TOKEN_URL}`;
    try {
      const { data }: AxiosResponse<KeycloakTokensDto> = await this.keycloakAxiosInstance.post(
        url,
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      return {
        keycloakTokens: data,
        userData: user,
      };
    } catch (error) {
      Sentry.captureException(error);
      if (error.response.status == HttpStatus.UNAUTHORIZED) {
        if (
          error.response.data?.error_description === INVALID_CREDENTIAL &&
          error.response.data?.error === INVALID_GRANT
        ) {
          throw new HttpException(error.response.data?.error_description, HttpStatus.UNAUTHORIZED);
        }
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      if (error.response.status == HttpStatus.FORBIDDEN) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get the tokens from Keycloak
   * @param code
   * @param codeVerifier
   * @returns LoginResponseDto
   */
  async socialLogin(code: string, codeVerifier: string): Promise<KeycloakTokensDto> {
    const params = new URLSearchParams();
    params.append('grant_type', this.KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE_SOCIAL_LOGINS);
    params.append('client_id', this.KEYCLOAK_CLIENT_ID);
    params.append('client_secret', this.KEYCLOAK_SECRET);
    params.append('redirect_uri', this.KEYCLOAK_REDIRECT_URI);
    params.append('code', code);
    params.append('code_verifier', codeVerifier);

    const url = `/realms/${this.KEYCLOAK_REALM}/${this.KEYCLOAK_TOKEN_URL}`;
    try {
      const { data }: AxiosResponse<KeycloakTokensDto> = await this.keycloakAxiosInstance.post(
        url,
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      return data;
    } catch (error) {
      Sentry.captureException(error);
      if (error.response.status == HttpStatus.UNAUTHORIZED) {
        throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
      }
      if (error.response.status == HttpStatus.FORBIDDEN) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  /**
   * Get the new access token from Keycloak
   * @param refreshToken
   * @returns new access token and new refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponseDto> {
    const params = new URLSearchParams();
    params.append('grant_type', this.KEYCLOAK_REFRESH_TOKEN_GRANT_TYPE);
    params.append('client_id', this.KEYCLOAK_CLIENT_ID);
    params.append('client_secret', this.KEYCLOAK_SECRET);
    params.append('refresh_token', refreshToken);

    const url = `/realms/${this.KEYCLOAK_REALM}/${this.KEYCLOAK_TOKEN_URL}`;

    try {
      const response: AxiosResponse<RefreshTokenResponseDto> =
        await this.keycloakAxiosInstance.post(url, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

      return {
        access_token: response?.data.access_token,
        refresh_token: response?.data.refresh_token,
        expires_in: response?.data?.expires_in,
        refresh_expires_in: response?.data?.refresh_expires_in,
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Add user
   * @param userData
   * @returns user
   */
  async createUser(userData: KeycloakCreateUserDto): Promise<KeycloakUserDto> {
    const { email, firstName, lastName, password, temporary } = userData;
    const payload = {
      username: email,
      email,
      firstName,
      lastName,
      enabled: true,
      credentials: [
        {
          type: 'password',
          value: password,
          temporary,
        },
      ],
    };

    const url = `/admin/realms/${this.KEYCLOAK_REALM}/users`;

    try {
      await this.setKeycloakAuthHeader();
      await this.keycloakAxiosInstance.post(url, payload);
      return await this.getUser(email);
    } catch (error) {
      Sentry.captureException(error);
      if (error.response.status == HttpStatus.CONFLICT) {
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete user
   * @param userData
   * @returns user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await this.setKeycloakAuthHeader();
      const url = `/admin/realms/${this.KEYCLOAK_REALM}/users/${userId}`;
      await this.keycloakAxiosInstance.delete(url);
    } catch (error) {
      Sentry.captureException(error);
      if (error.response.status == HttpStatus.FORBIDDEN) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Change Password
   * @param userId
   * @param currentPassword
   * @param newPassword
   */
  async changePassword(user: UserDto, passwords: ChangePasswordDto): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', this.KEYCLOAK_TOKEN_EXCHANGE_GRANT_TYPE);
      params.append('client_id', this.KEYCLOAK_CLIENT_ID);
      params.append('client_secret', this.KEYCLOAK_SECRET);
      params.append('username', user.email);
      params.append('password', passwords.currentPassword);

      const url = `/realms/${this.KEYCLOAK_REALM}/${this.KEYCLOAK_TOKEN_URL}`;
      // login user to check if current password is valid
      try {
        await this.keycloakAxiosInstance.post(url, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch (error) {
        Sentry.captureException(error);
        if (error.response.status == HttpStatus.UNAUTHORIZED) {
          throw new HttpException('current password is invalid', HttpStatus.UNAUTHORIZED);
        }
        if (error.response.status == HttpStatus.FORBIDDEN) {
          throw new HttpException(error.message, HttpStatus.FORBIDDEN);
        }
      }

      await this.setKeycloakAuthHeader();
      const resetUrl = `/admin/realms/${this.KEYCLOAK_REALM}/users/${user.id}/reset-password`;
      await this.keycloakAxiosInstance.put(resetUrl, {
        type: 'password',
        value: passwords.newPassword,
        temporary: false,
      });
    } catch (error) {
      Sentry.captureException(error);
      if (error.response.status == HttpStatus.FORBIDDEN) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Reset Password
   * @param newPassword
   * @param userId
   */
  async resetPassword(userId: string, password: string): Promise<void> {
    try {
      await this.setKeycloakAuthHeader();
      const url = `/admin/realms/${this.KEYCLOAK_REALM}/users/${userId}/reset-password`;
      await this.keycloakAxiosInstance.put(url, {
        type: 'password',
        value: password,
        temporary: false,
      });
    } catch (error) {
      Sentry.captureException(error);
      if (error.response.status == HttpStatus.FORBIDDEN) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async logout(sub: string): Promise<boolean> {
    try {
      await this.setKeycloakAuthHeader();
      const sessions_url = `/admin/realms/${this.KEYCLOAK_REALM}/users/${sub}/sessions`;

      //get all user sessions
      const userSessions = await this.keycloakAxiosInstance.get(sessions_url);

      //logout from all sessions
      const logoutUserSession = await Promise.all(
        userSessions?.data.map(async (session) => {
          const logoutUrl = `/admin/realms/${this.KEYCLOAK_REALM}/sessions/${session.id}`;

          return await this.keycloakAxiosInstance.delete(logoutUrl);
        }),
      );
      const allSuccessfull = logoutUserSession.every((result) => result.status === 204);
      if (allSuccessfull) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      Sentry.captureException(error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
