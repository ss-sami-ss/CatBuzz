# مدل داده و قیود

این سند مدل منطقی است. migration اجرایی و schema نهایی در T05 ساخته و آزمون می‌شوند. شناسه‌ها UUID، timestampها timestamptz، پول عدد صحیح واحد خرد همراه currency و وضعیت‌ها enum/check معتبر هستند. تاریخ نمایش فارسی در DB به‌عنوان timestamp متنی ذخیره نشود.

## جداول اصلی

| مجموعه | فیلدها و روابط ضروری |
|---|---|
| users | id، normalized_username یکتا، status، created_at؛ هویت واقعی و contact در user_private |
| user_private | user_id یکتا، first_name، last_name، verified_contact، consent_version؛ دسترسی محدود |
| professional_credentials | user_id، profession، evidence_private، verified_by، verified_at، expires_at، status |
| volunteer_capabilities | user_id، capability، availability، area، capacity؛ unique(user_id, capability) |
| groups / memberships | نام، scope، visibility؛ user/group، role، status، joined_at و left_at |
| cats | نام فعلی، sex/age_estimate با unknown، رنگ/نشانه، lifecycle، canonical_cat_id اختیاری، version |
| cat_names / name_polls / votes | تاریخچهٔ نام، پیشنهادها، close_at؛ unique(poll_id,user_id) |
| colonies / colony_memberships | نام، مراقبان، محدودهٔ عمومی؛ cat_id، colony_id، from/to و وضعیت تأیید |
| sightings | cat_id یا گزارش نامشخص، observer، observed_at، precision، private geography، public_cell_id |
| cat_relationships | مادر/بچه و رابطهٔ تأییدشده؛ جلوگیری از self-reference |
| care_logs / health_records | cat/colony، author، occurred_at، category، source، visibility؛ نسخهٔ اصلاح و تأیید پزشک |
| vaccinations / sterilizations | cat، vet، date، evidence و unknown/confirmed؛ تاریخچه حفظ شود |
| help_requests | cat/colony، reporter، need_type، urgency، status، triage_owner، deadline، version |
| missions | request، type، status، capacity، due_at، area، required_capability، version |
| assignments | mission، user، role، status، accepted_at؛ عدم تکرار assignment فعال |
| mission_updates | mission، actor، event، evidence، occurred_at؛ تاریخچه append-only |
| clinics / clinic_staff | نام، public address/geography، ساعات/timezone، services، contact consent، verified_status |
| consultations / offers | requester، cat، kind، status، accepted_vet، privacy؛ offer توسط vet معتبر |
| appointments / holds | vet، requester، time range، timezone، expiry، status؛ عدم تداخل رزرو فعال |
| fundraisers | target cat/mission/colony، owner، recipient، currency، goal_minor، status، excess_policy |
| donations / payments | donor privacy، fundraiser، amount، currency، provider ids، status، idempotency_key |
| provider_events / refunds | provider_event_id یکتا، verified_at؛ payment، amount، reason و provider_ref یکتا |
| expenses / invoices | target، payer، amount/currency، category، incurred_at، review_status؛ original/private و redacted/public |
| journal_entries / journal_lines | immutable financial event، accounts، debit/credit؛ هر journal در یک currency متوازن |
| in_kind_pledges / deliveries | item، quantity، unit، target، donor، receiver، received_at و evidence |
| media | owner، storage_key، mime، size، status، visibility، checksum، derived_from |
| posts / comments / reactions | author، optional cat، visibility، moderation؛ unique(user,post,reaction_type) |
| conversations / participants / messages | group یا private، membership؛ message client_id یکتا در conversation برای dedupe |
| adoption_listings / applications | cat، permanent/foster، status، applicant، review، decision_reason خصوصی |
| placements / followups | cat، responsible_user، start/end، handover evidence، check-in و outcome |
| lost_found_reports / ownership_claims | type، cat/media، last_seen، claimant، private proof، review/status |
| schedules / occurrences | target، owner، timezone، recurrence، local_time؛ occurrence scheduled_at/status |
| reminders / notifications / deliveries | occurrence یا event، recipient، channel، dedupe_key، status، attempts |
| counseling_requests / consents | requester، subject اختیاری، status، purpose/version، granted_at، revoked_at، evidence |
| counseling_assignments / contact_attempts | counselor، request، consent_id، attempted_at، outcome؛ هیچ نمایش عمومی |
| moderation_reports / appeals | reporter، target، category، status، moderator و result |
| audit_logs / outbox_events | actor، action، resource، request_id و redacted changes؛ event type/version و delivery |

