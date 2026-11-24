import Image from "next/image";
import { notFound } from "next/navigation";
import { Uuid } from "@/shared/contracts/common";
import { getCat } from "@/server/cats/cat-service";
import { getDb } from "@/server/db/client";
import { ApiError } from "@/server/http/api-error";
import { needLabels } from "../../home/discovery";
import { ageLabels, dateFormat, sexLabels } from "../labels";
import styles from "../cats.module.css";

export const dynamic = "force-dynamic";

export default async function CatPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Uuid.safeParse((await params).id);
  if (!id.success) notFound();
  let cat;
  try {
    cat = await getCat(getDb(), id.data);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const name = cat.name ?? "گربهٔ بی‌نام";
  return (
    <article>
      <h1>{name}</h1>
      <p>{cat.publicArea.label} · <time dateTime={cat.lastSeenAt}>{dateFormat.format(new Date(cat.lastSeenAt))}</time></p>
      {cat.photoIds.length > 0 && (
        <div className={styles.grid}>
          {cat.photoIds.map((id) => <Image key={id} className={styles.photo} src={"/api/v1/public-images/" + id}
            alt={"عکس " + name} width={640} height={480} unoptimized />)}
        </div>
      )}
      <dl className={styles.card}>
        <dt>جنسیت</dt><dd>{sexLabels[cat.sex]}</dd>
        <dt>سن تقریبی</dt><dd>{ageLabels[cat.ageEstimate]}</dd>
        <dt>نشانه‌های ظاهری</dt><dd>{cat.markings || "نامشخص"}</dd>
        <dt>مراقبت</dt><dd>{cat.careStatus === "has_caretaker" ? "دارای مراقب" : "نامشخص"}</dd>
        {cat.needs.length > 0 && <><dt>نیازها</dt><dd>{cat.needs.map((item) => needLabels[item]).join("، ")}</dd></>}
      </dl>
    </article>
  );
}
