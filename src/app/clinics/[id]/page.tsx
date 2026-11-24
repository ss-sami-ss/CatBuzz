import { notFound } from "next/navigation";
import { Uuid } from "@/shared/contracts/common";
import { getClinic } from "@/server/clinics/directory";
import { getDb } from "@/server/db/client";
import { ApiError } from "@/server/http/api-error";
import { ClinicMap } from "../clinic-map";
import { clinicStatus, serviceName, weekdays } from "../labels";

export const dynamic = "force-dynamic";

export default async function ClinicPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Uuid.safeParse((await params).id);
  if (!id.success) notFound();
  let clinic;
  try { clinic = await getClinic(getDb(), id.data); }
  catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  return <article>
    <h1>{clinic.name}</h1>
    <p>{clinicStatus[clinic.status]}</p>
    {clinic.address && <address>{clinic.address}</address>}
    {clinic.phone && <p>تماس <bdi>{clinic.phone}</bdi></p>}
    <h2>ساعات کاری</h2>
    {clinic.openingHours.length ? <>
      <p>منطقهٔ زمانی <bdi>{clinic.timezone}</bdi></p>
      <ul>{clinic.openingHours.map((hours) => <li key={[hours.weekday, hours.opens, hours.closes].join(":")}>
        {weekdays[hours.weekday]} <bdi>{hours.opens}–{hours.closes}</bdi>
      </li>)}</ul>
    </> : <p>ساعات کاری اعلام نشده است.</p>}
    {clinic.services.length > 0 && <><h2>خدمات</h2><ul>{clinic.services.map((service) => <li key={service}>{serviceName(service)}</li>)}</ul></>}
    <ClinicMap clinics={[clinic]} />
  </article>;
}
