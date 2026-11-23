# قراردادهای API و رخداد

## قرارداد عمومی

پایه `/api/v1`، JSON و schema مشترک. endpointهای زیر قرارداد پیشنهادی برای ساخت‌اند. T06 آن‌ها را به OpenAPI و validator اجرایی تبدیل می‌کند. عملیات ایجاد 201، خواندن/ویرایش موفق 200، حذف موفق بدون body برابر 204 است. 401 برای نبود هویت، 403 برای عدم مجوز، 404 برای منبع ناموجود یا خصوصیِ غیرقابل‌افشا، 409 برای تعارض، 422 برای خطای فیلد و 429 برای محدودیت نرخ استفاده شود.

```json
{"data":{"id":"uuid"},"meta":{"requestId":"uuid","nextCursor":null}}
```

```json
{"error":{"code":"MISSION_FULL","message":"ظرفیت مأموریت تکمیل شده است","fieldErrors":{}},"requestId":"uuid"}
```

cursor پایدار، limit پیش‌فرض 20 و سقف 100؛ ترتیب دارای tie-breaker id است. bounded bbox و zoom اعتبارسنجی شوند. نام و مکان دقیق در cursor عمومی رمزگشایی‌پذیر قرار نگیرد. قرارداد تغییر breaking با نسخه و برنامهٔ مهاجرت ثبت شود.

## پیاده‌سازی اجرایی (T06، 2026-11-16)

- **منبع واحد:** schemaهای zod 4.6.7 در `src/shared/contracts` (common، errors، envelope، auth، users، cats، map، caregivers، placements). route handlerها با همین schemaها اعتبارسنجی می‌کنند و نوع‌های TypeScript از آن‌ها گرفته می‌شود.
- **OpenAPI:** سند 3.1 در `GET /api/v1/openapi.json` از همان schemaها تولید می‌شود (`src/server/http/openapi.ts`). هر عملیات `x-task` دارد و تا ساخت آن تسک فقط قرارداد است.
- **پاسخ و خطا:** `withApi`، `ok`، `parseJson` و `parseQuery` در `src/server/http/respond.ts`. خطای فیلد 422 با پیام فارسی (locale فارسی zod)، JSON خراب 400، خطای ناشناخته 500 بدون جزئیات داخلی و با requestId. پاسخ‌ها پیش‌فرض `no-store` هستند. فهرست کدها و پیام‌ها در `src/shared/contracts/errors.ts` است.
- **cursor:** فقط کلید مرتب‌سازی و id، با امضای HMAC (`CURSOR_SECRET`). cursor دست‌کاری‌شده یا متعلق به secret دیگر 422 `INVALID_CURSOR` می‌گیرد.
- **حریم خصوصی:** آزمون خودکار بررسی می‌کند که DTOهای عمومی هیچ کلید خصوصی (مکان دقیق، تلفن، نشانی، نام واقعی، فاصله و ...) ندارند و فیلد اضافهٔ کوئری حذف می‌شود. `platformVerified` فقط `false` پذیرفته می‌شود (D21).
- schema بقیهٔ endpointها همراه تسک سازندهٔ همان endpoint اضافه می‌شود.

## endpointهای اصلی

