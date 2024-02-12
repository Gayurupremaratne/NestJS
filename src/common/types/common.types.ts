import { AuthenticatedUserDecodedTokenDto } from '@app/modules/auth/dto/authenticated-user-decoded-token.dto';

export interface JsonResponse<T> {
  data: T;
  statusCode?: number;
}

export interface CustomAuthRequest extends Request {
  user: AuthenticatedUserDecodedTokenDto;
}
