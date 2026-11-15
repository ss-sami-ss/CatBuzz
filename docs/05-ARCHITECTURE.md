# معماری و تصمیم‌های فنی

## ADR-001 — ساختار ماژولار

یک Next.js modular monolith با worker جدا برای کارهای زمان‌بر. هدف، توسعهٔ ساده و مرزهای روشن است. استخراج سرویس مستقل فقط با نیاز اندازه‌گیری‌شده انجام شود. نسخهٔ دقیق Next.js، React و Node هنگام T02 از مستندات رسمی و سازگاری dependencies انتخاب، در package.json و lockfile ثابت و ثبت شود.

## ADR-002 — MVI در رابط تعاملی

View → Intent → Controller/Effect → Result → Reducer → Model → View.

Model وضعیت انتخاب، فرم، drawer و عملیات جاری را نگه می‌دارد. reducer خالص است. Controller عملیات شبکه و side effect را هماهنگ می‌کند. دادهٔ سرور در TanStack Query یک منبع حقیقت دارد و در reducer دوباره کپی نمی‌شود. Model قابل‌نمایش از UI state و query snapshot ساخته می‌شود. برای صفحات سادهٔ فقط خواندنی، Server Component کافی است.

مثال پذیرش مأموریت

```text
AcceptMission(missionId, version, idempotencyKey)
→ UI pending
→ POST acceptance
→ service checks identity + capability + capacity
→ transaction assignment + outbox
→ success: invalidate mission and my-missions queries
→ failure: restore actionable UI and show stable error code
```

رسیدن پاسخ قدیمی جست‌وجوی نقشه با AbortSignal یا request identity کنترل شود. cleanup اشتراک پیام و موقعیت در unmount ضروری است. state و QueryClient سمت سرور به ازای درخواست ساخته شوند؛ singleton مشترک کاربران ایجاد نشود.

## ADR-003 — مرز سرور و مرورگر

App Router صفحه، layout و دادهٔ اولیهٔ مجاز را سمت سرور آماده می‌کند. نقشه، فرم‌ها و چت Client Component هستند. فایل server با server-only حفاظت شود. secret، repository و مدل خام حاوی اطلاعات خصوصی از مرز کلاینت عبور نکند. ورود اولیه و hydration نباید باعث درخواست و state متناقض شوند.

## ساختار پیشنهادی

```text
src/
  app/
    (auth)/login/ verify/
    (main)/page.tsx cats/[catId]/ colonies/[colonyId]/
    (main)/missions/ groups/ community/ vets/ consultations/
    (main)/adoption/ support/ calendar/ messages/ counseling/ profile/
    admin/
    api/v1/
  features/
    auth/ map/ cats/ colonies/ reports/ missions/ groups/
    community/ veterinary/ consultations/ donations/ adoption/
    calendar/ messaging/ counseling/ moderation/
  components/ui/ layout/
  server/auth/ db/ access/ storage/ payments/ notifications/
  shared/contracts/ validation/ dates/ config/
workers/
  jobs/
tests/
  integration/ e2e/ fixtures/
```

الگوی قابلیت بزرگ

```text
features/missions/
  model/mission.types.ts mission.state.ts mission.intents.ts mission.reducer.ts
  application/use-mission-controller.ts
  data/mission.api.ts mission.queries.ts
  components/mission-card.tsx mission-status.tsx
  views/mission-list-view.tsx mission-details-view.tsx
  server/mission.service.ts mission.repository.ts mission.policy.ts
```

قابلیت کوچک لازم نیست تمام فایل‌های الگو را داشته باشد. Route Handler مسئول parse، identity و mapping پاسخ است. service قواعد دامنه و transaction را اجرا می‌کند. repository فقط وقتی مرز مفیدی می‌سازد اضافه شود. Server Action احتمالی باید همان service و policy را فراخوانی کند و منطق موازی نسازد.

## ADR-004 — داده و GIS

PostgreSQL + PostGIS انتخاب پیشنهادی است. لایهٔ schema/migration می‌تواند Drizzle و SQL صریح برای GIS باشد؛ انتخاب نهایی در T02 با migration آزمایشی تأیید شود. spatial index برای مشاهدات و سلول عمومی، index برای status/date/foreign key و query محدود لازم است. مدل عمومی و خصوصی از یک query عمومی خام استخراج نشوند.

## ADR-005 — job و realtime

Redis-backed queue مانند BullMQ یا جایگزین پایدار در T03 ارزیابی شود. انتخاب نام کتابخانه شرط کسب‌وکار نیست. outbox در همان transaction تغییر دامنه ثبت می‌شود و relay به صف می‌فرستد. delivery حداقل یک‌بار است؛ مصرف‌کننده با کلید دامنه dedupe می‌کند. retry محدود با backoff/jitter و dead-letter queue وجود دارد.

WebSocket یا سرویس realtime مستقل از request عمرکوتاه Next.js انتخاب شود. پیام ابتدا در DB ذخیره و سپس broadcast می‌شود. client بعد reconnect با cursor پیام‌های ازدست‌رفته را می‌خواند. کانال با عضویت سرور مجاز می‌شود.

## ADR-006 — رسانه

Upload intent → signed URL کوتاه‌عمر برای قرنطینه → تأیید مالکیت فایل → بررسی نوع واقعی و اندازه → حذف EXIF/thumbnail/transcode → publication. فاکتور و فایل پزشکی private bucket یا policy خصوصی دارند. شناسهٔ object نباید مجوز دسترسی تلقی شود.

## ADR-007 — cache و رخدادها

cache عمومی فقط DTO عمومی دارد. cache خصوصی با شناسهٔ کاربر/مجوز scope می‌شود یا غیرفعال است. پس از تغییر پرونده، مأموریت و پرداخت queryهای مرتبط invalidate شوند. دادهٔ «آخرین مشاهده» زمان مشخص دارد. نتیجهٔ پرداخت از redirect مرورگر معتبر نمی‌شود.

## معیارهای معماری

- یک منبع حقیقت برای هر state؛ بدون store سراسری بی‌نیاز.
- تمام قراردادها schema قابل‌اعتبارسنجی و types مشترک دارند.
- adapter برای SMS، پرداخت، نقشه، media و realtime قابل جایگزینی است.
- شاخص اصلی نتیجهٔ رفتار از مسیر UI/API است، نه تعداد abstractionها.
- قراردادها قبل از تقسیم کار تثبیت و تغییر breaking در سند ثبت شود.

مبنای مرز Server/Client از مستندات رسمی Next.js گرفته شده است. [منبع](https://nextjs.org/docs/app/getting-started/server-and-client-components)
