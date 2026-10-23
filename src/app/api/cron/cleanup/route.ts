import { getConnection } from "@/db";
import { cleanup } from "@/server/demo";

/** Daily, from Vercel Cron: expired demos and old bookkeeping go. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await cleanup(await getConnection()));
}
