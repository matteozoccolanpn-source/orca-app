import { createHash } from "crypto";
import { auth } from "@/auth";

// Multi-utente (Blocco C), app-scoped: la "chiave utente" è un uuid DERIVATO in
// modo stabile dall'email Google (stessa email → sempre lo stesso uuid).
// Niente tabelle nuove, niente migrazione dell'auth (restiamo su NextAuth/Google).
// I user_id delle tabelle sono uuid senza foreign key, quindi qualsiasi uuid valido va bene.

// Namespace fisso (uuid a caso ma COSTANTE): non cambiarlo mai o gli id cambierebbero.
const NAMESPACE = "b1e7c0a2-9f3d-4c5e-8a6b-2d1f0e4c7a90";

function uuidToBytes(u: string): Buffer {
  return Buffer.from(u.replace(/-/g, ""), "hex");
}
function bytesToUuid(b: Buffer): string {
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// UUID v5 (SHA-1) deterministico da una stringa.
export function uuidForEmail(email: string): string {
  const name = email.trim().toLowerCase();
  const hash = createHash("sha1").update(Buffer.concat([uuidToBytes(NAMESPACE), Buffer.from(name, "utf8")])).digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50; // versione 5
  b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
  return bytesToUuid(b);
}

// uuid dell'utente loggato (o null se non loggato). Da usare nelle query dati.
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  return email ? uuidForEmail(email) : null;
}
