import { createClient } from '@supabase/supabase-js';
import { handleSuggestedRequest } from '../../dist/backend/market-read.js';
import { SupabaseMarketStore } from '../../dist/backend/supabase-market-store.js';

/**
 * Vercel Function entry point: `GET /api/market/suggested`. Editorial
 * shortlist from `data/market-picks.yaml`, hydrated against the index.
 * No LLM — ranking with a user key happens in the app, not here.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { error: 'config_error', message: 'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const store = new SupabaseMarketStore(supabase);
    return await handleSuggestedRequest(request, { store });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'function_error', message: 'Request failed.' }, { status: 500 });
  }
}