| Method / path | مجوز و قرارداد |
|---|---|
| POST /auth/challenges | contact، purpose؛ محدودیت نرخ، پیام بدون افشای وجود حساب |
| POST /auth/verify | challengeId و code؛ یک‌بارمصرف و منقضی‌شونده |
| GET/PATCH /me | پروفایل خود، فیلدهای خصوصی فقط خود فرد |
| GET /me/credentials | وضعیت صلاحیت‌های خود با شناسه، حرفه، وضعیت و تاریخ انقضا؛ پاسخ خصوصی با no-store و بدون مدرک یا شناسهٔ بازبین |
| PUT /me/capabilities | فهرست توانمندی و محدوده؛ صلاحیت vet از این مسیر فعال نشود |
| GET /map | bbox، zoom، filters؛ فقط PublicMapItem و cluster |
| GET /cats | cursor و فیلتر؛ PublicCatSummary |
| POST /cats | حساب فعال، نام اختیاری، ویژگی، mediaIds و observation |
| GET/PATCH /cats/{id} | خواندن عمومی پالایش‌شده؛ ویرایش با policy و version |
| POST /cats/{id}/sightings | observedAt، location، precision؛ محدودیت زمان/مکان معتبر |
| GET /cats/{id}/access/location | دسترسی دقیق با assignment یا grant فعال، audit و no-store |
| POST /cats/{id}/merge-requests | candidateId و reason؛ ادغام فقط ناظر مجاز |
| GET/POST /colonies | فهرست عمومی و ایجاد مجاز |
| POST /colonies/{id}/memberships | cat، from؛ بررسی نقش مراقب و نسخه |
| GET/POST /help-requests | نوع، فوریت، target و evidence |
| POST /help-requests/{id}/triage | ناظر/دامپزشک مجاز، urgency و assignment؛ audit |
| GET/POST /missions | فیلتر/ایجاد طبق policy |
| POST /missions/{id}/acceptances | version و role؛ Idempotency-Key، تراکنش ظرفیت |
| POST /missions/{id}/updates | event، evidence و version؛ transition مجاز |
| GET/POST /groups | scope و visibility |
| POST /groups/{id}/membership-requests | حساب فعال و قواعد گروه |
| GET/POST /conversations/{id}/messages | participant فعال، cursor/clientMessageId |
| GET /clinics | مختصات عمومی کلینیک و وضعیت تأیید |
| GET/POST /cats/{id}/health-records | انتشار خلاصهٔ عمومی مجاز؛ ثبت حرفه‌ای با vet credential |
| POST /uploads/intents | kind، type، size و target؛ خروجی signed URL قرنطینه |
| POST /uploads/{id}/complete | تأیید مالک و object؛ پردازش asynchronous |
| GET/POST /fundraisers | هدف، currency و recipient؛ کنترل انتشار مالی |
| POST /fundraisers/{id}/checkout | amountMinor و Idempotency-Key؛ ایجاد پرداخت pending |
| POST /payments/webhooks/{provider} | raw body، امضا و event id؛ session کاربر لازم نیست |
| GET /payments/{id} | مالک/مالی؛ وضعیت سرور |
| POST /payments/{id}/refund-requests | دلیل و مبلغ؛ policy و سقف قابل‌بازپرداخت |
| GET/POST /expenses | هدف و مبلغ و سند؛ نسخهٔ عمومی پالایش‌شده |
| POST /expenses/{id}/reviews | reviewer مستقل، نتیجه و reason |
| GET/POST /posts | feed cursor، mediaIds و target اختیاری |
| PUT/DELETE /posts/{id}/reaction | یک واکنش کاربر؛ تکرار درخواست بی‌اثر |
| GET/POST /posts/{id}/comments | متن محدود، author و moderation |
| POST /cats/{id}/name-polls | options، closeAt و صاحب اختیار انتخاب نهایی |
| PUT /name-polls/{id}/vote | optionId؛ قبل از closeAt، یک رأی جاری |
| GET/POST /consultation-requests | درخواست عمومی با دادهٔ پالایش‌شده |
| POST /consultation-requests/{id}/offers | vet تأییدشده، رایگان یا شرایط اعلام‌شده |
| POST /consultation-requests/{id}/accept-offer | requester، offerId، version؛ قبول یکی |
| POST /appointments/holds | vetId و slotId؛ expiry و جلوگیری از تداخل |
| POST /appointments/{id}/checkout | hold معتبر؛ مبلغ از سرور |
| POST /appointments/{id}/cancel | policy لغو و outcome مالی |
| GET/POST /adoption-listings | نوع دائم/موقت و cat |
| POST /adoption-listings/{id}/applications | اطلاعات خصوصی متقاضی |
| POST /ownership-claims | مدرک خصوصی، عدم انتشار تماس مدعی |
| GET/PUT /me/caregiver-profile | پروفایل نگهدارندهٔ خود؛ فیلدهای خصوصی فقط خود فرد |
| POST /me/caregiver-profile/submit | ارسال برای بررسی؛ draft → pending_review |
| PUT /me/caregiver-profile/availability | بازه‌ها، الگوی هفتگی و timezone |
| GET /caregivers | area یا bbox، from/to، kind، mode، postOp، pricing؛ فقط PublicCaregiverSummary از پروفایل published؛ فیلتر اختیاری حداقل امتیاز؛ بدون فاصلهٔ دقیق |
| GET /caregivers/{id} | پروفایل عمومی، خلاصهٔ اعتبار و متن ثابت عدم تأیید |
| GET /caregivers/{id}/reviews | نظرهای منتشرشدهٔ درخواست‌دهندگان قبلی؛ cursor؛ بدون نام واقعی |
| POST /placement-requests | catIds، caregiverId، kind، mode، from/to؛ Idempotency-Key؛ owned فقط صاحب، foster فقط نقش پرونده |
| POST /placement-requests/{id}/decision | فقط نگهدارنده؛ accept/decline، version و Idempotency-Key؛ تراکنش ظرفیت؛ 409 `CAREGIVER_CAPACITY_FULL` یا `CAT_ALREADY_PLACED` |
| POST /placement-requests/{id}/cancel | هر طرف پیش از تحویل، با reason؛ ابطال grant |
| GET /placements/{id} | فقط دو طرف، مسئول پرونده و ناظر دارای scope |
| GET /placements/{id}/contact | پس از accepted و تا پایان grant؛ نشانی و تلفن مجاز؛ no-store و audit |
| POST /placements/{id}/handover | تأیید نقش خود، یادداشت و mediaIds اختیاری؛ دو تأیید → in_care |
| GET/POST /placements/{id}/reports | ثبت فقط نگهدارنده در in_care؛ خواندن طرفین و مسئول پرونده |
| POST /placements/{id}/end | outcome (returned/adopted/transferred/terminated_early)، version؛ adopted با claim باز 409 |
| POST /placements/{id}/reviews | فقط طرفین پس از ended، یک بار تا 14 روز؛ انتشار کور |
| POST /admin/caregiver-profiles/{id}/decisions | ناظر دارای scope؛ publish/reject/suspend برای کنترل محتوا، reason و audit |
| GET/POST /schedules | recurrence، timezone، localTime و target |
| PATCH /occurrences/{id} | status، assignee و version؛ مستقل از کل سری |
| GET /notifications | کاربر جاری، cursor؛ mark-read مستقل از delivery |
| POST /counseling-requests | درخواست خود فرد یا دعوت بدون انتشار اطلاعات شخص ثالث |
| POST /counseling-requests/{id}/consents | subject احرازشده، purpose/version و انتخاب صریح |
| POST /counseling-requests/{id}/revoke-consent | ابطال فوری و لغو jobهای تماس آینده |
| POST /moderation-reports | نوع، target و شرح؛ محرمانه |
| POST /moderation-reports/{id}/decisions | ناظر دارای scope، reason و audit |