## روابط

گربه چند مشاهده، پرونده، نیاز، رسانه و مأموریت دارد. درخواست کمک می‌تواند چند مأموریت از انواع مختلف داشته باشد. مأموریت چند جایگاه دارد؛ ظرفیت و نیاز مهارتی در پذیرش کنترل می‌شود. کلونی دارای تاریخچهٔ اعضا و چند مراقب است. تاریخچهٔ مراقبت جمعی به پرونده‌های فردی فقط با شواهد مرتبط نسبت داده شود.

پرداخت به donation یا consultation متصل است. expense مستقل از paymentِ حمایت است؛ تخصیص مصرف با expense_allocations مشخص می‌شود. یک donation می‌تواند بین چند expense همان هدف/ارز تخصیص یابد و مجموع تخصیص از مبلغ خالص قابل‌مصرف بیشتر نشود. فاکتور سند هزینه است و اثبات دریافت وجه محسوب نمی‌شود.

## قیود بحرانی DB و تراکنش

- unique برای نام کاربری نرمال‌شده، provider event، idempotency key و client message id.
- ظرفیت مأموریت با قفل سطر یا conditional update در transaction کنترل شود؛ شمارش در مرورگر معتبر نیست.
- unique(schedule_id, scheduled_at) برای occurrence و unique(event, recipient, channel) برای اعلان.
- رزرو پزشک با exclusion constraint یا قفل معادل روی بازهٔ زمانی؛ تست concurrent لازم است.
- مقدار پول مثبت، currency سازگار، refund مجموعاً حداکثر مبلغ قابل‌بازپرداخت.
- جلوگیری از رأی بعد از پایان poll در service/transaction و قید یکتای رأی در DB.
- ادغام cat منابع را به canonical id متصل و redirect نگه می‌دارد؛ هیچ سلامت یا هزینه‌ای بی‌صاحب نشود.
- version یا updated_at شرطی برای ویرایش هم‌زمان و خطای conflict.
- تغییر نقش و revoke دسترسی باید در درخواست بعدی مؤثر باشد؛ cache مجوز invalidate شود.
- حذف account نباید journal یا مدرک لازم مالی را cascade-delete کند؛ retention مصوب تعیین‌کننده است.

## مکان

private point و public cell دو field مستقل‌اند. سلول عمومی برای یک محدوده ثابت می‌ماند تا تکرار درخواست و میانگین‌گیری jitter موقعیت را آشکار نکند. برای منطقهٔ حساس سلول بزرگ‌تر یا نمایش عمومی حذف می‌شود. فاصلهٔ دقیق و ترتیب فاصله از مختصات خصوصی در API عمومی منتشر نشود.

## دادهٔ تست

seed فقط ساختگی و دارای نام «نمونه» باشد؛ 30 گربه، 5 کلونی، 4 گروه، 3 کلینیک، نقش‌های مجاز و نامجاز، مأموریت با ظرفیت کامل و اعلان شکست‌خورده. دادهٔ load test بزرگ‌تر جداگانه تولید شود. هیچ credential واقعی در seed یا commit قرار نگیرد.

## دادهٔ قدیمی و مهاجرت

هر migration روی DB خالی و نسخهٔ قبلی آزمون شود. افزودن فیلد اجباری با backfill و سپس constraint انجام شود. unknown یک حالت معتبر است. عملیات ادغام یا اصلاح مالی audit و مسیر جبران دارد. نسخهٔ schema با نسخهٔ برنامه سازگار و هنگام rollback بررسی شود.
