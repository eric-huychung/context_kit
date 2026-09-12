import { getVercelOidcToken } from '@vercel/oidc';
import { handleSearchRequest } from '../../dist/backend/skills-proxy.js';

/**
 * Vercel Function entry point: `GET /api/skills/search?q=<query>`.
 * Thin adapter — query check, OIDC proxy, and generic 502 live in
 * `handleSearchRequest`. Imports compiled `dist/` (not `src/*.js`) because
 * Node ESM cannot map `.js` specifiers onto `.ts` files; that load-time
 * miss is FUNCTION_INVOCATION_FAILED. Requires "OIDC Federation" enabled
 * in the Vercel project's dashboard settings; that's a one-time manual
 * step, not something this code can turn on itself.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    return await handleSearchRequest(request, {
      fetchImpl: fetch,
      getOidcToken: () => getVercelOidcToken(),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'function_error', message: 'Request failed.' }, { status: 500 });
  }
}
