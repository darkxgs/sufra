import { getConnection } from "@/db";
import { currentRestaurant } from "@/server/auth";
import { cleanupIfDue } from "@/server/demo";
import { maybeSimulate } from "@/server/sim";
import { staffSnapshot } from "@/server/staff";
import { versionOf } from "@/server/tickets";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The kitchen board and floor plan poll here. A demo's "busy night" happens on
 * these polls too: if the next simulated order is due, it's placed first.
 */
export async function GET(req: Request) {
  const conn = await getConnection();
  const r = await currentRestaurant(conn);
  if (!r) return Response.json({ error: "signed_out" }, { status: 401, headers: NO_STORE });
  if (r.simEnabled) await maybeSimulate(conn, r.id);
  void cleanupIfDue(conn).catch(() => {});
  const since = Number(new URL(req.url).searchParams.get("v") ?? "-1");
  if (since === (await versionOf(conn.db, r.id))) return new Response(null, { status: 204, headers: NO_STORE });
  return Response.json(await staffSnapshot(conn, r.id), { headers: NO_STORE });
}
