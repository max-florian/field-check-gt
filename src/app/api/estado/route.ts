import { connection } from "next/server";
import { getAllFieldStatuses } from "@/lib/weather/cached";

export async function GET() {
  // Always run at request time: freshness is handled by getAllFieldStatuses, and a
  // CDN copy could outlive it.
  await connection();
  return Response.json(await getAllFieldStatuses(), {
    headers: { "Cache-Control": "no-store" },
  });
}
