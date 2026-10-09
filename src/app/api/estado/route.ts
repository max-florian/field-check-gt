import { getAllFieldStatuses } from "@/lib/weather/cached";

export async function GET() {
  return Response.json(await getAllFieldStatuses());
}
