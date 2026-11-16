"use client";

import { Form } from "@base-ui/react/form";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { TabsList, TabsPanel, TabsRoot, TabsTab } from "@/components/ui/tabs";
import { TextField } from "@/components/ui/text-field";
import styles from "./forms-sample-view.module.css";

type PlacementKindSample = "sitting-caregiver-home" | "sitting-owner-home" | "foster";

const PLACEMENT_OPTIONS: readonly SelectOption<PlacementKindSample>[] = [
  { value: "sitting-caregiver-home", label: "نگهداری گربهٔ خانگی در خانهٔ نگهدارنده" },
  { value: "sitting-owner-home", label: "سر زدن نگهدارنده به خانهٔ صاحب گربه" },
  { value: "foster", label: "خانهٔ موقت برای گربهٔ خیابانی" },
];

/** Dev showcase of the T04 form controls. Nothing is sent; the toast says so. */
export function FormsSampleView() {
  return (
    <main className={styles.page}>
      <p className={styles.sampleBanner} role="note">
        صفحهٔ نمونهٔ طراحی — فرم‌ها به سرور وصل نیستند و هیچ درخواستی ثبت نمی‌شود.
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>کنترل‌های فرم (نمونه)</h1>
        <Link href="/sample" className={styles.link}>
          نمونهٔ کارت گربه
        </Link>
      </header>

      <TabsRoot defaultValue="form">
        <TabsList aria-label="بخش‌های نمونه">
          <TabsTab value="form">فرم درخواست</TabsTab>
          <TabsTab value="states">حالت‌ها</TabsTab>
        </TabsList>

        <TabsPanel value="form">
          <PlacementRequestSample />
        </TabsPanel>

        <TabsPanel value="states">
          <StatesSample />
        </TabsPanel>
      </TabsRoot>
    </main>
  );
}

function PlacementRequestSample() {
  return (
    <Form
      className={styles.form}
      aria-label="درخواست نگهداری موقت (نمونه)"
      onFormSubmit={() => {
        toast("این فرم نمونه است؛ درخواستی ثبت یا ارسال نشد.");
      }}
    >
      <TextField name="catName" label="نام گربه" required autoComplete="off" />
      <SelectField name="placementKind" label="نوع نگهداری" options={PLACEMENT_OPTIONS} required />
      <TextField
        name="careNotes"
        label="دستور مراقبت"
        rows={3}
        description="غذا، دارو و عادت‌هایی که نگهدارنده باید بداند."
      />
      <TextField
        name="phone"
        label="شمارهٔ تماس"
        type="tel"
        inputMode="tel"
        dir="ltr"
        autoComplete="tel"
        description="فقط پس از پذیرش درخواست به نگهدارنده نشان داده می‌شود."
      />
      <Checkbox name="trustAcknowledged" required>
        می‌دانم CatBuzz هویت نگهدارنده را تأیید نمی‌کند و اعتبار او از نظر کاربران قبلی می‌آید.
      </Checkbox>
      <div className={styles.actions}>
        <Button type="submit">ارسال درخواست</Button>
      </div>
    </Form>
  );
}

function StatesSample() {
  return (
    <div className={styles.form}>
      <TextField
        name="username"
        label="نام کاربری"
        dir="ltr"
        defaultValue="narenj"
        error="این نام کاربری قبلاً گرفته شده است. نام دیگری انتخاب کنید."
        description="نمونهٔ خطای برگشتی از سرور."
      />
      <TextField name="locked" label="فیلد غیرفعال" defaultValue="قابل ویرایش نیست" disabled />
      <SelectField
        name="lockedKind"
        label="انتخاب غیرفعال"
        options={PLACEMENT_OPTIONS}
        defaultValue="foster"
        disabled
      />
      <Checkbox name="lockedCheck" defaultChecked disabled>
        گزینهٔ غیرفعال و انتخاب‌شده
      </Checkbox>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => toast.error("نمونهٔ خطا: ارسال نشد چون اتصال برقرار نیست. دوباره تلاش کنید.")}
        >
          نمایش toast خطا
        </Button>
      </div>
    </div>
  );
}
