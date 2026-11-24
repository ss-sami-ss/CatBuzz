import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Uuid } from "@/shared/contracts/common";
import { resolveSession } from "@/server/auth/auth-service";
import { getDb } from "@/server/db/client";
import { getCat } from "@/server/cats/cat-service";
import { ApiError } from "@/server/http/api-error";
import { ReportForm } from "./report-form";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const id = Uuid.safeParse((await searchParams).cat);
  if (!id.success) notFound();
  const token = (await cookies()).get("catbuzz_session")?.value;
  const session = token ? await resolveSession({ db: getDb(), now: () => new Date() }, token) : null;
  if (session?.status !== "active") return <><h1>ثبت گزارش کمک</h1><p>ابتدا <Link href="/account">وارد حساب کاربری شوید</Link>.</p></>;
  let cat;
  try { cat = await getCat(getDb(), id.data); }
  catch (error) { if (error instanceof ApiError && error.code === "NOT_FOUND") notFound(); throw error; }
  return <><h1>گزارش کمک برای {cat.name ?? "گربهٔ بی‌نام"}</h1><ReportForm catId={cat.id} /></>;
}
