export const clinicStatus = { unverified: "تأیید نشده", pending: "در انتظار بررسی", verified: "تأیید شده", rejected: "رد شده" };
export const weekdays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
const serviceLabels: Record<string, string> = { vaccination: "واکسیناسیون", sterilization: "عقیم‌سازی", treatment: "درمان", examination: "معاینه" };
export const serviceName = (id: string) => serviceLabels[id] ?? id;
