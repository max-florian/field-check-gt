import { cacheLife } from "next/cache";
import { LOCATIONS } from "@/config/locations";
import { type FieldStatus, type StatusResponse, getFieldStatus } from "./status";

/**
 * Status of every field, shared by all visitors. Revalidated in the background every
 * 5 minutes so the weather sources get at most one request per field per period.
 */
export async function getAllFieldStatuses(): Promise<StatusResponse> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });

  // One field at a time, so later fields reuse the Wunderground key the first one found
  // instead of all scraping dashboard pages at once.
  const fields: FieldStatus[] = [];
  for (const location of LOCATIONS) fields.push(await getFieldStatus(location));

  return { generatedAt: new Date().toISOString(), fields };
}
