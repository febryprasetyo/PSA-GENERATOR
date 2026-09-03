import { sql, type SQLWrapper } from "drizzle-orm";

export function hospitalTimeZoneSql(province: SQLWrapper) {
  const normalized = sql`lower(trim(coalesce(${province}, '')))`;
  return sql<string>`case
    when ${normalized} in ('kalimantan selatan','kalimantan timur','kalimantan utara','bali','nusa tenggara barat','ntb','nusa tenggara timur','ntt','sulawesi utara','gorontalo','sulawesi tengah','sulawesi barat','sulawesi selatan','sulawesi tenggara') then 'Asia/Makassar'
    when ${normalized} in ('maluku','maluku utara','papua','papua barat','papua barat daya','papua selatan','papua tengah','papua pegunungan') then 'Asia/Jayapura'
    else 'Asia/Jakarta'
  end`;
}

export function localTelemetryTimeSql(timestamp: SQLWrapper, province: SQLWrapper) {
  return sql<Date>`timezone(${hospitalTimeZoneSql(province)}, ${timestamp})`;
}
