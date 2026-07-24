import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the authenticated API key attached to the request by the ApiKeyGuard.
 * The guard sets `request.apiKey` after successful validation.
 */
export const CurrentApiKey = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ apiKey?: Record<string, unknown> }>();
    if (!request.apiKey) {
      throw new Error('CurrentApiKey used on a non-API-key route');
    }
    return data ? request.apiKey[data] : request.apiKey;
  },
);