## نمونهٔ DTO عمومی نقشه

```json
{
  "id":"cat-uuid",
  "name":"نارنج",
  "publicArea":{"cellId":"public-cell","center":[51.4,35.7],"approximate":true},
  "needs":["medical"],
  "lastSeenAt":"2026-11-14T08:00:00Z",
  "thumbnailUrl":"approved-public-media-url"
}
```

مختصات بالا نمونه است. فیلد exactLocation، ownerPhone، realName و rawExif در این DTO و پاسخ HTML اولیه وجود نداشته باشند.

## Idempotency و تعارض

کلید mutation به actor، endpoint و hash بدنه scope شود. تکرار کلید با بدنهٔ یکسان نتیجهٔ قبلی می‌دهد؛ بدنهٔ متفاوت 409. مدت نگهداری کلید پرداخت بر اساس چرخهٔ provider تعیین شود. درخواست pending و retry موازی با unique constraint کنترل شوند. پذیرش و پرداخت فقط با disable کردن دکمه محافظت نمی‌شوند.

## رخدادهای دامنه

`cat.created`، `sighting.recorded`، `help_request.escalated`، `mission.accepted`، `mission.completed`، `payment.succeeded`، `refund.completed`، `expense.reviewed`، `occurrence.due`، `consent.revoked`، `message.created`، `caregiver_profile.decided`، `placement.requested`، `placement.accepted`، `placement.handed_over`، `placement.report_missing` و `placement.ended`. نشانی و تلفن در payload رخدادهای placement نیست.

## نمونهٔ DTO عمومی نگهدارنده

```json
{
  "id":"caregiver-uuid",
  "username":"sample_caregiver",
  "publicArea":{"cellId":"public-cell","label":"محلهٔ نمونه","approximate":true},
  "serviceKinds":["foster","sitting"],
  "modes":["host_home"],
  "capacity":2,
  "pricing":{"type":"free"},
  "home":{"otherPets":false,"children":false,"postOpCare":true,"medication":["oral"]},
  "trust":{"source":"user_reviews","platformVerified":false,"reviewsCount":0,"averageRating":null,"completedPlacements":0}
}
```

مقادیر نمونه‌اند. address، phone، realName، private geography و فاصلهٔ دقیق در این DTO وجود ندارند. averageRating تا رسیدن به 3 نظر null است. platformVerified همیشه false است (D21).

هر رخداد eventId، version، occurredAt، aggregateId و payload حداقلی دارد. اطلاعات تماس و شرح مشاوره در event عمومی قرار نگیرد. outbox در transaction اصلی نوشته می‌شود. webhook امضاشده ابتدا ثبت پایدار و سپس پردازش idempotent می‌شود.
