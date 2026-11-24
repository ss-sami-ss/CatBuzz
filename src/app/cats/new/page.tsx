import { cookies } from "next/headers";
import Link from "next/link";
import { resolveSession } from "@/server/auth/auth-service";
import { getDb } from "@/server/db/client";
import { NewCatForm } from "./new-cat-form";

export const dynamic = "force-dynamic";

export default async function NewCatPage() {
  const token = (await cookies()).get("catbuzz_session")?.value;
  const session = token ? await resolveSession({ db: getDb(), now: () => new Date() }, token) : null;
  return (
    <>
      <h1>ثبت گربهٔ خیابانی</h1>
      {session?.status === "active" ? <NewCatForm /> : <p>برای ثبت پرونده <Link href="/account">وارد حساب کاربری شوید</Link>.</p>}
    </>
  );
}
