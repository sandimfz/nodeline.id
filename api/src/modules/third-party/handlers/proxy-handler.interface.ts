/**
 * Interface for third-party API handlers.
 *
 * Each handler is responsible for injecting its service's secret API key
 * into the outbound request before Nodeline proxies it to the external service.
 *
 * The handler registry in ThirdPartyProxyService maps slugs to handlers;
 * when no handler matches a slug, the proxy falls through without injecting
 * any key (the external service may accept keyless requests, or the key may
 * be embedded in the base URL).
 */
export interface ThirdPartyHandler {
  /** Slug of the api_services entry this handler is responsible for. */
  readonly slug: string;

  /**
   * Mutate the outbound request (URL + options) so the third-party API key
   * is present — typically by setting a query parameter or an Authorization
   * header.
   *
   * @param url  The URL being fetched. Mutate its searchParams to add a key.
   * @param options  RequestInit (headers, body, etc.). Mutate headers if needed.
   */
  injectApiKey(url: URL, options: RequestInit): void;
}
