import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { CatNeed } from "@/shared/contracts/cats";
import { MapQuery, type PublicMapItem } from "@/shared/contracts/map";
import type { Db } from "../db/client";
import { ok, parseQuery, withApi } from "../http/respond";
import { PUBLIC_CELL_DEG, publicCellCenter } from "./public-cell";

const MAP_ITEM_LIMIT = 500;
const PUBLIC_CELL_SIZES = [PUBLIC_CELL_DEG, 0.05, 0.1];
type Query = z.output<typeof MapQuery>;
type MapRow = {
  cell_id: string;
  count: number;
  id: string | null;
  name: string | null;
  needs: z.output<typeof CatNeed>[] | null;
  last_seen_day: string | null;
};

async function readPublicMap(db: Db, { bbox, zoom, needs }: Query): Promise<z.output<typeof PublicMapItem>[]> {
  const { minLng, minLat, maxLng, maxLat } = bbox;
  const clusterSize = zoom < 10 ? 0.1 : 0.05;
  const needsFilter = needs?.length
    ? sql`and cat.needs && array[${sql.join(needs.map((need) => sql`${need}`), sql`, `)}]::cat_need[]`
    : sql``;

  // Generate only candidate public cell keys so the partial public-cell index can serve this query.
  const rows = await db.execute<MapRow>(sql`
    with sizes(size) as (
      values ${sql.join(PUBLIC_CELL_SIZES.map((size) => sql`(${size}::numeric)`), sql`, `)}
    ), candidates as (
      select 'g' || size || ':' || x || ':' || y as cell_id,
        case when ${zoom}::int >= 13 or size >= ${clusterSize}::numeric then
          'g' || size || ':' || x || ':' || y
        else 'g' || ${clusterSize}::numeric || ':' ||
          floor((x + 0.5) * size / ${clusterSize}::numeric) || ':' ||
          floor((y + 0.5) * size / ${clusterSize}::numeric)
        end as cluster_id
      from sizes
      cross join lateral generate_series(
        ceil(${minLng}::numeric / size - 0.5)::int,
        floor(${maxLng}::numeric / size - 0.5)::int
      ) x
      cross join lateral generate_series(
        ceil(${minLat}::numeric / size - 0.5)::int,
        floor(${maxLat}::numeric / size - 0.5)::int
      ) y
    ), grouped as (
      select candidate.cluster_id as cell_id, count(*)::integer as count, min(cat.id::text)::uuid as cat_id
      from candidates candidate
      join cats cat on cat.public_cell_id = candidate.cell_id
      where cat.custody = 'street' and cat.lifecycle = 'active' and cat.last_seen_at is not null and cat.archived_at is null
        ${needsFilter}
      group by candidate.cluster_id
      order by candidate.cluster_id
      limit ${MAP_ITEM_LIMIT}
    )
    select grouped.cell_id, grouped.count, cat.id, cat.current_name as name, to_json(cat.needs) as needs,
      to_char(cat.last_seen_at at time zone 'UTC', 'YYYY-MM-DD') as last_seen_day
    from grouped
    left join cats cat on cat.id = grouped.cat_id and grouped.count = 1 and ${zoom}::int >= 13
    order by grouped.cell_id
  `);

  return rows.map((row) => {
    const [lng, lat] = publicCellCenter(row.cell_id);
    const center: [number, number] = [Number(lng.toFixed(8)), Number(lat.toFixed(8))];
    if (!row.id || !row.last_seen_day) return { kind: "cluster", cellId: row.cell_id, center, count: row.count };
    return {
      kind: "cat",
      id: row.id,
      name: row.name,
      center,
      needs: row.needs ?? [],
      lastSeenAt: row.last_seen_day + "T00:00:00Z",
      thumbnailUrl: null,
    };
  });
}

export function createMapHandler(getDb: () => Db) {
  return withApi(async (request, ctx) => {
    const query = parseQuery(request, MapQuery);
    return ok(ctx, await readPublicMap(getDb(), query));
  });
}
