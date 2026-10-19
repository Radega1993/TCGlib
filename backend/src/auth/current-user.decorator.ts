import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, PublicUser } from './public-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser => {
    return context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  },
);
