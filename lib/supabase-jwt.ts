import { createHmac } from "crypto";

// Firma un JWT compatibile con Supabase/PostgREST (HS256) col JWT Secret del
// progetto. Il claim `sub` (uuid utente) diventa `auth.uid()` dentro le policy RLS.
// Zero dipendenze: usiamo crypto di Node.
function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function mintSupabaseJwt(sub: string): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET mancante");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub, role: "authenticated", aud: "authenticated", iat: now, exp: now + 60 * 60 };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", secret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}
