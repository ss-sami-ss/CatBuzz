# محیط توسعه، استقرار و عملیات

## محیط‌ها

local، staging و production دیتابیس، bucket، secret و callback جدا دارند. دادهٔ واقعی production به لپ‌تاپ و staging کپی نشود. در local از PostgreSQL/PostGIS و سرویس‌های آزمایشی استفاده شود. ابزار package manager در T02 انتخاب و lockfile commit شود.

## متغیرهای نمونه

`DATABASE_URL`، `REDIS_URL`، `AUTH_SECRET`، `APP_ORIGIN`، `STORAGE_ENDPOINT`، `STORAGE_BUCKET_PRIVATE`، `STORAGE_BUCKET_PUBLIC`، `STORAGE_ACCESS_KEY`، `STORAGE_SECRET_KEY`، `SMS_PROVIDER_KEY` یا `EMAIL_PROVIDER_KEY`، `PAYMENT_PROVIDER_SECRET`، `PAYMENT_WEBHOOK_SECRET`، `REALTIME_SECRET` و شناسهٔ عمومی نقشه در صورت نیاز.

`.env.example` مقدار واقعی ندارد. متغیر عمومی تنها برای مقداری است که انتشارش مجاز است. شروع development باید نبود سرویس اختیاری را با حالت آزمایشی آشکار مدیریت کند، نه موفقیت جعلی.

## Pipeline

PR → install از lockfile → lint/typecheck → tests مرتبط → build → migration check روی DB موقت → preview/staging → smoke → انتشار مجاز. deploy و migration برنامهٔ rollback دارند. worker و web نسخهٔ قرارداد event سازگار داشته باشند.

## Migration

backup پیش از migration پرریسک، سازگاری expand/contract برای deploy چندمرحله‌ای و حفظ قابلیت خواندن دادهٔ قدیمی. rollback کد به معنی rollback خودکار schema نیست. backfill طولانی job جدا و قابل ازسرگیری باشد. هیچ دستور حذف دیتای واقعی بدون دامنه و مجوز مشخص اجرا نشود.

## پایش

requestId، latency، نرخ خطا، slow query، طول صف، dead-letter، شکست webhook، مغایرت پرداخت، fail اعلان، storage و رشد DB ثبت شوند. لاگ حاوی محتوای خصوصی نباشد. dashboard عملیات با وضعیت مأموریت‌های فوری بدون مسئول و jobهای عقب‌افتاده وجود داشته باشد.

## Runbookهای حداقلی

| رخداد | اقدام |
|---|---|
| قطع provider پرداخت | checkout جدید محدود/غیرفعال، pendingها حفظ، reconciliation پس از اتصال |
| صف اعلان عقب‌افتاده | بررسی worker/Redis، scale یا retry کنترل‌شده، جلوگیری از duplicate |
| خطای tile/geocoder | پیام و لیست جایگزین، cache مجاز طبق قرارداد provider |
| افزایش خطای API | rollback نسخهٔ سازگار، بررسی dependency و correlation logs |
| مغایرت مالی | توقف تسویهٔ مورد اختلاف، بررسی event/provider و entry جبرانی |
| نشت داده | ابطال کلید/grant، توقف مسیر آسیب‌دیده، ثبت رخداد و رفع |
| فایل orphan | job پاکسازی فقط objectهای بدون reference پس از grace period |

## آمادگی انتشار

تصمیم‌های لازم D01/D04/D05/D10/D12/D13/D14 برای قابلیت فعال تعیین شده، مسئولان عملیاتی معرفی شده، backup restore انجام شده، QA بحرانی پاس شده، محتوا و سیاست‌های عمومی آماده و rollout محدود برنامه‌ریزی شده باشد. قابلیت درگاه/ویزیت آماده‌نشده با feature flag صریح غیرفعال بماند و در تحویل ناتمام ثبت شود.

انتشار روی سرویس بیرونی و ارسال واقعی پیام نیازمند مجوز موجود کارفرما در همان جریان کار است. این بسته به‌تنهایی مجوز خرید سرویس یا انتشار محسوب نمی‌شود.
