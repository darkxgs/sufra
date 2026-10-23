import { getConnection } from "@/db";
import { guestSnapshot } from "@/server/guest";
import { tableByToken } from "@/server/menu";
import { versionOf } from "@/server/tickets";

const NO_STORE = { "Cache-Control": "no-store" };

/** A guest's phone asks: has anything changed since version v? 204 when not. */
export async function GET(req: Request, { params }: RouteContext<"/api/live/guest/[token]">) {
  const { token } = await params;
  const table = await tableByToken(token);
  if (!table) return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  const conn = await getConnection();
  const since = Number(new URL(req.url).searchParams.get("v") ?? "-1");
  if (since === (await versionOf(conn.db, table.restaurantId))) return new Response(null, { status: 204, headers: NO_STORE });
  return Response.json(await guestSnapshot(conn, table), { headers: NO_STORE });
}
