import { customType, geometry, integer, timestamp, uuid } from "drizzle-orm/pg-core";

/** Column helpers shared by every table (docs/06: UUID ids, timestamptz, version). Columns are snake_case via casing. */

export const id = () => uuid().primaryKey().defaultRandom();
export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
export const updatedAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
export const tstz = () => timestamp({ withTimezone: true });
/** Optimistic concurrency token; every conditional edit bumps it. */
export const version = () => integer().notNull().default(0);
/** Private WGS84 point; never selected into public DTOs (docs/06 "مکان"). */
export const privatePoint = () => geometry({ type: "point", mode: "xy", srid: 4326 });

/** PostgreSQL daterange, used with exclusion constraints for non-overlapping placements. */
export const daterange = customType<{ data: string; driverData: string }>({
  dataType() {
    return "daterange";
  },
});
