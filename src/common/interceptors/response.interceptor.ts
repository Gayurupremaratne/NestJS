import { JsonResponse } from '@common/types';
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, JsonResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<JsonResponse<T>> {
    return next.handle().pipe(
      map(({ data }) => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        data,
      })),
    );
  }
}
