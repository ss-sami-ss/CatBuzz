"use client";

import { useCallback, useEffect, useReducer, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/text-field";
import type { Capability } from "@/shared/contracts/users";
import { accountApi, accountFailure, initialModel, reduceAccount } from "./account-controller";
import styles from "./account.module.css";

const capabilities: Record<Capability, string> = {
  feeding: "غذارسانی",
  transport: "جابه‌جایی",
  trapping: "زنده‌گیری",
  foster: "نگهداری موقت",
  medication: "دادن دارو طبق دستور",
  fundraising: "جمع‌آوری کمک",
  photography: "عکاسی",
};
const capabilityOptions = Object.entries(capabilities) as [Capability, string][];

export function AccountView() {
  const [{ screen, busy, error, notice }, dispatch] = useReducer(reduceAccount, initialModel);
  const inFlight = useRef(false);

  const run = useCallback(async (operation: () => Promise<void>, fallback?: { kind: "retry" }) => {
    if (inFlight.current) return;
    inFlight.current = true;
    dispatch({ type: "start" });
    try {
      await operation();
    } catch (cause) {
      const failure = accountFailure(cause);
      dispatch(failure.code === "UNAUTHENTICATED"
        ? { type: "show", screen: { kind: "email" }, notice: "برای دسترسی به حساب وارد شوید." }
        : { type: "error", error: failure, screen: fallback });
    } finally {
      inFlight.current = false;
    }
  }, []);

  const load = useCallback(async () => {
    dispatch({ type: "show", screen: { kind: "account", account: await accountApi.load() } });
  }, []);

  useEffect(() => {
    void run(load, { kind: "retry" });
  }, [load, run]);

  const fieldError = (name: string) => error?.fieldErrors?.[name]?.[0];

  function formData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return new FormData(event.currentTarget);
  }

  return (
    <div className={styles.stack}>
      {error && <p role="alert" className={styles.error}>{error.message}</p>}
      {notice && <p role="status">{notice}</p>}
      {screen.kind === "loading" && <p role="status">در حال بررسی حساب…</p>}
      {screen.kind === "retry" && (
        <Button disabled={busy} onClick={() => void run(load, { kind: "retry" })}>تلاش دوباره</Button>
      )}
      {screen.kind === "email" && (
        <form className={styles.panel} aria-busy={busy} onSubmit={(event) => {
          const data = formData(event);
          const email = String(data.get("email")).trim();
          const purpose = data.get("purpose") === "sign_up" ? "sign_up" : "sign_in";
          void run(async () => {
            const challenge = await accountApi.challenge(email, purpose);
            dispatch({ type: "show", screen: { kind: "code", challenge, email } });
          });
        }}>
          <h2>ورود و ثبت‌نام</h2>
          <TextField label="ایمیل" name="email" type="email" autoComplete="email" dir="ltr" required error={fieldError("contact.value")} />
          <label className={styles.choice}>
            نوع درخواست
            <select name="purpose" defaultValue="sign_in">
              <option value="sign_in">ورود به حساب</option>
              <option value="sign_up">ساخت حساب</option>
            </select>
          </label>
          <Button type="submit" disabled={busy}>{busy ? "در حال ارسال…" : "دریافت کد"}</Button>
        </form>
      )}
      {screen.kind === "code" && (
        <form className={styles.panel} aria-busy={busy} onSubmit={(event) => {
          const data = formData(event);
          void run(async () => {
            await accountApi.verify(screen.challenge.challengeId, String(data.get("code")));
            try {
              await load();
            } catch (cause) {
              dispatch({ type: "error", error: accountFailure(cause), screen: { kind: "retry" } });
            }
          });
        }}>
          <h2>تأیید ایمیل</h2>
          <p>اگر امکان ادامه با <bdi>{screen.email}</bdi> وجود داشته باشد، کد به همین نشانی ارسال می‌شود.</p>
          <TextField label="کد شش‌رقمی" name="code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" required autoFocus error={fieldError("code")} />
          <div className={styles.actions}>
            <Button type="submit" disabled={busy}>{busy ? "در حال تأیید…" : "تأیید کد"}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => dispatch({ type: "show", screen: { kind: "email" } })}>تغییر ایمیل یا دریافت کد جدید</Button>
          </div>
        </form>
      )}
      {screen.kind === "account" && (
        <>
          <form className={styles.panel} key={screen.account.me.version} aria-busy={busy} onSubmit={(event) => {
            const data = formData(event);
            void run(async () => {
              const me = await accountApi.updateProfile({
                version: screen.account.me.version,
                username: String(data.get("username")),
                firstName: String(data.get("firstName")),
                lastName: String(data.get("lastName")),
              });
              dispatch({ type: "show", screen: { kind: "account", account: { ...screen.account, me } }, notice: "مشخصات ذخیره شد." });
            });
          }}>
            <h2>مشخصات حساب</h2>
            {screen.account.me.verifiedContact && <p>ایمیل تأییدشده <bdi>{screen.account.me.verifiedContact.value}</bdi></p>}
            <TextField label="نام" name="firstName" defaultValue={screen.account.me.firstName ?? ""} autoComplete="given-name" maxLength={60} required error={fieldError("firstName")} />
            <TextField label="نام خانوادگی" name="lastName" defaultValue={screen.account.me.lastName ?? ""} autoComplete="family-name" maxLength={60} required error={fieldError("lastName")} />
            <TextField label="نام کاربری عمومی" name="username" defaultValue={screen.account.me.username ?? ""} autoComplete="username" dir="ltr" maxLength={30} required error={fieldError("username")} description="نام و نام خانوادگی شما خصوصی می‌ماند." />
            <div className={styles.actions}>
              <Button type="submit" disabled={busy}>ذخیرهٔ مشخصات</Button>
              {error?.code === "VERSION_CONFLICT" && <Button variant="secondary" disabled={busy} onClick={() => void run(load)}>دریافت مشخصات تازه</Button>}
            </div>
          </form>
          <form className={styles.panel} aria-busy={busy} key={screen.account.capabilities.join(",")} onSubmit={(event) => {
            const data = formData(event);
            const selected = capabilityOptions.filter(([value]) => data.has(value)).map(([value]) => value);
            void run(async () => {
              const { capabilities } = await accountApi.updateCapabilities(selected);
              dispatch({ type: "show", screen: { kind: "account", account: { ...screen.account, capabilities } }, notice: "توانمندی‌ها ذخیره شد." });
            });
          }}>
            <h2>توانمندی‌های داوطلبانه</h2>
            {screen.account.capabilities.length === 0 && <p>هنوز توانمندی‌ای ثبت نشده است.</p>}
            <fieldset className={styles.options} disabled={busy}>
              <legend>مواردی را که می‌توانید انجام دهید انتخاب کنید.</legend>
              {capabilityOptions.map(([value, label]) => (
                <Checkbox key={value} name={value} defaultChecked={screen.account.capabilities.includes(value)}>{label}</Checkbox>
              ))}
            </fieldset>
            <Button type="submit" disabled={busy}>ذخیرهٔ توانمندی‌ها</Button>
          </form>
          <Button variant="secondary" disabled={busy} onClick={() => void run(async () => {
            await accountApi.logout();
            dispatch({ type: "show", screen: { kind: "email" }, notice: "از حساب خارج شدید." });
          })}>خروج از حساب</Button>
        </>
      )}
    </div>
  );
}
