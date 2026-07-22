import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface AuthenticatedRequest {
  user?: Record<string, unknown>;
}

/**
 * Extracts the authenticated user placed on the request by the JWT passport
 * strategy. Throws if used on an unauthenticated route (user is undefined).
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new Error('CurrentUser used on an unauthenticated route');
    }
    return data ? user[data] : user;
  },
);
