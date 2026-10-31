// Importa el feed XML (formato Kyero v3) de una agencia colaboradora y sincroniza
// sus inmuebles en la red de Airama. La mayoría de CRMs inmobiliarios españoles
// (Inmovilla, Witei, Mobilia, Inmoweb, Sooprema…) exportan este formato.
//
// Llamada:  POST /functions/v1/importar-feed   { "agency_id": "<uuid>" }
//   - Usuario autenticado admin de esa agencia, o admin de Airama, o
//   - cabecera  x-import-secret: <IMPORT_SECRET>  (para tareas programadas;
//     sin agency_id importa todas las agencias con feed).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { XMLParser } from "npm:fast-xml-parser@4.4.1";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-import-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const TYPE_MAP: Record<string, string> = {
  villa: "Villa", chalet: "Villa", detached: "Villa", "detached villa": "Villa",
  apartment: "Piso", flat: "Piso", piso: "Piso", studio: "Piso",
  penthouse: "Ático", atico: "Ático", "ático": "Ático",
  finca: "Finca", "country house": "Finca", cortijo: "Finca", rustic: "Finca",
  house: "Casa", townhouse: "Casa", "town house": "Casa", bungalow: "Casa", casa: "Casa",
  duplex: "Dúplex", "dúplex": "Dúplex",
  commercial: "Local", local: "Local", shop: "Local",
  plot: "Terreno", land: "Terreno", terreno: "Terreno",
};
const BALEARES = /balear|mallorca|majorca/i;

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return text(o.es ?? o.en ?? o["#text"] ?? "");
  }
  return String(v).trim();
}
function num(v: unknown): number | null {
  const n = parseFloat(text(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

async function importAgency(db: ReturnType<typeof createClient>, agency: { id: string; slug: string; feed_url: string }) {
  const { data: log } = await db.from("feed_imports").insert({ agency_id: agency.id }).select("id").single();
  try {
    const res = await fetch(agency.feed_url, { headers: { "User-Agent": "Airama-Red/1.0" } });
    if (!res.ok) throw new Error(`El feed respondió ${res.status}`);
    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      isArray: (name) => name === "property" || name === "image",
    });
    const doc = parser.parse(xml);
    const items: Record<string, unknown>[] = doc?.root?.property ?? [];
    if (!items.length) throw new Error("El feed no contiene inmuebles (<root><property>).");

    const prefix = agency.slug.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase() || "EXT";
    const seen: string[] = [];
    let upserted = 0;

    for (const it of items) {
      const extId = text(it.id);
      const price = num(it.price);
      if (!extId || !price) continue;
      const freq = text(it.price_freq).toLowerCase();
      const rawType = text(it.type).toLowerCase();
      const type = TYPE_MAP[rawType] ?? "Casa";
      const town = text(it.town);
      const province = text(it.province);
      const zone = BALEARES.test(province) ? "Mallorca" : (town || province || "Otras");
      const surface = (it.surface_area ?? {}) as Record<string, unknown>;
      const energy = text((it.energy_rating as Record<string, unknown>)?.consumption).toUpperCase();
      const loc = (it.location ?? {}) as Record<string, unknown>;
      const title = text(it.title) || `${type} en ${town || zone}`;
      const ref = `${prefix}-${(text(it.ref) || extId).replace(/[^A-Za-z0-9-]/g, "").slice(0, 20)}`;

      const row = {
        agency_id: agency.id,
        external_id: extId,
        ref,
        operation: freq === "sale" || freq === "" ? "venta" : "alquiler",
        type,
        title: title.slice(0, 160),
        description: text(it.desc).slice(0, 6000) || null,
        zone,
        city: town || null,
        price,
        built_m2: num(surface.built),
        plot_m2: num(surface.plot),
        bedrooms: num(it.beds) ?? 0,
        bathrooms: num(it.baths) ?? 0,
        energy_rating: /^[A-G]$/.test(energy) ? energy : null,
        lat: parseFloat(text(loc.latitude)) || null,
        lng: parseFloat(text(loc.longitude)) || null,
        scene: /mar|sea|beach|playa|costa/i.test(text(it.desc)) ? "sea" : type === "Piso" || type === "Ático" ? "city" : "country",
        status: "publicada",
      };

      const { data: prop, error } = await db.from("properties")
        .upsert(row, { onConflict: "agency_id,external_id" })
        .select("id").single();
      if (error) { console.error(extId, error.message); continue; }
      seen.push(extId);
      upserted++;

      const images = ((it.images as Record<string, unknown>)?.image as Record<string, unknown>[] ?? [])
        .map((im, i) => ({ property_id: prop.id, url: text(im.url), alt: title, position: num(im["@_id"]) ?? i }))
        .filter((im) => /^https?:\/\//.test(im.url))
        .slice(0, 40);
      await db.from("property_images").delete().eq("property_id", prop.id);
      if (images.length) await db.from("property_images").insert(images);
    }

    // Lo que ya no está en el feed deja de publicarse
    let unpublished = 0;
    if (seen.length) {
      const { data: gone } = await db.from("properties")
        .update({ status: "borrador" })
        .eq("agency_id", agency.id).eq("status", "publicada")
        .not("external_id", "is", null)
        .not("external_id", "in", `(${seen.map((s) => `"${s.replace(/"/g, "")}"`).join(",")})`)
        .select("id");
      unpublished = gone?.length ?? 0;
    }

    await db.from("feed_imports").update({ finished_at: new Date().toISOString(), ok: true, upserted, unpublished }).eq("id", log!.id);
    return { agency: agency.slug, ok: true, upserted, unpublished };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("feed_imports").update({ finished_at: new Date().toISOString(), ok: false, error: msg }).eq("id", log!.id);
    return { agency: agency.slug, ok: false, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);

  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const agencyId: string | undefined = body.agency_id;
  const bySecret = IMPORT_SECRET && req.headers.get("x-import-secret") === IMPORT_SECRET;

  if (!bySecret) {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Inicia sesión para importar." }, 401);
    if (!agencyId) return json({ error: "Falta agency_id." }, 400);
    const { data: roles } = await db.from("agency_members")
      .select("role, agencies!inner(id, is_owner)")
      .eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) =>
      (r.agencies.id === agencyId && r.role === "admin") || (r.agencies.is_owner && r.role === "admin"));
    if (!allowed) return json({ error: "Solo un administrador de la agencia puede importar su feed." }, 403);
  }

  let q = db.from("agencies").select("id, slug, feed_url").eq("active", true).not("feed_url", "is", null);
  if (agencyId) q = q.eq("id", agencyId);
  const { data: agencies, error } = await q;
  if (error) return json({ error: error.message }, 500);
  if (!agencies?.length) return json({ error: "La agencia no tiene URL de feed configurada." }, 400);

  const results = [];
  for (const a of agencies) results.push(await importAgency(db, a as any));
  return json({ results });
});
