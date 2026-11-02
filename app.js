/* رصد · Rasd — maintenance request tracking for tenants, technicians and management.
   Plain JavaScript, no build step. Talks to Supabase through database functions only. */
(function () {
'use strict';

const CFG = Object.assign({ supabaseUrl: '', supabaseKey: '', orgAr: '', orgEn: '', appUrl: '', demo: false, embedded: false }, window.RASD_CONFIG || {});
const DEFAULTS = {"contractor":{"ar":"الطاؤوس","en":"Tawoos"},"targets":{"urgent":{"pickup":15,"arrive":60,"work":120},"normal":{"pickup":60,"arrive":240,"work":240}},"buildings":{"AZB":{"arrive":{"urgent":null,"normal":null},"lat":null,"lng":null}},"repeatDays":30,"issueTypes":[{"k":"water_leak","p":"urgent","ar":"تسرّب مياه أو فيضان","en":"Water leak or flooding"},{"k":"no_power","p":"urgent","ar":"انقطاع الكهرباء","en":"Power outage"},{"k":"sparks","p":"urgent","ar":"شرارة أو رائحة احتراق","en":"Sparks or burning smell"},{"k":"no_water","p":"urgent","ar":"انقطاع المياه","en":"No water supply"},{"k":"drain_overflow","p":"urgent","ar":"انسداد أو طفح المجاري","en":"Blocked or overflowing drain"},{"k":"door_lock","p":"urgent","ar":"باب لا يُقفل","en":"Door will not lock"},{"k":"lift","p":"urgent","ar":"المصعد متوقف أو عالق","en":"Lift stopped or stuck"},{"k":"ac","p":"normal","ar":"المكيف لا يعمل أو لا يبرّد","en":"AC not working or not cooling"},{"k":"lights","p":"normal","ar":"إنارة لا تعمل","en":"Lights not working"},{"k":"sockets","p":"normal","ar":"أفياش أو مفاتيح كهرباء","en":"Sockets or switches"},{"k":"heater","p":"normal","ar":"سخان الماء","en":"Water heater"},{"k":"plumbing","p":"normal","ar":"حنفية أو سيفون أو شطاف","en":"Tap, toilet flush or hand spray"},{"k":"carpentry","p":"normal","ar":"أبواب أو نوافذ أو خزائن","en":"Doors, windows or cupboards"},{"k":"pests","p":"normal","ar":"حشرات","en":"Pests"},{"k":"other","p":"normal","ar":"أخرى","en":"Other"}]};
const DEMO_UNITS = {"building":{"code":"AZB","ar":"مبنى العذيبة","en":"Azaiba Building"},"units":[{"kind":"flat","label_ar":"شقة 11","label_en":"Flat 11","token":"azb11-v6jt9x","sort":11},{"kind":"flat","label_ar":"شقة 12","label_en":"Flat 12","token":"azb12-vhbyze","sort":12},{"kind":"flat","label_ar":"شقة 13","label_en":"Flat 13","token":"azb13-bky9gm","sort":13},{"kind":"flat","label_ar":"شقة 14","label_en":"Flat 14","token":"azb14-msr63u","sort":14},{"kind":"flat","label_ar":"شقة 21","label_en":"Flat 21","token":"azb21-n7qnnu","sort":21},{"kind":"flat","label_ar":"شقة 22","label_en":"Flat 22","token":"azb22-4eu76z","sort":22},{"kind":"flat","label_ar":"شقة 23","label_en":"Flat 23","token":"azb23-rt4t62","sort":23},{"kind":"flat","label_ar":"شقة 24","label_en":"Flat 24","token":"azb24-cunkud","sort":24},{"kind":"flat","label_ar":"شقة 31","label_en":"Flat 31","token":"azb31-7zped2","sort":31},{"kind":"flat","label_ar":"شقة 32","label_en":"Flat 32","token":"azb32-sj2xbm","sort":32},{"kind":"flat","label_ar":"شقة 33","label_en":"Flat 33","token":"azb33-49c27v","sort":33},{"kind":"flat","label_ar":"شقة 34","label_en":"Flat 34","token":"azb34-sv3ah9","sort":34},{"kind":"flat","label_ar":"شقة 41","label_en":"Flat 41","token":"azb41-c3u93h","sort":41},{"kind":"flat","label_ar":"شقة 42","label_en":"Flat 42","token":"azb42-abp626","sort":42},{"kind":"flat","label_ar":"شقة 43","label_en":"Flat 43","token":"azb43-yjchw5","sort":43},{"kind":"flat","label_ar":"شقة 44","label_en":"Flat 44","token":"azb44-cnxm69","sort":44},{"kind":"flat","label_ar":"شقة 51","label_en":"Flat 51","token":"azb51-7jawz3","sort":51},{"kind":"flat","label_ar":"شقة 52","label_en":"Flat 52","token":"azb52-x8c3aq","sort":52},{"kind":"flat","label_ar":"شقة 53","label_en":"Flat 53","token":"azb53-yhc6ms","sort":53},{"kind":"flat","label_ar":"شقة 54","label_en":"Flat 54","token":"azb54-eea9wx","sort":54},{"kind":"flat","label_ar":"شقة 61","label_en":"Flat 61","token":"azb61-kz68wf","sort":61},{"kind":"flat","label_ar":"شقة 62","label_en":"Flat 62","token":"azb62-wgfyu9","sort":62},{"kind":"flat","label_ar":"شقة 63","label_en":"Flat 63","token":"azb63-f3jjhw","sort":63},{"kind":"flat","label_ar":"شقة 64","label_en":"Flat 64","token":"azb64-tst374","sort":64},{"kind":"common","label_ar":"المنطقة العامة","label_en":"Common area","token":"azbc-b8xswv","sort":100}]};
const QS = new URLSearchParams(location.search);
const DEMO = !!CFG.demo || QS.get('demo') === '1' || !(CFG.supabaseUrl && CFG.supabaseKey);
const LIVE = !DEMO && !!(CFG.supabaseUrl && CFG.supabaseKey);
const EMB = !!CFG.embedded;
const P = DEMO ? 'rasd.demo.' : 'rasd.';
const APP_URL = String(CFG.appUrl || (location.origin + location.pathname)).replace(/index\.html$/, '');
const TZ = 'Asia/Muscat';
const OFFSET = 4 * 3600e3; // Oman has no daylight saving
const VENDOR = Object.assign({ jsqr: 'vendor/jsQR.js', qrcode: 'vendor/qrcode.js' }, CFG.vendor || {});

/* ------------------------------------------------------------ storage */
const MEM = {};
const store = {
  get(k, d) {
    if (Object.prototype.hasOwnProperty.call(MEM, k)) return MEM[k];
    try { const v = localStorage.getItem(k); if (v != null) return (MEM[k] = JSON.parse(v)); } catch (e) { /* private mode */ }
    return d;
  },
  set(k, v) { MEM[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { delete MEM[k]; try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};
const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));

/* ------------------------------------------------------------ language */
let LANG = store.get('rasd.lang', null);
if (LANG !== 'ar' && LANG !== 'en') LANG = 'ar';
const langChosen = () => !!store.get('rasd.lang', null);

const L = {
ar: {
  app: 'رصد', tagline: 'متابعة أعمال الصيانة', demo_banner: 'نموذج تجريبي ببيانات افتراضية', demo_switch: 'تبديل الدور',
  lang_other: 'English', loading: 'جارٍ التحميل…', retry: 'إعادة المحاولة', back: 'رجوع', save: 'حفظ', cancel: 'إلغاء',
  close: 'إغلاق', confirm: 'تأكيد', optional: 'اختياري', min: 'د', hr: 'س', day: 'يوم', logout: 'خروج',
  role_technician: 'فني', role_supervisor: 'مسؤول الصيانة', role_admin: 'المدير',
  st_new: 'جديد', st_accepted: 'في الطريق', st_onsite: 'جارٍ الإصلاح', st_finished: 'بانتظار التوقيع', st_closed: 'مغلق', st_cancelled: 'ملغي',
  pr_urgent: 'عاجل', pr_normal: 'عادي', kind_flat: 'شقة', kind_common: 'منطقة عامة',
  land_body: 'النظام قيد التجهيز ولم يُربط بقاعدة البيانات بعد.', land_demo: 'عرض النموذج التجريبي',
  t_report: 'الإبلاغ عن مشكلة', t_report_sub: 'يصل بلاغك مباشرةً إلى فريق الصيانة، ويمكنك متابعته من هذه الصفحة.',
  t_issue: 'نوع المشكلة', t_desc: 'اشرح المشكلة', t_desc_ph: 'مثال: المكيف في غرفة النوم لا يبرّد منذ أمس',
  t_photo: 'صورة المشكلة', t_photo_btn: 'التقط صورة أو اخترها من المعرض', t_photo_change: 'تغيير الصورة',
  t_name: 'الاسم', t_phone: 'رقم الهاتف', t_phone_hint: 'ليتواصل معك الفني عند الحاجة', t_submit: 'إرسال الطلب',
  t_need_issue: 'اختر نوع المشكلة', t_need_desc: 'اكتب شرحاً للمشكلة', t_need_photo: 'أرفق صورة للمشكلة',
  t_bad_unit: 'هذا الرمز غير صالح أو تم إيقافه. تواصل مع إدارة المبنى.', t_your: 'طلباتك من هذا الجهاز',
  t_sign_now: 'وقّع وقيّم الآن', t_view: 'متابعة', t_sent_title: 'تم استلام طلبك',
  t_sent_body: 'رقم الطلب {no}. احتفظ بهذه الصفحة لمتابعة طلبك وللتوقيع بعد الإصلاح.',
  t_track_title: 'طلب رقم {no}', t_step_sent: 'تم استلام الطلب', t_step_acc: 'قبِل الفني الطلب', t_step_arr: 'وصل الفني',
  t_step_fin: 'انتهى الإصلاح', t_step_closed: 'تم الإغلاق', t_cancelled: 'تم إلغاء هذا الطلب.',
  t_confirm_title: 'أكّد انتهاء العمل', t_confirm_body: 'راجع صورة الإصلاح، ثم قيّم الخدمة ووقّع لإغلاق الطلب.',
  t_rating: 'تقييم الخدمة', t_comment: 'ملاحظة', t_signature: 'التوقيع', t_sign_here: 'وقّع هنا بإصبعك', t_clear: 'مسح',
  t_sign_submit: 'توقيع وإغلاق الطلب', t_need_rating: 'اختر التقييم', t_need_sig: 'التوقيع مطلوب',
  t_thanks: 'شكراً لك، تم إغلاق الطلب.', t_signed_onsite: 'تم التوقيع في الموقع.', t_new_req: 'إرسال طلب جديد',
  t_after_photo: 'صورة بعد الإصلاح', t_tech_note: 'ملاحظة الفني', t_not_found: 'لم نجد هذا الطلب.',
  t_staff_here: 'لديك مهمة في هذا الموقع', t_staff_arrive: 'تأكيد الوصول، طلب {no}',
  l_title: 'دخول فريق العمل', l_phone: 'رقم الهاتف', l_pin: 'الرمز السري (6 أرقام)', l_submit: 'دخول',
  l_bad: 'رقم الهاتف أو الرمز السري غير صحيح.', l_locked: 'أُوقف الدخول 15 دقيقة بعد 5 محاولات خاطئة.',
  l_forgot: 'نسيت الرمز؟ اطلب من المدير إعادة تعيينه.', l_demo: 'في النموذج التجريبي استخدم «تبديل الدور» للدخول بأي دور.',
  s_title: 'إعداد أول مرة', s_body: 'أنشئ حساب المدير. تظهر هذه الخطوة مرة واحدة فقط.', s_name: 'الاسم',
  s_pin2: 'أعد كتابة الرمز', s_mismatch: 'الرمزان غير متطابقين', s_submit: 'إنشاء الحساب',
  session_expired: 'انتهت الجلسة، سجّل الدخول من جديد.',
  n_jobs: 'المهام', n_history: 'سجلي', n_board: 'اللوحة', n_eval: 'التقييم', n_team: 'الفريق', n_qr: 'رموز QR', n_settings: 'الإعدادات',
  j_mine: 'مهامي الحالية', j_new: 'طلبات جديدة', j_none_mine: 'لا توجد مهام مفتوحة لديك.', j_none_new: 'لا توجد طلبات جديدة الآن.',
  j_alert: 'طلب جديد: {u}',
  tm_wait: 'بانتظار الاستلام', tm_way: 'زمن الوصول', tm_work: 'زمن الإصلاح', tm_sign: 'بانتظار التوقيع', tm_total: 'المدة الإجمالية',
  tm_pickup: 'زمن الاستلام', target: 'الهدف {m}', on_time: 'ضمن الوقت', late: 'متأخر',
  d_reported: 'وقت البلاغ', d_photo_before: 'صورة المشكلة', d_times: 'التوقيتات', d_log: 'سجل الأحداث',
  d_accept: 'قبول الطلب', d_accept_ok: 'تم قبول الطلب وبدأ عدّاد الوصول.',
  d_arrive: 'وصلت: امسح رمز QR في الموقع', d_arrive_manual: 'تعذّر المسح؟ سجّل الوصول يدوياً',
  d_manual_reason: 'سبب عدم المسح', d_manual_warn: 'سيظهر للإدارة أن الوصول سُجّل دون مسح الرمز.',
  d_manual_submit: 'تسجيل الوصول يدوياً', d_arrived_ok: 'تم تسجيل وصولك وبدأ عدّاد الإصلاح.',
  d_finish_title: 'إنهاء العمل', d_after_photo: 'صورة بعد الإصلاح', d_note: 'ملاحظة عن العمل',
  d_note_ph: 'مثال: تم تغيير الوصلة وتجربة التشغيل', d_finish: 'إنهاء العمل', d_need_after: 'صورة بعد الإصلاح مطلوبة',
  d_finished_ok: 'تم إنهاء العمل، بانتظار توقيع صاحب الطلب.',
  d_wait_sign: 'اطلب من صاحب الطلب مسح رمز QR في الموقع من جواله، فيظهر له الطلب ليوقّع ويقيّم.',
  d_onsite: 'التوقيع على جهازي بدلاً من ذلك', d_signer: 'اسم الموقّع', d_signer_ph: 'مثال: صاحب الشقة أو حارس المبنى',
  d_need_signer: 'اكتب اسم الموقّع', d_onsite_warn: 'سيظهر للإدارة أن التوقيع تم على جهاز الفني.',
  d_close_req: 'إغلاق الطلب', d_closed_ok: 'تم إغلاق الطلب.', d_mgr: 'إجراءات الإدارة', d_assign: 'إسناد إلى فني',
  d_reassign: 'تغيير الفني', d_assign_btn: 'إسناد', d_assigned_ok: 'تم الإسناد.', d_priority: 'التصنيف',
  d_manual_close: 'إغلاق يدوي', d_cancel_req: 'إلغاء الطلب', d_reason: 'السبب', d_reason_need: 'اكتب السبب',
  d_signoff: 'الإغلاق والتقييم', d_signed_tenant: 'وقّع صاحب الطلب من جواله', d_signed_onsite: 'وُقّع على جهاز الفني',
  d_closed_manual: 'أُغلق يدوياً: {n}', d_cancelled: 'أُلغي: {n}', d_location: 'موقع الفني عند الوصول',
  d_from_building: 'يبعد {d} عن المبنى', d_accuracy: 'الدقة ± {d}', d_map: 'عرض على الخريطة', d_print: 'طباعة التقرير',
  d_by_qr: 'بمسح الرمز', d_by_manual: 'يدوياً', d_no_techs: 'أضف فنيين من صفحة الفريق أولاً.',
  ev_submitted: 'أرسل صاحب الطلب البلاغ', ev_accepted: 'قبِل الفني الطلب', ev_assigned: 'أُسند الطلب إلى {n}',
  ev_reassigned: 'تغيّر الفني إلى {n}', ev_arrived_qr: 'وصل الفني ومسح رمز الموقع', ev_arrived_manual: 'وصل الفني (تسجيل يدوي)',
  ev_finished: 'انتهى الإصلاح', ev_signed_tenant: 'وقّع صاحب الطلب وقيّم الخدمة', ev_signed_onsite: 'توقيع على جهاز الفني: {n}',
  ev_closed_manual: 'أُغلق يدوياً', ev_cancelled: 'أُلغي الطلب', ev_priority_urgent: 'تغيّر التصنيف إلى عاجل',
  ev_priority_normal: 'تغيّر التصنيف إلى عادي',
  sc_title: 'امسح رمز QR في الموقع', sc_hint: 'وجّه الكاميرا إلى الملصق على الباب.',
  sc_no_cam: 'تعذّر تشغيل الكاميرا. اسمح للمتصفح باستخدامها، أو سجّل الوصول يدوياً.', sc_sim: 'محاكاة مسح الرمز (تجريبي)',
  sc_found: 'تمت قراءة الرمز…',
  b_open: 'المفتوحة', b_closed: 'المغلقة', b_all: 'الكل', b_search: 'بحث برقم الطلب أو الشقة أو الفني',
  b_k_new: 'جديدة', b_k_progress: 'قيد التنفيذ', b_k_sign: 'بانتظار التوقيع', b_k_late: 'متأخرة', b_k_today: 'أُغلقت اليوم',
  b_none: 'لا توجد طلبات هنا.', b_unassigned: 'لم يُسند بعد',
  e_title: 'التقييم الشهري', e_contractor: 'المقاول: {n}', e_requests: 'الطلبات', e_closed_open: '{c} مغلقة · {o} مفتوحة',
  e_arr_on: 'الوصول ضمن الوقت', e_fix_on: 'الإصلاح ضمن الوقت', e_rating: 'متوسط التقييم', e_rated: 'من {n} تقييم',
  e_avg_pickup: 'متوسط الاستلام', e_avg_arrive: 'متوسط الوصول', e_avg_work: 'متوسط الإصلاح', e_score: 'الدرجة',
  e_techs: 'الفنيون', e_jobs: 'المهام', e_manual_arr: 'وصول دون مسح: {n}', e_onsite: 'توقيع على جهاز الفني: {n}',
  e_manual_close: 'إغلاق يدوي: {n}', e_repeat: 'عطل متكرر: {n}', e_csv: 'تنزيل CSV', e_csv_copy: 'نسخ البيانات',
  e_copied: 'تم نسخ البيانات', e_print: 'طباعة', e_none: 'لا توجد طلبات في هذا الشهر.',
  e_formula: 'الدرجة = 40% الوصول ضمن الوقت + 30% الإصلاح ضمن الوقت + 30% تقييم أصحاب الطلبات. العطل المتكرر: بلاغ جديد بنفس المشكلة في نفس الموقع خلال {d} يوماً من الإغلاق.',
  e_by_priority: 'حسب التصنيف', e_late_list: 'طلبات تجاوزت الوقت المستهدف', e_cancelled: 'ملغاة: {n}',
  e_col_count: 'العدد', h_title: 'سجلي', h_month: 'هذا الشهر',
  tm_title: 'فريق العمل', tm_add: 'إضافة عضو', tm_edit: 'تعديل', tm_name: 'الاسم', tm_phone: 'رقم الهاتف', tm_role: 'الدور',
  tm_active: 'الحساب نشط', tm_inactive: 'موقوف', tm_locked: 'مقفل مؤقتاً', tm_pin: 'الرمز السري (6 أرقام)',
  tm_pin_new: 'رمز جديد (اتركه فارغاً للإبقاء على الحالي)', tm_gen: 'توليد', tm_saved: 'تم الحفظ. أعطِ {n} الرمز السري {p} ورابط الدخول.',
  tm_saved_plain: 'تم الحفظ.', tm_readonly: 'إضافة الأعضاء وتعديلهم من صلاحية المدير.', tm_share: 'رابط دخول الفريق',
  se_title: 'الإعدادات', se_contractor: 'اسم المقاول', se_targets: 'الأوقات المستهدفة بالدقائق', se_pickup: 'الاستلام',
  se_arrive: 'الوصول', se_work: 'الإصلاح', se_buildings: 'المباني', se_b_arrive: 'وقت الوصول لهذا المبنى حسب بعده عن المقر (اتركه فارغاً لاستخدام الوقت العام)',
  se_b_loc: 'موقع المبنى (لحساب بُعد الفني عند الوصول)', se_b_here: 'استخدم موقعي الحالي', se_issues: 'أنواع المشاكل وتصنيفها',
  se_add_issue: 'إضافة نوع', se_repeat: 'يُحتسب العطل متكرراً إذا تكرر خلال (يوم)', se_saved: 'تم حفظ الإعدادات.',
  se_note: 'التعديل يسري على الطلبات الجديدة، وتحتفظ الطلبات السابقة بأهدافها.', se_label_ar: 'بالعربية', se_label_en: 'بالإنجليزية',
  se_remove: 'حذف', se_loc_set: 'تم تحديد الموقع.', se_loc_fail: 'تعذّر تحديد الموقع.', se_lat: 'خط العرض', se_lng: 'خط الطول',
  q_title: 'رموز QR', q_print: 'طباعة الملصقات', q_open: 'فتح', q_copy: 'نسخ الرابط', q_copied: 'تم نسخ الرابط',
  q_add: 'إضافة موقع', q_building: 'المبنى', q_new_building: 'مبنى جديد', q_building_code: 'رمز المبنى (حروف إنجليزية)',
  q_building_ar: 'اسم المبنى بالعربية', q_building_en: 'اسم المبنى بالإنجليزية', q_kind: 'النوع', q_label_ar: 'الاسم بالعربية',
  q_label_en: 'الاسم بالإنجليزية', q_added: 'تمت الإضافة.', q_disable: 'إيقاف', q_enable: 'تفعيل',
  q_scan_ar: 'للإبلاغ عن عطل امسح الرمز', q_scan_en: 'Scan to report a maintenance problem', q_print_hint: 'اطبع على ورق A4 ثم قصّ الملصقات.',
  dm_title: 'متابعة أعمال الصيانة بالدقيقة', dm_lead: 'من بلاغ المستأجر إلى توقيعه، كل خطوة مسجّلة بوقتها، وتقييم شهري تلقائي لفنيي المقاول.',
  dm_s1: 'المستأجر يمسح رمز الشقة ويرسل البلاغ مع صورة.', dm_s2: 'الفني يقبل الطلب فيبدأ عدّاد الوصول.', dm_s3: 'يمسح الفني رمز الموقع عند وصوله، ثم يُنهي العمل بصورة.',
  dm_s4: 'المستأجر يوقّع ويقيّم، والتقييم الشهري يُحسب تلقائياً.', dm_body: 'اختر دوراً وجرّب بنفسك. البيانات افتراضية وتبقى على جهازك فقط.',
  g_next: 'الخطوة التالية', g_tech: 'ادخل بدور الفني واستلم هذا الطلب.', g_tech_btn: 'ادخل كفني',
  g_tenant: 'ارجع لدور المستأجر ليراجع صورة الإصلاح ويوقّع ويقيّم.', g_tenant_btn: 'افتح صفحة المستأجر',
  g_admin: 'شاهد الطلب كما يراه المدير: التوقيتات كاملة والتوقيع والتقييم.', g_admin_btn: 'ادخل كمدير',
  dm_tenant: 'المستأجر', dm_tenant_body: 'يمسح رمز الشقة، يرسل البلاغ مع صورة، ثم يوقّع ويقيّم بعد الإصلاح.', dm_open_unit: 'افتح صفحة الموقع',
  dm_tech: 'الفني', dm_tech_body: 'يقبل الطلب، يمسح رمز الموقع عند الوصول، ويُنهي العمل بصورة.',
  dm_sup: 'مسؤول الصيانة', dm_sup_body: 'يتابع الطلبات المفتوحة والمتأخرة ويُسند المهام.',
  dm_admin: 'المدير', dm_admin_body: 'التقييم الشهري للمقاول والفنيين، والفريق، والإعدادات، ورموز QR.',
  dm_enter: 'دخول', dm_reset: 'إعادة البيانات التجريبية', dm_reset_ok: 'أُعيدت البيانات التجريبية.',
  err_auth_required: 'انتهت الجلسة، سجّل الدخول من جديد.', err_not_allowed: 'هذا الإجراء غير متاح لك.',
  err_already_taken: 'استلم فني آخر هذا الطلب.', err_wrong_unit: 'هذا الرمز لا يخص موقع الطلب.',
  err_reason_required: 'اكتب السبب.', err_photo_required: 'الصورة مطلوبة.', err_photo_too_large: 'الصورة كبيرة جداً، اختر صورة أخرى.',
  err_description_required: 'اكتب شرحاً للمشكلة.', err_issue_required: 'اختر نوع المشكلة.', err_invalid_unit: 'رمز الموقع غير صالح.',
  err_slow_down: 'أُرسلت عدة طلبات من هذا الموقع قبل دقائق. حاول بعد قليل.', err_not_ready: 'تغيّرت حالة الطلب. حدّث الصفحة.',
  err_rating_required: 'اختر التقييم.', err_signature_required: 'التوقيع مطلوب.', err_signer_required: 'اكتب اسم الموقّع.',
  err_pin_format: 'الرمز السري 6 أرقام.', err_phone_taken: 'رقم الهاتف مسجل لعضو آخر.', err_name_required: 'اكتب الاسم.',
  err_phone_required: 'اكتب رقم هاتف صحيح.', err_already_setup: 'تم إعداد النظام مسبقاً.', err_not_self: 'لا يمكنك تغيير دورك أو إيقاف حسابك.',
  err_unit_exists: 'هذا الموقع موجود مسبقاً.', err_bad_building: 'تحقق من رمز المبنى واسمه.', err_label_required: 'اكتب اسم الموقع.',
  err_bad_settings: 'تحقق من أنواع المشاكل: لكل نوع اسم بالعربية والإنجليزية.', err_bad_technician: 'اختر فنياً.',
  err_not_found: 'غير موجود.', err_not_assigned: 'هذه المهمة لفني آخر.', err_network: 'تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة.',
  err_not_configured: 'النظام غير مربوط بقاعدة البيانات بعد.', err_image: 'تعذّر قراءة الصورة. جرّب صورة أخرى.',
  err_generic: 'حدث خطأ غير متوقع. أعد المحاولة.', of100: 'من 100',
  col_no: 'رقم الطلب', col_date: 'وقت البلاغ', col_building: 'المبنى', col_unit: 'الموقع', col_issue: 'المشكلة', col_priority: 'التصنيف', col_tech: 'الفني', col_status: 'الحالة',
  col_pickup: 'الاستلام (دقيقة)', col_arrive: 'الوصول (دقيقة)', col_arrive_t: 'هدف الوصول', col_arrive_ok: 'الوصول ضمن الوقت', col_work: 'الإصلاح (دقيقة)', col_work_t: 'هدف الإصلاح',
  col_work_ok: 'الإصلاح ضمن الوقت', col_total: 'الإجمالي (دقيقة)', col_qr: 'الوصول بمسح الرمز', col_rating: 'التقييم', col_close: 'طريقة الإغلاق',
  cm_tenant: 'توقيع صاحب الطلب', cm_onsite: 'توقيع على جهاز الفني', cm_manual: 'إغلاق يدوي'
},
en: {
  app: 'Rasd', tagline: 'Maintenance tracking', demo_banner: 'Demo with sample data', demo_switch: 'Switch role',
  lang_other: 'العربية', loading: 'Loading…', retry: 'Try again', back: 'Back', save: 'Save', cancel: 'Cancel',
  close: 'Close', confirm: 'Confirm', optional: 'optional', min: 'min', hr: 'h', day: 'd', logout: 'Sign out',
  role_technician: 'Technician', role_supervisor: 'Maintenance supervisor', role_admin: 'Admin',
  st_new: 'New', st_accepted: 'On the way', st_onsite: 'Being fixed', st_finished: 'Awaiting sign-off', st_closed: 'Closed', st_cancelled: 'Cancelled',
  pr_urgent: 'Urgent', pr_normal: 'Normal', kind_flat: 'Flat', kind_common: 'Common area',
  land_body: 'The system is being set up and is not connected to its database yet.', land_demo: 'Open the demo',
  t_report: 'Report a problem', t_report_sub: 'Your report goes straight to the maintenance team, and you can follow it on this page.',
  t_issue: 'What is the problem?', t_desc: 'Describe the problem', t_desc_ph: 'Example: the bedroom AC has not been cooling since yesterday',
  t_photo: 'Photo of the problem', t_photo_btn: 'Take a photo or choose one', t_photo_change: 'Change photo',
  t_name: 'Your name', t_phone: 'Phone number', t_phone_hint: 'So the technician can reach you if needed', t_submit: 'Send request',
  t_need_issue: 'Choose the type of problem', t_need_desc: 'Please describe the problem', t_need_photo: 'Please attach a photo of the problem',
  t_bad_unit: 'This code is not valid or has been switched off. Please contact building management.', t_your: 'Your requests from this phone',
  t_sign_now: 'Sign and rate now', t_view: 'Track', t_sent_title: 'Request received',
  t_sent_body: 'Request number {no}. Keep this page to follow your request and to sign off after the repair.',
  t_track_title: 'Request {no}', t_step_sent: 'Request received', t_step_acc: 'Technician accepted', t_step_arr: 'Technician arrived',
  t_step_fin: 'Repair finished', t_step_closed: 'Closed', t_cancelled: 'This request was cancelled.',
  t_confirm_title: 'Confirm the work is done', t_confirm_body: 'Check the photo of the repair, then rate the service and sign to close the request.',
  t_rating: 'Rate the service', t_comment: 'Comment', t_signature: 'Signature', t_sign_here: 'Sign here with your finger', t_clear: 'Clear',
  t_sign_submit: 'Sign and close request', t_need_rating: 'Choose a rating', t_need_sig: 'Your signature is required',
  t_thanks: 'Thank you. The request is closed.', t_signed_onsite: 'Signed on site.', t_new_req: 'Send a new request',
  t_after_photo: 'Photo after the repair', t_tech_note: "Technician's note", t_not_found: 'We could not find this request.',
  t_staff_here: 'You have a job at this location', t_staff_arrive: 'Confirm arrival for request {no}',
  l_title: 'Team sign-in', l_phone: 'Phone number', l_pin: 'PIN (6 digits)', l_submit: 'Sign in',
  l_bad: 'Wrong phone number or PIN.', l_locked: 'Sign-in is paused for 15 minutes after 5 wrong tries.',
  l_forgot: 'Forgot your PIN? Ask the admin to reset it.', l_demo: 'In the demo, use “Switch role” to enter as anyone.',
  s_title: 'First-time setup', s_body: 'Create the admin account. This step appears only once.', s_name: 'Name',
  s_pin2: 'Repeat the PIN', s_mismatch: 'The two PINs do not match', s_submit: 'Create account',
  session_expired: 'Your session ended. Please sign in again.',
  n_jobs: 'Jobs', n_history: 'My record', n_board: 'Board', n_eval: 'Evaluation', n_team: 'Team', n_qr: 'QR codes', n_settings: 'Settings',
  j_mine: 'My current jobs', j_new: 'New requests', j_none_mine: 'You have no open jobs.', j_none_new: 'No new requests right now.',
  j_alert: 'New request: {u}',
  tm_wait: 'Waiting for pickup', tm_way: 'Time to arrive', tm_work: 'Repair time', tm_sign: 'Awaiting sign-off', tm_total: 'Total time',
  tm_pickup: 'Pickup time', target: 'target {m}', on_time: 'On time', late: 'Late',
  d_reported: 'Reported', d_photo_before: 'Photo of the problem', d_times: 'Timings', d_log: 'Event log',
  d_accept: 'Accept request', d_accept_ok: 'Accepted. The arrival timer has started.',
  d_arrive: "I've arrived: scan the QR code on site", d_arrive_manual: "Can't scan? Record arrival manually",
  d_manual_reason: 'Why could you not scan?', d_manual_warn: 'Management will see that arrival was recorded without a scan.',
  d_manual_submit: 'Record arrival manually', d_arrived_ok: 'Arrival recorded. The repair timer has started.',
  d_finish_title: 'Finish the job', d_after_photo: 'Photo after the repair', d_note: 'Note about the work',
  d_note_ph: 'Example: replaced the hose and tested it', d_finish: 'Finish job', d_need_after: 'An after-repair photo is required',
  d_finished_ok: 'Job finished. Waiting for the requester to sign.',
  d_wait_sign: 'Ask the requester to scan the QR code on site with their phone. The request opens for them to sign and rate.',
  d_onsite: 'Sign on my phone instead', d_signer: "Signer's name", d_signer_ph: 'e.g. the tenant or the building guard',
  d_need_signer: "Enter the signer's name", d_onsite_warn: "Management will see this was signed on the technician's phone.",
  d_close_req: 'Close request', d_closed_ok: 'Request closed.', d_mgr: 'Management actions', d_assign: 'Assign to a technician',
  d_reassign: 'Change technician', d_assign_btn: 'Assign', d_assigned_ok: 'Assigned.', d_priority: 'Priority',
  d_manual_close: 'Close manually', d_cancel_req: 'Cancel request', d_reason: 'Reason', d_reason_need: 'Please give a reason',
  d_signoff: 'Sign-off and rating', d_signed_tenant: 'Signed by the requester on their phone', d_signed_onsite: "Signed on the technician's phone",
  d_closed_manual: 'Closed manually: {n}', d_cancelled: 'Cancelled: {n}', d_location: "Technician's location on arrival",
  d_from_building: '{d} from the building', d_accuracy: 'accuracy ± {d}', d_map: 'Show on map', d_print: 'Print report',
  d_by_qr: 'by QR scan', d_by_manual: 'manually', d_no_techs: 'Add technicians on the Team page first.',
  ev_submitted: 'Request sent by the requester', ev_accepted: 'Technician accepted', ev_assigned: 'Assigned to {n}',
  ev_reassigned: 'Technician changed to {n}', ev_arrived_qr: 'Technician arrived and scanned the code', ev_arrived_manual: 'Technician arrived (manual record)',
  ev_finished: 'Repair finished', ev_signed_tenant: 'Requester signed and rated', ev_signed_onsite: "Signed on the technician's phone: {n}",
  ev_closed_manual: 'Closed manually', ev_cancelled: 'Request cancelled', ev_priority_urgent: 'Priority changed to urgent',
  ev_priority_normal: 'Priority changed to normal',
  sc_title: 'Scan the QR code on site', sc_hint: 'Point the camera at the label on the door.',
  sc_no_cam: 'Could not start the camera. Allow camera access, or record arrival manually.', sc_sim: 'Simulate the scan (demo)',
  sc_found: 'Code read…',
  b_open: 'Open', b_closed: 'Closed', b_all: 'All', b_search: 'Search by number, flat or technician',
  b_k_new: 'New', b_k_progress: 'In progress', b_k_sign: 'Awaiting sign-off', b_k_late: 'Late', b_k_today: 'Closed today',
  b_none: 'No requests here.', b_unassigned: 'Not assigned yet',
  e_title: 'Monthly evaluation', e_contractor: 'Contractor: {n}', e_requests: 'Requests', e_closed_open: '{c} closed · {o} open',
  e_arr_on: 'Arrived on time', e_fix_on: 'Fixed on time', e_rating: 'Average rating', e_rated: 'from {n} ratings',
  e_avg_pickup: 'Average pickup', e_avg_arrive: 'Average arrival', e_avg_work: 'Average repair', e_score: 'Score',
  e_techs: 'Technicians', e_jobs: 'Jobs', e_manual_arr: 'Arrivals without scan: {n}', e_onsite: "Signed on tech's phone: {n}",
  e_manual_close: 'Closed manually: {n}', e_repeat: 'Repeat faults: {n}', e_csv: 'Download CSV', e_csv_copy: 'Copy data',
  e_copied: 'Data copied', e_print: 'Print', e_none: 'No requests in this month.',
  e_formula: 'Score = 40% arrival on time + 30% repair on time + 30% requester rating. A repeat fault is a new report of the same problem at the same location within {d} days of closing.',
  e_by_priority: 'By priority', e_late_list: 'Requests that missed their target', e_cancelled: 'Cancelled: {n}',
  e_col_count: 'Count', h_title: 'My record', h_month: 'This month',
  tm_title: 'Team', tm_add: 'Add member', tm_edit: 'Edit', tm_name: 'Name', tm_phone: 'Phone number', tm_role: 'Role',
  tm_active: 'Account active', tm_inactive: 'Disabled', tm_locked: 'Temporarily locked', tm_pin: 'PIN (6 digits)',
  tm_pin_new: 'New PIN (leave empty to keep the current one)', tm_gen: 'Generate', tm_saved: 'Saved. Give {n} the PIN {p} and the sign-in link.',
  tm_saved_plain: 'Saved.', tm_readonly: 'Only the admin can add or change members.', tm_share: 'Team sign-in link',
  se_title: 'Settings', se_contractor: 'Contractor name', se_targets: 'Target times in minutes', se_pickup: 'Pickup',
  se_arrive: 'Arrival', se_work: 'Repair', se_buildings: 'Buildings', se_b_arrive: 'Arrival target for this building, by its distance from base (leave empty to use the general target)',
  se_b_loc: "Building location (to measure the technician's distance on arrival)", se_b_here: 'Use my current location', se_issues: 'Problem types and priority',
  se_add_issue: 'Add type', se_repeat: 'Count a fault as repeat within (days)', se_saved: 'Settings saved.',
  se_note: 'Changes apply to new requests; earlier requests keep their targets.', se_label_ar: 'Arabic', se_label_en: 'English',
  se_remove: 'Remove', se_loc_set: 'Location set.', se_loc_fail: 'Could not get the location.', se_lat: 'Latitude', se_lng: 'Longitude',
  q_title: 'QR codes', q_print: 'Print labels', q_open: 'Open', q_copy: 'Copy link', q_copied: 'Link copied',
  q_add: 'Add location', q_building: 'Building', q_new_building: 'New building', q_building_code: 'Building code (letters)',
  q_building_ar: 'Building name in Arabic', q_building_en: 'Building name in English', q_kind: 'Type', q_label_ar: 'Name in Arabic',
  q_label_en: 'Name in English', q_added: 'Added.', q_disable: 'Switch off', q_enable: 'Switch on',
  q_scan_ar: 'للإبلاغ عن عطل امسح الرمز', q_scan_en: 'Scan to report a maintenance problem', q_print_hint: 'Print on A4 paper, then cut out the labels.',
  dm_title: 'Maintenance work, tracked to the minute', dm_lead: "From the tenant's report to their signature, every step is time-stamped, and the contractor's technicians get an automatic monthly score.",
  dm_s1: 'The tenant scans the flat code and sends the report with a photo.', dm_s2: 'The technician accepts and the arrival timer starts.', dm_s3: 'On arrival the technician scans the location code, then finishes with a photo.',
  dm_s4: 'The tenant signs and rates; the monthly score is calculated automatically.', dm_body: 'Pick a role and try it yourself. The data is sample data and stays on your device.',
  g_next: 'Next step', g_tech: 'Switch to the technician and take this request.', g_tech_btn: 'Enter as technician',
  g_tenant: 'Switch back to the tenant to check the repair photo, sign and rate.', g_tenant_btn: 'Open the tenant page',
  g_admin: 'See the request as the admin sees it: every timing, the signature and the rating.', g_admin_btn: 'Enter as admin',
  dm_tenant: 'Tenant', dm_tenant_body: 'Scans the flat code, sends the report with a photo, then signs and rates after the repair.', dm_open_unit: 'Open the location page',
  dm_tech: 'Technician', dm_tech_body: 'Accepts the request, scans the location code on arrival, and finishes with a photo.',
  dm_sup: 'Maintenance supervisor', dm_sup_body: 'Follows open and late requests and assigns jobs.',
  dm_admin: 'Admin', dm_admin_body: 'Monthly evaluation of the contractor and technicians, the team, settings and QR codes.',
  dm_enter: 'Enter', dm_reset: 'Reset demo data', dm_reset_ok: 'Demo data reset.',
  err_auth_required: 'Your session ended. Please sign in again.', err_not_allowed: 'This action is not available to you.',
  err_already_taken: 'Another technician has taken this request.', err_wrong_unit: 'This code does not belong to the request location.',
  err_reason_required: 'Please give a reason.', err_photo_required: 'A photo is required.', err_photo_too_large: 'The photo is too large. Choose another one.',
  err_description_required: 'Please describe the problem.', err_issue_required: 'Choose the type of problem.', err_invalid_unit: 'This location code is not valid.',
  err_slow_down: 'Several requests were just sent from this location. Please try again shortly.', err_not_ready: 'The request has changed. Refresh the page.',
  err_rating_required: 'Choose a rating.', err_signature_required: 'A signature is required.', err_signer_required: "Enter the signer's name.",
  err_pin_format: 'The PIN is 6 digits.', err_phone_taken: 'This phone number belongs to another member.', err_name_required: 'Enter the name.',
  err_phone_required: 'Enter a valid phone number.', err_already_setup: 'The system is already set up.', err_not_self: 'You cannot change your own role or disable yourself.',
  err_unit_exists: 'This location already exists.', err_bad_building: 'Check the building code and name.', err_label_required: 'Enter the location name.',
  err_bad_settings: 'Check the problem types: each needs an Arabic and an English name.', err_bad_technician: 'Choose a technician.',
  err_not_found: 'Not found.', err_not_assigned: 'This job belongs to another technician.', err_network: 'Could not connect. Check the internet and try again.',
  err_not_configured: 'The system is not connected to its database yet.', err_image: 'Could not read the photo. Try another one.',
  err_generic: 'Something went wrong. Please try again.', of100: 'out of 100',
  col_no: 'Request no.', col_date: 'Reported', col_building: 'Building', col_unit: 'Location', col_issue: 'Problem', col_priority: 'Priority', col_tech: 'Technician', col_status: 'Status',
  col_pickup: 'Pickup (min)', col_arrive: 'Arrival (min)', col_arrive_t: 'Arrival target', col_arrive_ok: 'Arrived on time', col_work: 'Repair (min)', col_work_t: 'Repair target',
  col_work_ok: 'Fixed on time', col_total: 'Total (min)', col_qr: 'Arrival by QR scan', col_rating: 'Rating', col_close: 'Closed by',
  cm_tenant: 'Requester signature', cm_onsite: "Signed on technician's phone", cm_manual: 'Closed manually'
}
};
function t(k, p) {
  let s = L[LANG][k];
  if (s == null) s = L.ar[k];
  if (s == null) return k;
  if (p) s = s.replace(/\{(\w+)\}/g, (m, n) => (p[n] != null ? p[n] : ''));
  return s;
}
function applyLang() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
}
function setLang(l) { LANG = l === 'en' ? 'en' : 'ar'; store.set('rasd.lang', LANG); render(); }

/* ------------------------------------------------------------ helpers */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
function D(x) {
  if (x instanceof Date) return x;
  if (typeof x === 'number') return new Date(x);
  if (!x) return new Date(NaN);
  return new Date(String(x).replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1'));
}
const ms = (a, b) => (a && b ? D(b) - D(a) : null);
function fmt(x, opts) {
  const d = D(x); if (isNaN(d)) return '';
  try { return new Intl.DateTimeFormat(LANG === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', Object.assign({ timeZone: TZ }, opts)).format(d); }
  catch (e) { return d.toLocaleString(); }
}
const fTime = x => fmt(x, { hour: '2-digit', minute: '2-digit', hour12: false });
const fDT = x => fmt(x, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const fDay = x => fmt(x, { weekday: 'short', day: 'numeric', month: 'short' });
function fDur(v) {
  if (v == null || isNaN(v)) return '—';
  const m = Math.max(0, Math.round(v / 60000));
  if (m < 60) return m + ' ' + t('min');
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 48) return h + ' ' + t('hr') + (r ? ' ' + r + ' ' + t('min') : '');
  return Math.floor(h / 24) + ' ' + t('day') + ' ' + (h % 24) + ' ' + t('hr');
}
function fClock(v) {
  const s = Math.max(0, Math.floor(v / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
}
const pct = v => (v == null ? '—' : Math.round(v * 100) + '%');
const fPhone = p => { const d = String(p || ''); return d.length === 11 && d.indexOf('968') === 0 ? '+968 ' + d.slice(3, 7) + ' ' + d.slice(7) : d; };
function km(m) { return m < 1000 ? Math.round(m) + (LANG === 'ar' ? ' م' : ' m') : (m / 1000).toFixed(1) + (LANG === 'ar' ? ' كم' : ' km'); }
function haversine(a, b, c, d) {
  const R = 6371e3, r = x => (x * Math.PI) / 180, dl = r(c - a), dg = r(d - b);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function ymNow() { const d = new Date(Date.now() + OFFSET); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
function ymShift(ym, k) { let [y, m] = ym.split('-').map(Number); m += k; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return y + '-' + String(m).padStart(2, '0'); }
function ymRange(ym) { const [y, m] = ym.split('-').map(Number); return [new Date(Date.UTC(y, m - 1, 1) - OFFSET), new Date(Date.UTC(y, m, 1) - OFFSET)]; }
function ymLabel(ym) { const [y, m] = ym.split('-').map(Number); return fmt(new Date(Date.UTC(y, m - 1, 15)), { month: 'long', year: 'numeric' }); }
function defaultEvalYm() { const d = new Date(Date.now() + OFFSET); return d.getUTCDate() <= 7 ? ymShift(ymNow(), -1) : ymNow(); }
const dayStart = () => { const n = Date.now() + OFFSET; return n - (n % 864e5) - OFFSET; };
function initials(n) { const p = String(n || '').trim().split(/\s+/); return esc(((p[0] || '')[0] || '') + ((p[1] || '')[0] || '')); }
const org = () => (LANG === 'ar' ? CFG.orgAr || CFG.orgEn : CFG.orgEn || CFG.orgAr) || '';
const uName = r => (LANG === 'ar' ? r.unit_ar || r.label_ar : r.unit_en || r.label_en);
const bName = r => (LANG === 'ar' ? r.building_ar : r.building_en);

/* ------------------------------------------------------------ icons */
const I = d => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const MARK = `<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#8B7E49"/><g fill="none" stroke="#fff" stroke-linecap="round"><path d="M20 9.5a10.5 10.5 0 1 1-10.5 10.5" stroke-width="2.4" opacity=".55"/><path d="M20 14.5a5.5 5.5 0 1 1-5.5 5.5" stroke-width="2.4"/><path d="M20 20l8.2-8.2" stroke-width="2.6"/></g><circle cx="20" cy="20" r="2.4" fill="#fff"/></svg>`;
const ICON = {
  list: I('<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'),
  chart: I('<path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/>'),
  users: I('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  qr: I('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20.5 14v.01M14 20.5h.01M17 17h4v4h-4z"/>'),
  logout: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  camera: I('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
  check: I('<path d="M20 6 9 17l-5-5"/>'),
  alert: I('<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  phone: I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
  back: I('<path d="M15 18 9 12l6-6"/>').replace('class="ic"', 'class="ic flip"'),
  prev: I('<path d="M15 18 9 12l6-6"/>').replace('class="ic"', 'class="ic flip"'),
  next: I('<path d="m9 18 6-6-6-6"/>').replace('class="ic"', 'class="ic flip"'),
  star: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9z"/></svg>',
  print: I('<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>'),
  download: I('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  copy: I('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  pin: I('<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  door: I('<path d="M3 21h18M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M14.5 12.5h.01"/>'),
  building: I('<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>'),
  wrench: I('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z"/>'),
  shield: I('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'),
  chartbig: I('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>')
};

/* ------------------------------------------------------------ state */
const S = {
  session: store.get(P + 'session', null),
  settings: null, list: null, listAt: 0, req: null, draft: {}, photos: {}, unit: null, track: null,
  seenNew: null, boardTab: 'open', q: '', route: '#/demo', justSent: null
};
const isMgr = () => !!(S.session && S.session.me.role !== 'technician');
const isAdmin = () => !!(S.session && S.session.me.role === 'admin');

/* ------------------------------------------------------------ server */
async function rpc(fn, args) {
  if (DEMO) return Demo.call(fn, args || {});
  if (!LIVE) throw new Error('not_configured');
  const headers = { 'Content-Type': 'application/json', apikey: CFG.supabaseKey };
  if (/^eyJ/.test(CFG.supabaseKey)) headers.Authorization = 'Bearer ' + CFG.supabaseKey;
  let res;
  try {
    res = await fetch(String(CFG.supabaseUrl).replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers, body: JSON.stringify(args || {}) });
  } catch (e) { throw new Error('network'); }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) { const err = new Error((data && data.message) || 'generic'); err.status = res.status; throw err; }
  return data;
}
async function srpc(fn, args) {
  if (!S.session) { signOut(true); throw new Error('auth_required'); }
  try { return await rpc(fn, Object.assign({ p_token: S.session.token }, args || {})); }
  catch (e) { if (e.message === 'auth_required') signOut(true); throw e; }
}
function errMsg(e) {
  const code = (e && e.message) || 'generic';
  const k = 'err_' + code;
  return L.ar[k] ? t(k) : t('err_generic');
}
async function settings(force) {
  if (!S.settings || force) {
    try { S.settings = (await rpc('get_settings')) || clone(DEFAULTS); }
    catch (e) { if (!S.settings) S.settings = clone(DEFAULTS); }
  }
  return S.settings;
}
const issueList = () => ((S.settings && S.settings.issueTypes) || DEFAULTS.issueTypes);
function issueLabel(k) { const i = issueList().find(x => x.k === k) || DEFAULTS.issueTypes.find(x => x.k === k); return i ? i[LANG] : k; }
function targetsFor(r) {
  const tg = ((S.settings || DEFAULTS).targets || {})[r.priority] || {};
  return { pickup: tg.pickup || (r.priority === 'urgent' ? 15 : 60), arrive: r.target_arrive, work: r.target_work };
}
function setSession(res) {
  S.session = { token: res.token, me: res.me };
  store.set(P + 'session', S.session);
  S.list = null; S.seenNew = null;
}
function signOut(expired) {
  const had = !!S.session;
  if (S.session && !expired) rpc('staff_logout', { p_token: S.session.token }).catch(() => {});
  S.session = null; S.list = null; S.seenNew = null; store.del(P + 'session');
  if (expired && had) toast(t('session_expired'), 'err');
  go(DEMO ? '/demo' : '/login');
}
function myRequests() {
  const a = store.get(P + 'mine', []);
  const limit = Date.now() - 120 * 864e5;
  return Array.isArray(a) ? a.filter(m => m && m.id && D(m.at) > limit) : [];
}
function addMine(x) { const a = myRequests().filter(m => m.id !== x.id); a.unshift(x); store.set(P + 'mine', a.slice(0, 40)); }

/* ------------------------------------------------------------ routing */
let RSEQ = 0, LAST_ROUTE = null;
const curHash = () => (EMB ? S.route : location.hash);
function go(path) {
  const h = '#' + path;
  if (EMB) { S.route = h; render(); return; }
  if (location.hash === h) render(); else location.hash = h;
}
async function render() {
  const seq = ++RSEQ;
  const alive = () => seq === RSEQ;
  stopPoll();
  applyLang();
  document.body.classList.toggle('no-demo', !DEMO);
  const parts = curHash().replace(/^#\/?/, '').split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch (e) { return s; } });
  const key = parts.join('/');
  const changed = key !== LAST_ROUTE;
  LAST_ROUTE = key;
  try {
    await dispatch(parts, alive);
  } catch (e) {
    if (alive()) page(errorBox(e), { staff: !!S.session });
  }
  if (changed && alive()) window.scrollTo(0, 0);
}
async function dispatch(p, alive) {
  const r = p[0] || '';
  if (r === 'u') return vUnit(p[1] || '', alive);
  if (r === 't') return vTrack(p[1] || '', p[2] || '', alive);
  if (DEMO && r === 'demo') return vDemo();
  if (r === 'setup') return vSetup(alive);
  if (r === 'login') return vLogin(alive);
  if (!S.session) return DEMO ? go('/demo') : go('/login');
  const role = S.session.me.role, mgr = role !== 'technician';
  switch (r) {
    case 'jobs': return mgr ? go('/board') : vJobs(alive);
    case 'history': return vHistory(alive);
    case 'board': return mgr ? vBoard(alive) : go('/jobs');
    case 'r': return vReq(p[1], alive);
    case 'eval': return mgr ? vEval(p[1], alive) : go('/history');
    case 'team': return mgr ? vTeam(alive) : go('/jobs');
    case 'settings': return role === 'admin' ? vSettings(alive) : go('/');
    case 'qr': return role === 'admin' ? (p[1] === 'print' ? vQrPrint(p[2], alive) : vQr(alive)) : go('/');
    default: return go(mgr ? '/board' : '/jobs');
  }
}

/* ------------------------------------------------------------ page frame */
function header(o) {
  const right = [`<button class="chip-btn" type="button" data-act="lang">${t('lang_other')}</button>`];
  if (o.staff && S.session) {
    right.push(`<span class="who"><b>${esc(S.session.me.name)}</b><small>${t('role_' + S.session.me.role)}</small></span>`);
    right.push(`<button class="icon-btn" type="button" data-act="logout" title="${t('logout')}" aria-label="${t('logout')}">${ICON.logout}</button>`);
  }
  const home = o.staff && S.session ? '#/' : (S.unit && o.tenant ? '#/u/' + encodeURIComponent(S.unit.token) : '#/');
  return `<header class="top"><div class="top-in"><a class="brand" href="${home}">${MARK}<span class="bt"><b>${t('app')}</b><small>${esc(org() || t('tagline'))}</small></span></a><div class="top-r">${right.join('')}</div></div></header>`;
}
function demoBar() { return DEMO ? `<div class="demo-bar"><span>${t('demo_banner')}</span><a href="#/demo">${t('demo_switch')}</a></div>` : ''; }
function navBar(active) {
  const me = S.session && S.session.me;
  if (!me) return '';
  let items = me.role === 'technician'
    ? [['jobs', ICON.list, t('n_jobs')], ['history', ICON.chart, t('n_history')]]
    : [['board', ICON.list, t('n_board')], ['eval', ICON.chart, t('n_eval')], ['team', ICON.users, t('n_team')]];
  if (me.role === 'admin') items = items.concat([['qr', ICON.qr, t('n_qr')], ['settings', ICON.gear, t('n_settings')]]);
  return `<nav class="nav" aria-label="${t('app')}">${items.map(([k, ic, l]) => `<a href="#/${k}" class="${k === active ? 'on' : ''}">${ic}<span>${l}</span></a>`).join('')}</nav>`;
}
function page(body, o) {
  o = o || {};
  const nav = o.nav ? navBar(o.nav) : '';
  $('#app').innerHTML = (o.bare ? demoBar() : demoBar() + header(o)) + nav + `<main class="main ${nav ? 'has-nav' : ''}">${body}</main>`;
  tick();
}
const navKey = () => (isMgr() ? 'board' : 'jobs');
const loadingBox = () => `<div class="loading"><div class="spin"></div><span>${t('loading')}</span></div>`;
function errorBox(e) {
  return `<div class="wrap narrow"><div class="card empty">${ICON.alert}<p>${esc(errMsg(e))}</p><button class="btn" type="button" data-act="reload">${t('retry')}</button></div></div>`;
}
function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, kind === 'err' ? 5200 : 3400);
}
function modal(html, o) {
  o = o || {};
  const w = document.createElement('div');
  w.className = 'modal';
  w.innerHTML = `<div class="modal-back" data-act="modal-close"></div><div class="modal-card ${o.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  w._onClose = o.onClose || null;
  document.body.appendChild(w);
  document.body.classList.add('modal-open');
  return w;
}
function closeModal(w) {
  w = w || $$('.modal').pop();
  if (!w) return;
  if (w._onClose) { const f = w._onClose; w._onClose = null; f(); }
  w.remove();
  if (!$('.modal')) document.body.classList.remove('modal-open');
}
async function busy(btn, fn) {
  if (btn && btn.disabled) return;
  if (btn) { btn.disabled = true; btn.classList.add('busy'); }
  try { return await fn(); }
  catch (e) { toast(errMsg(e), 'err'); }
  finally { if (btn && btn.isConnected) { btn.disabled = false; btn.classList.remove('busy'); } }
}
function setErr(f, k, msg) {
  const el = f.querySelector(`[data-err="${k}"]`);
  if (el) { el.textContent = msg; const fl = el.closest('.field'); if (fl) fl.classList.add('has-err'); }
  return false;
}
function clearErrs(f) { $$('[data-err]', f).forEach(e => (e.textContent = '')); $$('.has-err', f).forEach(e => e.classList.remove('has-err')); }
function firstErr(f) { const e = $$('.err', f).find(x => x.textContent); if (e) (e.closest('.field') || e).scrollIntoView({ block: 'center', behavior: 'smooth' }); }

/* ------------------------------------------------------------ timers & polling */
function tick() {
  const now = Date.now();
  $$('[data-tick]').forEach(el => {
    const from = D(el.dataset.tick).getTime();
    if (isNaN(from)) return;
    const c = el.querySelector('.clock') || el;
    c.textContent = fClock(now - from);
    const tg = +el.dataset.target;
    if (tg) el.classList.toggle('over', now - from > tg * 60000);
  });
}
const POLL = { id: 0, fn: null, busy: false };
function startPoll(fn, every) {
  stopPoll();
  POLL.fn = fn;
  POLL.id = setInterval(() => { if (document.visibilityState !== 'hidden') runPoll(); }, every || 20000);
}
function stopPoll() { clearInterval(POLL.id); POLL.fn = null; }
async function runPoll() {
  if (!POLL.fn || POLL.busy) return;
  POLL.busy = true;
  try { await POLL.fn(); } catch (e) { /* next round */ } finally { POLL.busy = false; }
}
let AC = null;
function unlockAudio() {
  if (AC === null) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = false; } }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
}
function chime() {
  try {
    if (AC) {
      [0, 0.22].forEach((d, i) => {
        const o = AC.createOscillator(), g = AC.createGain(), at = AC.currentTime + d;
        o.type = 'sine'; o.frequency.value = i ? 1175 : 880;
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.22, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
        o.connect(g); g.connect(AC.destination); o.start(at); o.stop(at + 0.45);
      });
    }
  } catch (e) { /* sound is optional */ }
  try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) { /* optional */ }
}
async function loadList(force) {
  if (S.list && !force && Date.now() - S.listAt < 4000) return S.list;
  const list = await srpc('staff_requests', { p_from: new Date(Date.now() - 45 * 864e5).toISOString() });
  S.list = Array.isArray(list) ? list : [];
  S.listAt = Date.now();
  const fresh = S.list.filter(r => r.status === 'new');
  if (S.seenNew) {
    const added = fresh.filter(r => !S.seenNew.has(r.id));
    if (added.length) { chime(); toast(t('j_alert', { u: uName(added[0]) + ' · ' + issueLabel(added[0].issue_type) })); }
  }
  S.seenNew = new Set(fresh.map(r => r.id));
  document.title = (fresh.length ? '(' + fresh.length + ') ' : '') + t('app');
  return S.list;
}
function listPoll(update) {
  startPoll(async () => {
    const before = JSON.stringify(S.list);
    await loadList(true);
    if (JSON.stringify(S.list) !== before) update();
  });
}

/* ------------------------------------------------------------ shared bits */
const prBadge = p => `<span class="badge ${p}">${p === 'urgent' ? ICON.alert : ''}${t('pr_' + p)}</span>`;
const statusChip = s => `<span class="status s-${s}">${t('st_' + s)}</span>`;
function phase(r) {
  const T = targetsFor(r);
  if (r.status === 'new') return { from: r.created_at, target: T.pickup, label: 'tm_wait' };
  if (r.status === 'accepted') return { from: r.accepted_at, target: r.target_arrive, label: 'tm_way' };
  if (r.status === 'onsite') return { from: r.arrived_at, target: r.target_work, label: 'tm_work' };
  if (r.status === 'finished') return { from: r.finished_at, target: 24 * 60, label: 'tm_sign' };
  return null;
}
function isLate(r) { const p = phase(r); return !!(p && p.from && Date.now() - D(p.from) > p.target * 60000); }
function timerChip(r) {
  const p = phase(r);
  if (!p) {
    if (r.status === 'closed') return `<span class="tm done">${ICON.check}<b class="num">${fDur(ms(r.created_at, r.closed_at))}</b></span>`;
    return '';
  }
  return `<span class="tm" data-tick="${esc(p.from)}" data-target="${p.target}"><small>${t(p.label)}</small><b class="clock">${fClock(Date.now() - D(p.from))}</b><small>/ ${p.target} ${t('min')}</small></span>`;
}
function byUrgency(a, b) {
  const la = isLate(a), lb = isLate(b);
  if (la !== lb) return la ? -1 : 1;
  if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1;
  return D(a.created_at) - D(b.created_at);
}
function reqCard(r) {
  return `<a class="req ${r.priority} st-${r.status} ${isLate(r) ? 'is-late' : ''}" href="#/r/${esc(r.id)}">
    <div class="req-top">${prBadge(r.priority)}<b class="no num">#${r.no}</b><span class="where">${esc(uName(r))}<small> · ${esc(bName(r))}</small></span>${statusChip(r.status)}</div>
    <div class="req-issue">${esc(issueLabel(r.issue_type))}</div>
    <div class="req-desc">${esc(r.description)}</div>
    <div class="req-foot"><span class="tech">${ICON.user}${r.technician ? esc(r.technician) : `<i>${t('b_unassigned')}</i>`}</span>${timerChip(r)}</div>
  </a>`;
}
function starsRo(n) { let h = ''; for (let i = 1; i <= 5; i++) h += `<span class="${i <= n ? '' : 'off'}">${ICON.star}</span>`; return `<span class="stars-ro" aria-label="${n}/5">${h}</span>`; }
function starsField() {
  return `<div class="field"><span class="lbl">${t('t_rating')} <i class="must">*</i></span><div class="stars" role="radiogroup" aria-label="${t('t_rating')}">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="star" data-act="star" data-v="${v}" aria-label="${v}">${ICON.star}</button>`).join('')}<input type="hidden" name="rating" value=""></div><p class="err" data-err="rating"></p></div>`;
}
function sigField(k) {
  return `<div class="field"><span class="lbl">${t('t_signature')} <i class="must">*</i></span><div class="sig-wrap"><canvas class="sig" data-sig="${k}"></canvas><span class="sig-ph">${t('t_sign_here')}</span><button type="button" class="btn sm ghost sig-clear" data-act="sig-clear" data-k="${k}">${t('t_clear')}</button></div><p class="err" data-err="sig"></p></div>`;
}
function photoField(key, id) {
  const v = S.photos[key];
  return `<label class="photo ${v ? 'has' : ''}" data-photo-box="${esc(key)}" for="${id}"><input class="vh" id="${id}" type="file" accept="image/*" data-photo="${esc(key)}">${v ? `<img src="${v}" alt=""><span class="photo-change">${ICON.camera}${t('t_photo_change')}</span>` : `<span class="photo-empty">${ICON.camera}<b>${t('t_photo_btn')}</b></span>`}</label>`;
}

/* ------------------------------------------------------------ images */
function readImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ img, url }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
    img.src = url;
  });
}
async function compressImage(file) {
  const { img, url } = await readImage(file);
  try {
    let dim = 1280, out = '';
    for (let round = 0; round < 4; round++) {
      const sc = Math.min(1, dim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * sc)), h = Math.max(1, Math.round(img.naturalHeight * sc));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      for (let q = 0.8; q >= 0.5; q -= 0.1) { out = c.toDataURL('image/jpeg', q); if (out.length < 450000) return out; }
      dim = Math.round(dim * 0.75);
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}
async function onPhoto(input) {
  const key = input.dataset.photo, file = input.files && input.files[0];
  if (!file) return;
  const box = input.closest('[data-photo-box]');
  box.classList.add('working');
  try {
    S.photos[key] = await compressImage(file);
    const fl = box.closest('.field'); if (fl) { fl.classList.remove('has-err'); const e = $('.err', fl); if (e) e.textContent = ''; }
  } catch (e) { toast(t('err_image'), 'err'); }
  if (box.isConnected) box.outerHTML = photoField(key, input.id);
}

/* ------------------------------------------------------------ signature pad */
const PADS = {};
function initPads() {
  $$('canvas[data-sig]').forEach(c => {
    const k = c.dataset.sig;
    if (PADS[k] && PADS[k].c === c) PADS[k].fit(); else PADS[k] = makePad(c);
  });
}
function makePad(c) {
  const wrap = c.parentElement;
  let ctx = c.getContext('2d'), paths = [], drawing = false, last = null, sizedW = 0;
  const style = g => { g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1F1E1A'; };
  const strokeAll = g => paths.forEach(p => { g.beginPath(); p.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1]))); if (p.length === 1) g.lineTo(p[0][0] + 0.1, p[0][1] + 0.1); g.stroke(); });
  function fit() {
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h || w === sizedW) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); style(ctx);
    sizedW = w; strokeAll(ctx);
  }
  const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c.addEventListener('pointerdown', e => {
    fit(); drawing = true;
    try { c.setPointerCapture(e.pointerId); } catch (x) { /* older browsers */ }
    const p = pos(e); paths.push([p]); last = p;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + 0.1, p[1] + 0.1); ctx.stroke();
    wrap.classList.add('inked');
    const fl = wrap.closest('.field'); if (fl) { fl.classList.remove('has-err'); const er = $('.err', fl); if (er) er.textContent = ''; }
    e.preventDefault();
  });
  c.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pos(e); paths[paths.length - 1].push(p);
    ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p;
    e.preventDefault();
  });
  const end = () => { drawing = false; };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  fit();
  return {
    c, fit,
    empty: () => paths.reduce((s, p) => s + p.length, 0) < 4,
    clear() { paths = []; ctx.clearRect(0, 0, c.width, c.height); wrap.classList.remove('inked'); },
    data() {
      const w = c.clientWidth || 600, h = c.clientHeight || 190, sc = Math.min(2, 700 / w);
      const o = document.createElement('canvas'); o.width = Math.round(w * sc); o.height = Math.round(h * sc);
      const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.setTransform(sc, 0, 0, sc, 0, 0); style(g); strokeAll(g);
      return o.toDataURL('image/png');
    }
  };
}

/* ------------------------------------------------------------ device helpers */
function getPosition(timeout) {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    let done = false;
    const fin = v => { if (!done) { done = true; resolve(v); } };
    setTimeout(() => fin(null), (timeout || 8000) + 500);
    try {
      navigator.geolocation.getCurrentPosition(
        p => fin({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
        () => fin(null), { enableHighAccuracy: true, timeout: timeout || 8000, maximumAge: 60000 });
    } catch (e) { fin(null); }
  });
}
const LOADED = {};
function loadScript(src) {
  if (!LOADED[src]) {
    LOADED[src] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = () => res(); s.onerror = () => { delete LOADED[src]; rej(new Error('network')); };
      document.head.appendChild(s);
    });
  }
  return LOADED[src];
}
function tokenFrom(text) {
  const s = String(text || '').trim();
  try {
    const u = new URL(s);
    const q = u.searchParams.get('u'); if (q) return q;
    const m = u.hash.match(/#\/u\/([^/?#]+)/); if (m) return decodeURIComponent(m[1]);
  } catch (e) { /* not a URL */ }
  return /^[a-z0-9]{2,10}-[a-z0-9]{4,12}$/i.test(s) ? s : null;
}
function openScanner(onToken, simToken) {
  const posP = getPosition(10000);
  let stream = null, timer = 0, done = false;
  const stop = () => { done = true; clearInterval(timer); if (stream) stream.getTracks().forEach(tr => tr.stop()); stream = null; };
  const m = modal(`<div class="scan"><h3>${t('sc_title')}</h3><p class="muted">${t('sc_hint')}</p><div class="scan-box"><video playsinline muted autoplay></video><div class="frame"></div></div><p class="scan-msg" aria-live="polite"></p>${DEMO && simToken ? `<button class="btn primary block" type="button" data-act="scan-sim">${ICON.qr}${t('sc_sim')}</button>` : ''}<button class="btn ghost block" type="button" data-act="modal-close">${t('cancel')}</button></div>`, { onClose: stop });
  const msg = $('.scan-msg', m);
  const finish = async token => {
    if (done) return;
    stop();
    msg.textContent = t('sc_found');
    try { await onToken(token, await posP); closeModal(m); }
    catch (e) { closeModal(m); toast(errMsg(e), 'err'); }
  };
  m._sim = () => finish(simToken);
  (async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no_camera');
      await loadScript(VENDOR.jsqr);
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (done) { stop(); return; }
      const v = $('video', m); v.srcObject = stream;
      await v.play().catch(() => {});
      const c = document.createElement('canvas'), g = c.getContext('2d', { willReadFrequently: true });
      timer = setInterval(() => {
        if (done || v.readyState < 2 || !v.videoWidth) return;
        const w = Math.min(720, v.videoWidth), h = Math.round((v.videoHeight * w) / v.videoWidth);
        c.width = w; c.height = h; g.drawImage(v, 0, 0, w, h);
        const code = window.jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
        if (code && code.data) { const tk = tokenFrom(code.data); if (tk) finish(tk); }
      }, 220);
    } catch (e) {
      if (done) return;
      $('.scan-box', m).classList.add('off');
      msg.textContent = t('sc_no_cam');
    }
  })();
}
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg); return; } catch (e) { /* fall back */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove();
    if (ok) { toast(okMsg); return; }
  } catch (e) { /* ignore */ }
  modal(`<h3>${t('q_copy')}</h3><textarea readonly rows="6" class="mono">${esc(text)}</textarea><button class="btn" type="button" data-act="modal-close">${t('close')}</button>`);
}
const unitUrl = token => APP_URL + '?u=' + encodeURIComponent(token);
const unitHref = token => (DEMO ? '#/u/' + encodeURIComponent(token) : unitUrl(token));
function qrSvg(text) {
  if (!window.qrcode) return '';
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

/* ============================================================ views: public */
function langChooser() {
  page(`<div class="wrap narrow"><div class="langpick">${MARK}<h1>رصد · Rasd</h1><p class="muted">اختر اللغة · Choose your language</p><div class="lp-btns"><button class="btn primary big" type="button" data-act="pick-lang" data-l="ar" lang="ar">العربية</button><button class="btn big" type="button" data-act="pick-lang" data-l="en" lang="en">English</button></div></div></div>`, { bare: true });
}

async function vUnit(token, alive) {
  if (!langChosen() && !S.session) return langChooser();
  page(loadingBox(), { tenant: true });
  let unit;
  try { [unit] = await Promise.all([rpc('unit_info', { p_token: token }), settings()]); }
  catch (e) { if (alive()) page(errorBox(e), { tenant: true }); return; }
  if (!alive()) return;
  if (!unit) { page(`<div class="wrap narrow"><div class="card empty">${ICON.alert}<p>${t('t_bad_unit')}</p></div></div>`, { tenant: true }); return; }
  S.unit = Object.assign({ token }, unit);
  const mine = myRequests().filter(m => m.token === token).slice(0, 6);
  const tracked = (await Promise.all(mine.map(m => rpc('track_request', { p_id: m.id, p_code: m.code }).then(r => (r ? Object.assign(r, { code: m.code }) : null)).catch(() => null))))
    .filter(r => r && !['closed', 'cancelled'].includes(r.status));
  let job = null;
  if (S.session) {
    try {
      const list = await rpc('staff_requests', { p_token: S.session.token });
      job = (list || []).find(r => r.unit_id === unit.id && r.status === 'accepted' && r.technician_id === S.session.me.id) || null;
    } catch (e) { /* not signed in on this device */ }
  }
  if (!alive()) return;
  const contact = store.get(P + 'contact', {}) || {};
  const d = S.draft[token] || (S.draft[token] = { issue: '', desc: '', cname: contact.name || '', cphone: contact.phone || '' });
  const issues = unit.issues || issueList();
  page(`<div class="wrap narrow">
    <section class="unit-card"><div class="uc-ic">${unit.kind === 'common' ? ICON.building : ICON.door}</div><div><small>${esc(bName(unit))}</small><h1>${esc(uName(unit))}</h1></div></section>
    ${job ? `<section class="card"><h3>${ICON.wrench}${t('t_staff_here')}</h3><button class="btn primary block big" type="button" data-act="unit-arrive" data-id="${esc(job.id)}">${ICON.check}${t('t_staff_arrive', { no: job.no })}</button></section>` : ''}
    ${tracked.length ? `<section class="card"><h3>${t('t_your')}</h3><div class="mine">${tracked.map(r => `<a class="mine-item ${r.status === 'finished' ? 'attn' : ''}" href="#/t/${esc(r.id)}/${esc(r.code)}"><span><b class="num">#${r.no}</b> · ${esc(issueLabel(r.issue_type))}</span>${r.status === 'finished' ? `<span class="btn sm primary">${t('t_sign_now')}</span>` : statusChip(r.status)}</a>`).join('')}</div></section>` : ''}
    <form class="card form" data-form="submit-req" novalidate>
      <div><h2>${t('t_report')}</h2><p class="muted small">${t('t_report_sub')}</p></div>
      <fieldset class="field"><legend>${t('t_issue')} <i class="must">*</i></legend>
        <div class="choices">${issues.map((i, n) => `<label class="choice"><input type="radio" name="issue" id="is-${n}" value="${esc(i.k)}" ${d.issue === i.k ? 'checked' : ''}><span>${esc(i[LANG] || i.ar)}</span></label>`).join('')}</div>
        <p class="err" data-err="issue"></p></fieldset>
      <div class="field"><label for="f-desc">${t('t_desc')} <i class="must">*</i></label><textarea id="f-desc" name="desc" rows="3" maxlength="1000" placeholder="${esc(t('t_desc_ph'))}">${esc(d.desc)}</textarea><p class="err" data-err="desc"></p></div>
      <div class="field"><span class="lbl">${t('t_photo')} <i class="must">*</i></span>${photoField('before:' + token, 'f-photo')}<p class="err" data-err="photo"></p></div>
      <div class="grid2">
        <div class="field"><label for="f-name">${t('t_name')} <span class="opt">(${t('optional')})</span></label><input id="f-name" name="cname" autocomplete="name" maxlength="80" value="${esc(d.cname)}"></div>
        <div class="field"><label for="f-phone">${t('t_phone')} <span class="opt">(${t('optional')})</span></label><input id="f-phone" name="cphone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" dir="ltr" value="${esc(d.cphone)}"><p class="hint">${t('t_phone_hint')}</p></div>
      </div>
      <button class="btn primary block big" type="submit">${t('t_submit')}</button>
    </form>
  </div>`, { tenant: true });
}

async function vTrack(id, code, alive) {
  if (!langChosen() && !S.session) return langChooser();
  page(loadingBox(), { tenant: true });
  let r;
  try { [r] = await Promise.all([rpc('track_request', { p_id: id, p_code: code }), settings()]); }
  catch (e) { if (alive()) page(errorBox(e), { tenant: true }); return; }
  if (!alive()) return;
  if (!r) { page(`<div class="wrap narrow"><div class="card empty">${ICON.alert}<p>${t('t_not_found')}</p></div></div>`, { tenant: true }); return; }
  S.track = { id, code, r };
  const mine = myRequests().find(m => m.id === id);
  if (!mine) addMine({ id, code, no: r.no, token: null, at: r.created_at });
  const token = mine && mine.token;
  if (token && !S.unit) S.unit = { token };
  const sent = S.justSent === id;
  S.justSent = null;
  page(`<div class="wrap narrow">
    ${sent ? `<div class="success">${ICON.check}<div><b>${t('t_sent_title')}</b><p>${t('t_sent_body', { no: r.no })}</p></div></div>` : ''}
    <section class="card">
      <div class="track-h"><div><small class="muted">${esc(bName(r))} · ${esc(uName(r))}</small><h1>${t('t_track_title', { no: r.no })}</h1></div>${statusChip(r.status)}</div>
      <div><p class="issue-l">${esc(issueLabel(r.issue_type))}</p><p class="muted desc">${esc(r.description)}</p></div>
      ${r.status === 'cancelled' ? `<p class="callout">${ICON.alert}${t('t_cancelled')}</p>` : stepper(r)}
    </section>
    ${DEMO && r.status === 'new' ? guide('g_tech', 'g_tech_btn', '/r/' + r.id, 's-t1') : ''}
    ${r.status === 'finished' ? tenantSignForm(r) : ''}
    ${r.status === 'closed' ? `<section class="card"><div class="success">${ICON.check}<div><b>${t('t_thanks')}</b>${r.rating ? `<p>${starsRo(r.rating)}</p>` : ''}${r.signoff_method === 'onsite' ? `<p class="muted small">${t('t_signed_onsite')}</p>` : ''}</div></div>${r.photo_after ? `<figure class="ph"><img src="${r.photo_after}" alt="" data-act="zoom"><figcaption>${t('t_after_photo')}</figcaption></figure>` : ''}</section>` : ''}
    ${DEMO && r.status === 'closed' ? guide('g_admin', 'g_admin_btn', '/r/' + r.id, 's-admin') : ''}
    ${token ? `<a class="btn block" href="#/u/${esc(encodeURIComponent(token))}">${ICON.plus}${t('t_new_req')}</a>` : ''}
  </div>`, { tenant: true });
  initPads();
  if (['new', 'accepted', 'onsite'].includes(r.status)) {
    startPoll(async () => {
      const n = await rpc('track_request', { p_id: id, p_code: code });
      if (n && n.status !== S.track.r.status) render();
    }, 20000);
  }
}
function stepper(r) {
  const steps = [['t_step_sent', r.created_at], ['t_step_acc', r.accepted_at, r.technician], ['t_step_arr', r.arrived_at], ['t_step_fin', r.finished_at], ['t_step_closed', r.closed_at]];
  const cur = steps.findIndex(s => !s[1]);
  return `<ol class="steps">${steps.map((s, i) => `<li class="${s[1] ? 'done' : i === cur ? 'now' : ''}"><span class="dot">${s[1] ? ICON.check : ''}</span><div><b>${t(s[0])}</b>${s[1] ? `<small class="num">${fDT(s[1])}${s[2] ? ' · ' + esc(s[2]) : ''}</small>` : ''}</div></li>`).join('')}</ol>`;
}
function tenantSignForm(r) {
  return `<form class="card form" data-form="tenant-sign" novalidate>
    <div><h2>${t('t_confirm_title')}</h2><p class="muted small">${t('t_confirm_body')}</p></div>
    ${r.photo_after ? `<figure class="ph"><img src="${r.photo_after}" alt="${esc(t('t_after_photo'))}" data-act="zoom"><figcaption>${t('t_after_photo')}</figcaption></figure>` : ''}
    ${r.tech_note ? `<p class="note"><b>${t('t_tech_note')}:</b> ${esc(r.tech_note)}</p>` : ''}
    ${starsField()}
    <div class="field"><label for="ts-c">${t('t_comment')} <span class="opt">(${t('optional')})</span></label><textarea id="ts-c" name="comment" rows="2" maxlength="500"></textarea></div>
    ${sigField('tenant')}
    <button class="btn primary block big" type="submit">${t('t_sign_submit')}</button>
  </form>`;
}

/* ============================================================ views: sign-in */
async function vLogin(alive) {
  if (S.session) return go('/');
  if (LIVE) {
    try { const s = await rpc('setup_status'); if (!alive()) return; if (s && !s.ready) return go('/setup'); }
    catch (e) { /* show the form anyway */ }
  }
  if (!alive()) return;
  page(`<div class="wrap narrow"><form class="card form" data-form="login" novalidate>
    <div><h1>${t('l_title')}</h1>${DEMO ? `<p class="muted small">${t('l_demo')}</p>` : ''}</div>
    <div class="field"><label for="l-phone">${t('l_phone')}</label><input id="l-phone" name="phone" type="tel" inputmode="tel" autocomplete="username" dir="ltr" required></div>
    <div class="field"><label for="l-pin">${t('l_pin')}</label><input id="l-pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="6" dir="ltr" required></div>
    <p class="err" data-err="form"></p>
    <button class="btn primary block big" type="submit">${t('l_submit')}</button>
    <p class="muted small">${t('l_forgot')}</p>
  </form></div>`);
}
async function vSetup(alive) {
  if (DEMO) return go('/demo');
  try { const s = await rpc('setup_status'); if (!alive()) return; if (s && s.ready) return go('/login'); }
  catch (e) { if (alive()) page(errorBox(e)); return; }
  page(`<div class="wrap narrow"><form class="card form" data-form="setup" novalidate>
    <div><h1>${t('s_title')}</h1><p class="muted small">${t('s_body')}</p></div>
    <div class="field"><label for="s-name">${t('s_name')}</label><input id="s-name" name="name" autocomplete="name" maxlength="80" required></div>
    <div class="field"><label for="s-phone">${t('l_phone')}</label><input id="s-phone" name="phone" type="tel" inputmode="tel" dir="ltr" required></div>
    <div class="field"><label for="s-pin">${t('l_pin')}</label><input id="s-pin" name="pin" type="password" inputmode="numeric" maxlength="6" dir="ltr" autocomplete="new-password" required></div>
    <div class="field"><label for="s-pin2">${t('s_pin2')}</label><input id="s-pin2" name="pin2" type="password" inputmode="numeric" maxlength="6" dir="ltr" autocomplete="new-password" required></div>
    <p class="err" data-err="form"></p>
    <button class="btn primary block big" type="submit">${t('s_submit')}</button>
  </form></div>`);
}

/* ============================================================ views: technician */
async function vJobs(alive) {
  page(loadingBox(), { staff: true, nav: 'jobs' });
  await settings();
  const list = await loadList();
  if (!alive()) return;
  page(`<div class="wrap wide" id="jobs">${jobsBody(list)}</div>`, { staff: true, nav: 'jobs' });
  listPoll(() => { const el = $('#jobs'); if (el) { el.innerHTML = jobsBody(S.list); tick(); } });
}
function jobsBody(list) {
  const me = S.session.me.id;
  const mine = list.filter(r => r.technician_id === me && ['accepted', 'onsite', 'finished'].includes(r.status)).sort(byUrgency);
  const fresh = list.filter(r => r.status === 'new').sort(byUrgency);
  return `<h2 class="sec">${t('j_mine')}<span class="count">${mine.length}</span></h2>
    ${mine.length ? `<div class="cards">${mine.map(reqCard).join('')}</div>` : `<p class="empty-line">${t('j_none_mine')}</p>`}
    <h2 class="sec">${t('j_new')}<span class="count">${fresh.length}</span></h2>
    ${fresh.length ? `<div class="cards">${fresh.map(reqCard).join('')}</div>` : `<p class="empty-line">${t('j_none_new')}</p>`}`;
}
async function vHistory(alive) {
  page(loadingBox(), { staff: true, nav: isMgr() ? 'board' : 'history' });
  const st = await settings();
  const ym = ymNow(), [from, to] = ymRange(ym);
  const list = await srpc('staff_requests', { p_from: from.toISOString(), p_to: to.toISOString() });
  if (!alive()) return;
  const me = S.session.me.id;
  const mineAll = list.filter(r => r.technician_id === me);
  const month = mineAll.filter(r => D(r.created_at) >= from && D(r.created_at) < to && r.status !== 'cancelled');
  const m = metrics(month, new Set());
  page(`<div class="wrap wide">
    <div class="eval-h"><div><h1>${t('h_title')}</h1><p class="muted">${ymLabel(ym)}</p></div></div>
    ${month.length ? `<section class="score-card"><div class="score-big"><small>${t('e_score')}</small><b>${m.score == null ? '—' : m.score}</b><small>${t('of100')}</small></div>${kpiGrid(m)}</section>
    <div class="cards">${month.sort((a, b) => D(b.created_at) - D(a.created_at)).map(reqCard).join('')}</div>` : `<p class="empty-line">${t('e_none')}</p>`}
    <p class="muted small">${t('e_formula', { d: st.repeatDays || 30 })}</p>
  </div>`, { staff: true, nav: 'history' });
}

/* ============================================================ views: request detail */
async function vReq(id, alive) {
  page(loadingBox(), { staff: true, nav: navKey() });
  let r, team = null;
  try {
    await settings();
    r = await srpc('staff_request', { p_id: id });
    if (isMgr()) team = await srpc('team_list').catch(() => null);
  } catch (e) { if (alive()) page(errorBox(e), { staff: true, nav: navKey() }); return; }
  if (!alive()) return;
  S.req = r;
  page(reqView(r, team), { staff: true, nav: navKey() });
  initPads();
  if (!['closed', 'cancelled'].includes(r.status)) {
    startPoll(async () => {
      const n = await srpc('staff_request', { p_id: id });
      if (n.status !== S.req.status || n.technician_id !== S.req.technician_id || n.priority !== S.req.priority) { S.list = null; render(); }
    }, 20000);
  }
}
function reqView(r, team) {
  const back = isMgr() ? 'board' : 'jobs';
  return `<div class="wrap wide">
    <a class="back no-print" href="#/${back}">${ICON.back}${t('back')}</a>
    <div class="det-h">
      <div><div class="det-tags">${prBadge(r.priority)}${statusChip(r.status)}${r.arrival_method === 'manual' ? `<span class="flag">${ICON.alert}${t('ev_arrived_manual')}</span>` : ''}</div>
        <h1><span class="num">#${r.no}</span> · ${esc(uName(r))}</h1>
        <p class="muted">${esc(bName(r))} · ${t('d_reported')} <span class="num">${fDT(r.created_at)}</span></p></div>
      ${r.status === 'closed' && !EMB ? `<button class="btn sm no-print" type="button" data-act="print">${ICON.print}${t('d_print')}</button>` : ''}
    </div>
    <div class="det-grid">
      <div class="col">
        <section class="card">
          <h3>${esc(issueLabel(r.issue_type))}</h3>
          <p class="desc">${esc(r.description)}</p>
          ${r.contact_name || r.contact_phone ? `<p class="contact">${ICON.user}<span>${esc(r.contact_name || '')}</span>${r.contact_phone ? `<a href="tel:${esc(r.contact_phone)}" dir="ltr">${ICON.phone}${esc(r.contact_phone)}</a>` : ''}</p>` : ''}
          <div class="photos">
            <figure class="ph"><img src="${r.photo_before}" alt="" data-act="zoom"><figcaption>${t('d_photo_before')}</figcaption></figure>
            ${r.photo_after ? `<figure class="ph"><img src="${r.photo_after}" alt="" data-act="zoom"><figcaption>${t('t_after_photo')}</figcaption></figure>` : ''}
          </div>
          ${r.tech_note ? `<p class="note"><b>${t('t_tech_note')}:</b> ${esc(r.tech_note)}</p>` : ''}
        </section>
        ${closeSummary(r)}
        ${locationBlock(r)}
      </div>
      <div class="col">
        ${actionPanel(r)}
        <section class="card"><h3>${ICON.clock}${t('d_times')}</h3>${timesTable(r)}</section>
        ${mgrPanel(r, team)}
        <section class="card"><h3>${t('d_log')}</h3>${eventsList(r.events || [])}</section>
      </div>
    </div>
  </div>`;
}
function bigTimer(from, target, label) {
  return `<div class="big-timer" data-tick="${esc(from)}" data-target="${target || ''}"><small>${t(label)}</small><b class="clock">${fClock(Date.now() - D(from))}</b>${target ? `<small>${t('target', { m: target + ' ' + t('min') })}</small>` : ''}</div>`;
}
function actionPanel(r) {
  const me = S.session.me, mine = r.technician_id === me.id, can = mine || isMgr();
  if (r.status === 'new' && me.role === 'technician') {
    return `<section class="card">${bigTimer(r.created_at, targetsFor(r).pickup, 'tm_wait')}<button class="btn primary block big" type="button" data-act="accept">${ICON.check}${t('d_accept')}</button></section>`;
  }
  if (r.status === 'accepted' && can) {
    return `<section class="card">${bigTimer(r.accepted_at, r.target_arrive, 'tm_way')}
      <button class="btn primary block big" type="button" data-act="scan">${ICON.qr}${t('d_arrive')}</button>
      <details class="more"><summary>${t('d_arrive_manual')}</summary>
        <form class="form" data-form="arrive-manual" novalidate><div class="field"><label for="am-n">${t('d_manual_reason')}</label><textarea id="am-n" name="note" rows="2" maxlength="300"></textarea><p class="warn-line">${ICON.alert}${t('d_manual_warn')}</p><p class="err" data-err="note"></p></div>
        <button class="btn block" type="submit">${t('d_manual_submit')}</button></form></details></section>`;
  }
  if (r.status === 'onsite' && can) {
    return `<section class="card">${bigTimer(r.arrived_at, r.target_work, 'tm_work')}
      <form class="form" data-form="finish" novalidate><h3>${t('d_finish_title')}</h3>
        <div class="field"><span class="lbl">${t('d_after_photo')} <i class="must">*</i></span>${photoField('after:' + r.id, 'fin-photo')}<p class="err" data-err="photo"></p></div>
        <div class="field"><label for="fin-n">${t('d_note')} <span class="opt">(${t('optional')})</span></label><textarea id="fin-n" name="note" rows="2" maxlength="500" placeholder="${esc(t('d_note_ph'))}"></textarea></div>
        <button class="btn primary block big" type="submit">${ICON.check}${t('d_finish')}</button></form></section>`;
  }
  if (r.status === 'finished' && can) {
    const mineReq = DEMO ? myRequests().find(x => x.id === r.id) : null;
    return `${mineReq ? guide('g_tenant', 'g_tenant_btn', '/t/' + mineReq.id + '/' + mineReq.code, '') : ''}<section class="card">${bigTimer(r.finished_at, null, 'tm_sign')}
      <p class="callout">${ICON.qr}<span>${t('d_wait_sign')}</span></p>
      <details class="more"><summary>${t('d_onsite')}</summary>
        <form class="form" data-form="onsite-sign" novalidate>
          <div class="field"><label for="os-s">${t('d_signer')} <i class="must">*</i></label><input id="os-s" name="signer" maxlength="80" placeholder="${esc(t('d_signer_ph'))}"><p class="err" data-err="signer"></p></div>
          ${starsField()}
          <div class="field"><label for="os-c">${t('t_comment')} <span class="opt">(${t('optional')})</span></label><textarea id="os-c" name="comment" rows="2" maxlength="500"></textarea></div>
          ${sigField('onsite')}
          <p class="warn-line">${ICON.alert}${t('d_onsite_warn')}</p>
          <button class="btn primary block" type="submit">${t('d_close_req')}</button>
        </form></details></section>`;
  }
  return '';
}
function timesTable(r) {
  const T = targetsFor(r), open = !['closed', 'cancelled'].includes(r.status);
  const rows = [
    ['tm_pickup', r.created_at, r.accepted_at, T.pickup, r.status === 'new', ''],
    ['tm_way', r.accepted_at, r.arrived_at, r.target_arrive, r.status === 'accepted', r.arrival_method ? t(r.arrival_method === 'qr' ? 'd_by_qr' : 'd_by_manual') : ''],
    ['tm_work', r.arrived_at, r.finished_at, r.target_work, r.status === 'onsite', ''],
    ['tm_sign', r.finished_at, r.signed_at || r.closed_at, null, r.status === 'finished', ''],
    ['tm_total', r.created_at, r.closed_at || r.cancelled_at, null, open, '']
  ];
  return `<table class="times"><tbody>${rows.map(([k, a, b, tg, live, note]) => {
    let val = '—', cls = '';
    if (a && b) { const d = ms(a, b); val = `<span class="num">${fDur(d)}</span>`; if (tg) cls = d <= tg * 60000 ? 'ok' : 'over'; }
    else if (a && live) val = `<span data-tick="${esc(a)}" data-target="${tg || ''}"><b class="clock"></b></span>`;
    const stamp = b ? `<small class="num">${fTime(a)} – ${fTime(b)}</small>` : '';
    return `<tr class="${cls}"><th>${t(k)}</th><td class="v">${val}${stamp}${note ? `<small>${esc(note)}</small>` : ''}</td><td class="tg">${tg ? t('target', { m: tg + ' ' + t('min') }) : ''}</td><td class="st">${cls === 'ok' ? ICON.check : cls === 'over' ? ICON.alert : ''}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function eventsList(evs) {
  if (!evs.length) return `<p class="muted">—</p>`;
  const inLabel = { assigned: 1, reassigned: 1, signed_onsite: 1 };
  return `<ol class="tline">${evs.map(e => `<li><time class="num">${fDT(e.at)}</time><div><b>${esc(t('ev_' + e.ev, { n: e.note || '' }))}</b>${e.actor ? `<small>${esc(e.actor)}</small>` : ''}${e.note && !inLabel[e.ev] ? `<p>${esc(e.note)}</p>` : ''}</div></li>`).join('')}</ol>`;
}
function closeSummary(r) {
  if (r.status === 'cancelled') return `<section class="card"><h3>${t('st_cancelled')}</h3><p class="warn-line">${ICON.alert}${esc(t('d_cancelled', { n: r.cancel_note || '' }))}</p></section>`;
  if (r.status !== 'closed') return '';
  return `<section class="card"><h3>${ICON.shield}${t('d_signoff')}</h3>
    ${r.signature ? `<img class="sig-img" src="${r.signature}" alt="${esc(t('t_signature'))}">` : ''}
    ${r.signoff_method ? `<p>${r.signoff_method === 'tenant' ? t('d_signed_tenant') : t('d_signed_onsite') + ' · ' + esc(r.signer_name || '')}</p>` : ''}
    ${r.rating ? `<p>${starsRo(r.rating)}</p>` : ''}
    ${r.rating_comment ? `<p class="quote">${esc(r.rating_comment)}</p>` : ''}
    ${r.close_method === 'manual' ? `<p class="warn-line">${ICON.alert}${esc(t('d_closed_manual', { n: r.close_note || '' }))}</p>` : ''}
  </section>`;
}
function locationBlock(r) {
  if (r.arrival_lat == null || r.arrival_lng == null || !isMgr()) return '';
  const b = ((S.settings || {}).buildings || {})[r.building_code] || {};
  const dist = b.lat != null && b.lng != null && b.lat !== '' ? haversine(+b.lat, +b.lng, r.arrival_lat, r.arrival_lng) : null;
  const url = `https://www.google.com/maps?q=${r.arrival_lat},${r.arrival_lng}`;
  return `<section class="card"><h3>${ICON.pin}${t('d_location')}</h3>
    <p>${dist != null ? `<b>${t('d_from_building', { d: km(dist) })}</b> · ` : ''}<span class="muted">${r.arrival_acc ? t('d_accuracy', { d: km(r.arrival_acc) }) : ''}</span></p>
    <p class="mono" dir="ltr">${(+r.arrival_lat).toFixed(5)}, ${(+r.arrival_lng).toFixed(5)}</p>
    <a href="${url}" target="_blank" rel="noopener">${t('d_map')}</a></section>`;
}
function mgrPanel(r, team) {
  if (!isMgr() || ['closed', 'cancelled'].includes(r.status)) return '';
  const techs = (team || []).filter(s => s.active && s.role === 'technician');
  return `<section class="card mgr no-print"><h3>${t('d_mgr')}</h3>
    ${techs.length ? `<form class="form" data-form="assign"><div class="field"><label for="as-s">${r.technician_id ? t('d_reassign') : t('d_assign')}</label><div class="row"><select id="as-s" name="staff">${techs.map(s => `<option value="${esc(s.id)}" ${s.id === r.technician_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><button class="btn" type="submit">${t('d_assign_btn')}</button></div></div></form>` : `<p class="muted small">${t('d_no_techs')}</p>`}
    <div class="field"><span class="lbl">${t('d_priority')}</span><div class="seg">${['urgent', 'normal'].map(p => `<button type="button" data-act="prio" data-v="${p}" class="${r.priority === p ? 'on' : ''}">${t('pr_' + p)}</button>`).join('')}</div></div>
    <div class="row">${r.status !== 'new' ? `<button class="btn sm" type="button" data-act="mclose">${t('d_manual_close')}</button>` : ''}<button class="btn sm danger" type="button" data-act="mcancel">${t('d_cancel_req')}</button></div>
  </section>`;
}
function guide(textKey, btnKey, to, role) {
  return `<section class="guide no-print"><div><small>${t('g_next')}</small><p>${t(textKey)}</p></div><button class="btn primary" type="button" data-act="guide" data-to="${esc(to)}" data-role="${esc(role || '')}">${t(btnKey)}</button></section>`;
}
function reasonModal(title, fn, danger) {
  const m = modal(`<form class="form" data-form="reason" novalidate><h3>${esc(title)}</h3><div class="field"><label for="rs-n">${t('d_reason')}</label><textarea id="rs-n" name="note" rows="3" maxlength="300"></textarea><p class="err" data-err="note"></p></div><div class="row end"><button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button type="submit" class="btn ${danger ? 'danger solid' : 'primary'}">${t('confirm')}</button></div></form>`);
  m._reason = fn;
  setTimeout(() => { const ta = $('textarea', m); if (ta) ta.focus(); }, 60);
}

/* ============================================================ views: board */
async function vBoard(alive) {
  page(loadingBox(), { staff: true, nav: 'board' });
  await settings();
  const list = await loadList();
  if (!alive()) return;
  page(`<div class="wrap wide">
    <div id="kpis">${boardKpis(list)}</div>
    <div class="toolbar"><div class="seg" id="btabs">${boardTabs()}</div><input class="search" id="b-q" type="search" placeholder="${esc(t('b_search'))}" aria-label="${esc(t('b_search'))}" value="${esc(S.q)}" data-input="q"></div>
    <div id="blist">${boardList(list)}</div>
  </div>`, { staff: true, nav: 'board' });
  listPoll(() => { const k = $('#kpis'), b = $('#blist'); if (k) k.innerHTML = boardKpis(S.list); if (b) b.innerHTML = boardList(S.list); tick(); });
}
const boardTabs = () => ['open', 'closed', 'all'].map(k => `<button type="button" data-act="btab" data-v="${k}" class="${S.boardTab === k ? 'on' : ''}">${t('b_' + k)}</button>`).join('');
function boardKpis(list) {
  const open = list.filter(r => ['new', 'accepted', 'onsite', 'finished'].includes(r.status));
  const late = open.filter(isLate).length;
  const today = list.filter(r => r.closed_at && D(r.closed_at) >= dayStart()).length;
  const k = (v, l, cls) => `<div class="kpi ${cls || ''}"><span class="v">${v}</span><span class="l">${l}</span></div>`;
  return `<div class="kpis tight">${k(open.filter(r => r.status === 'new').length, t('b_k_new'))}${k(open.filter(r => r.status === 'accepted' || r.status === 'onsite').length, t('b_k_progress'))}${k(open.filter(r => r.status === 'finished').length, t('b_k_sign'))}${k(late, t('b_k_late'), late ? 'attn bad' : '')}${k(today, t('b_k_today'))}</div>`;
}
function boardList(list) {
  const q = S.q.trim().toLowerCase();
  let rows = list.filter(r => {
    const open = ['new', 'accepted', 'onsite', 'finished'].includes(r.status);
    return S.boardTab === 'all' || (S.boardTab === 'open' ? open : !open);
  });
  if (q) rows = rows.filter(r => [r.no, r.unit_ar, r.unit_en, r.building_ar, r.building_en, r.technician, issueLabel(r.issue_type), r.description].join(' ').toLowerCase().includes(q.replace(/^#/, '')));
  rows.sort(S.boardTab === 'open' ? byUrgency : (a, b) => D(b.closed_at || b.cancelled_at || b.created_at) - D(a.closed_at || a.cancelled_at || a.created_at));
  return rows.length ? `<div class="cards">${rows.slice(0, 200).map(reqCard).join('')}</div>` : `<p class="empty-line">${t('b_none')}</p>`;
}

/* ============================================================ views: evaluation */
function metrics(rs, repeatOf) {
  const arr = rs.filter(r => r.accepted_at && r.arrived_at), fin = rs.filter(r => r.arrived_at && r.finished_at), acc = rs.filter(r => r.accepted_at);
  const rated = rs.filter(r => r.rating);
  const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const arrOn = arr.filter(r => ms(r.accepted_at, r.arrived_at) <= r.target_arrive * 60000).length;
  const fixOn = fin.filter(r => ms(r.arrived_at, r.finished_at) <= r.target_work * 60000).length;
  const m = {
    n: rs.length, closed: rs.filter(r => r.status === 'closed').length, open: rs.filter(r => !['closed', 'cancelled'].includes(r.status)).length,
    arrN: arr.length, arrOn, arrRate: arr.length ? arrOn / arr.length : null,
    fixN: fin.length, fixOn, fixRate: fin.length ? fixOn / fin.length : null,
    ratedN: rated.length, rating: avg(rated.map(r => r.rating)),
    pickup: avg(acc.map(r => ms(r.created_at, r.accepted_at))), arrive: avg(arr.map(r => ms(r.accepted_at, r.arrived_at))), work: avg(fin.map(r => ms(r.arrived_at, r.finished_at))),
    manualArr: arr.filter(r => r.arrival_method === 'manual').length, onsite: rs.filter(r => r.signoff_method === 'onsite').length,
    manualClose: rs.filter(r => r.close_method === 'manual').length, repeats: rs.filter(r => repeatOf.has(r.id)).length
  };
  const parts = [[0.4, m.arrRate], [0.3, m.fixRate], [0.3, m.rating != null ? m.rating / 5 : null]].filter(x => x[1] != null);
  const w = parts.reduce((s, x) => s + x[0], 0);
  m.score = w ? Math.round((100 * parts.reduce((s, x) => s + x[0] * x[1], 0)) / w) : null;
  return m;
}
function evaluate(list, from, to, st) {
  const rep = (st.repeatDays || 30) * 864e5;
  const month = list.filter(r => D(r.created_at) >= from && D(r.created_at) < to);
  const real = month.filter(r => r.status !== 'cancelled');
  const repeatOf = new Set();
  real.forEach(r => {
    if (!r.closed_at) return;
    const c = D(r.closed_at).getTime();
    if (list.some(x => x.id !== r.id && x.status !== 'cancelled' && x.unit_id === r.unit_id && x.issue_type === r.issue_type && D(x.created_at) > c && D(x.created_at) - c <= rep)) repeatOf.add(r.id);
  });
  const groups = {};
  real.forEach(r => { if (!r.technician_id) return; (groups[r.technician_id] = groups[r.technician_id] || { id: r.technician_id, name: r.technician, rs: [] }).rs.push(r); });
  const techs = Object.values(groups).map(g => Object.assign({ id: g.id, name: g.name }, metrics(g.rs, repeatOf)))
    .sort((a, b) => (b.score == null ? -1 : b.score) - (a.score == null ? -1 : a.score) || b.n - a.n);
  const late = real.filter(r => (r.arrived_at && ms(r.accepted_at, r.arrived_at) > r.target_arrive * 60000) || (r.finished_at && ms(r.arrived_at, r.finished_at) > r.target_work * 60000));
  return {
    month, real, repeatOf, techs, late, cancelled: month.length - real.length, all: metrics(real, repeatOf),
    pri: { urgent: metrics(real.filter(r => r.priority === 'urgent'), repeatOf), normal: metrics(real.filter(r => r.priority === 'normal'), repeatOf) }
  };
}
function lateRow(r) {
  const a = ms(r.accepted_at, r.arrived_at), w = ms(r.arrived_at, r.finished_at);
  const part = (v, tg, k) => (v == null ? '' : `<span class="${v > tg * 60000 ? 'bad' : ''}">${t(k)} ${fDur(v)} <small>/ ${tg} ${t('min')}</small></span>`);
  return `<a class="late-row" href="#/r/${esc(r.id)}"><b class="num">#${r.no}</b><span class="lr-w">${esc(uName(r))} · ${esc(r.technician || '—')}<small>${esc(issueLabel(r.issue_type))} · ${fDay(r.created_at)}</small></span><span class="lr-t">${part(a, r.target_arrive, 'tm_way')}${part(w, r.target_work, 'tm_work')}</span></a>`;
}
const scoreCls = s => (s == null ? 'none' : s >= 85 ? 'good' : s >= 70 ? 'mid' : 'low');
function kpiGrid(m) {
  const k = (v, l, s) => `<div class="kpi"><span class="v">${v}</span><span class="l">${l}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
  return `<div class="kpis">
    ${k(m.n, t('e_requests'), t('e_closed_open', { c: m.closed, o: m.open }))}
    ${k(pct(m.arrRate), t('e_arr_on'), m.arrN ? m.arrOn + ' / ' + m.arrN : '')}
    ${k(pct(m.fixRate), t('e_fix_on'), m.fixN ? m.fixOn + ' / ' + m.fixN : '')}
    ${k(m.rating == null ? '—' : m.rating.toFixed(1), t('e_rating'), m.ratedN ? t('e_rated', { n: m.ratedN }) : '')}
    ${k(fDur(m.pickup), t('e_avg_pickup'))}${k(fDur(m.arrive), t('e_avg_arrive'))}${k(fDur(m.work), t('e_avg_work'))}
  </div>`;
}
function flagsOf(m) {
  const f = [];
  if (m.manualArr) f.push(t('e_manual_arr', { n: m.manualArr }));
  if (m.onsite) f.push(t('e_onsite', { n: m.onsite }));
  if (m.manualClose) f.push(t('e_manual_close', { n: m.manualClose }));
  if (m.repeats) f.push(t('e_repeat', { n: m.repeats }));
  return f.length ? `<div class="flags">${f.map(x => `<span class="flag">${ICON.alert}${esc(x)}</span>`).join('')}</div>` : '';
}
async function vEval(ym, alive) {
  ym = /^\d{4}-\d{2}$/.test(ym || '') ? ym : defaultEvalYm();
  page(loadingBox(), { staff: true, nav: 'eval' });
  const st = await settings();
  const [from, to] = ymRange(ym);
  const until = new Date(to.getTime() + (st.repeatDays || 30) * 864e5);
  const list = await srpc('staff_requests', { p_from: from.toISOString(), p_to: until.toISOString() });
  if (!alive()) return;
  const ev = evaluate(list, from, to, st);
  S.evalData = { ym, ev };
  const cname = (st.contractor && (st.contractor[LANG] || st.contractor.ar)) || '';
  const prow = (p, m) => `<tr><th>${t('pr_' + p)}</th><td>${m.n}</td><td>${pct(m.arrRate)}</td><td>${pct(m.fixRate)}</td><td>${fDur(m.arrive)}</td><td>${fDur(m.work)}</td><td>${m.rating == null ? '—' : m.rating.toFixed(1)}</td></tr>`;
  page(`<div class="wrap wide">
    <div class="eval-h">
      <div><h1>${t('e_title')}</h1>${cname ? `<p class="muted">${esc(t('e_contractor', { n: cname }))}</p>` : ''}</div>
      <div class="month-pick no-print"><a class="icon-btn" href="#/eval/${ymShift(ym, -1)}" aria-label="-1">${ICON.prev}</a><b>${ymLabel(ym)}</b><a class="icon-btn" href="#/eval/${ymShift(ym, 1)}" aria-label="+1">${ICON.next}</a></div>
      <p class="print-only"><b>${ymLabel(ym)}</b></p>
    </div>
    ${!ev.real.length ? `<p class="empty-line">${t('e_none')}</p>` : `
    <section class="score-card"><div class="score-big"><small>${t('e_score')}</small><b>${ev.all.score == null ? '—' : ev.all.score}</b><small>${t('of100')}</small></div>${kpiGrid(ev.all)}</section>
    <section class="card"><h3>${t('e_by_priority')}</h3><div class="ptable-wrap"><table class="ptable"><thead><tr><th></th><th>${t('e_col_count')}</th><th>${t('e_arr_on')}</th><th>${t('e_fix_on')}</th><th>${t('e_avg_arrive')}</th><th>${t('e_avg_work')}</th><th>${t('e_rating')}</th></tr></thead><tbody>${prow('urgent', ev.pri.urgent)}${prow('normal', ev.pri.normal)}</tbody></table></div>
      ${flagsOf(ev.all)}${ev.cancelled ? `<p class="muted small">${t('e_cancelled', { n: ev.cancelled })}</p>` : ''}</section>
    <h2 class="sec">${t('e_techs')}<span class="count">${ev.techs.length}</span></h2>
    <div class="tech-grid">${ev.techs.map(m => `<article class="tech-card">
      <header><b>${esc(m.name || '—')}</b><span class="score ${scoreCls(m.score)}">${m.score == null ? '—' : m.score}</span></header>
      <div class="meter"><i style="width:${m.score || 0}%"></i></div>
      <dl><div><dt>${t('e_jobs')}</dt><dd>${m.n}</dd></div><div><dt>${t('e_rating')}</dt><dd>${m.rating == null ? '—' : m.rating.toFixed(1)}</dd></div>
        <div><dt>${t('e_arr_on')}</dt><dd>${pct(m.arrRate)}</dd></div><div><dt>${t('e_fix_on')}</dt><dd>${pct(m.fixRate)}</dd></div>
        <div><dt>${t('e_avg_arrive')}</dt><dd>${fDur(m.arrive)}</dd></div><div><dt>${t('e_avg_work')}</dt><dd>${fDur(m.work)}</dd></div></dl>
      ${flagsOf(m)}</article>`).join('')}</div>
    ${ev.late.length ? `<section class="card"><h3>${ICON.alert}${t('e_late_list')}<span class="count">${ev.late.length}</span></h3><div class="late-list">${ev.late.sort((a, b) => D(b.created_at) - D(a.created_at)).map(lateRow).join('')}</div></section>` : ''}
    <p class="muted small">${t('e_formula', { d: st.repeatDays || 30 })}</p>
    <div class="row no-print">${EMB ? `<button class="btn" type="button" data-act="csv">${ICON.copy}${t('e_csv_copy')}</button>` : `<button class="btn" type="button" data-act="csv">${ICON.download}${t('e_csv')}</button><button class="btn" type="button" data-act="print">${ICON.print}${t('e_print')}</button>`}</div>`}
  </div>`, { staff: true, nav: 'eval' });
}
function evalCsv() {
  const { ev, ym } = S.evalData;
  const mins = (a, b) => (a && b ? Math.round(ms(a, b) / 60000) : '');
  const head = ['no', 'date', 'building', 'unit', 'issue', 'priority', 'tech', 'status', 'pickup', 'arrive', 'arrive_t', 'arrive_ok', 'work', 'work_t', 'work_ok', 'total', 'qr', 'rating', 'close'].map(k => t('col_' + k));
  const rows = ev.month.slice().sort((a, b) => a.no - b.no).map(r => {
    const a = mins(r.accepted_at, r.arrived_at), w = mins(r.arrived_at, r.finished_at);
    return [r.no, fmt(r.created_at, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }), bName(r), uName(r), issueLabel(r.issue_type), t('pr_' + r.priority), r.technician || '', t('st_' + r.status),
      mins(r.created_at, r.accepted_at), a, r.target_arrive, a === '' ? '' : a <= r.target_arrive ? 1 : 0, w, r.target_work, w === '' ? '' : w <= r.target_work ? 1 : 0,
      mins(r.created_at, r.closed_at || r.cancelled_at), r.arrival_method ? (r.arrival_method === 'qr' ? 1 : 0) : '', r.rating || '', r.close_method === 'manual' ? t('cm_manual') : r.signoff_method ? t('cm_' + r.signoff_method) : ''];
  });
  const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return { name: 'rasd-' + ym + '.csv', text: [head].concat(rows).map(r => r.map(cell).join(',')).join('\r\n') };
}

/* ============================================================ views: team */
async function vTeam(alive) {
  page(loadingBox(), { staff: true, nav: 'team' });
  const team = await srpc('team_list');
  if (!alive()) return;
  S.team = team;
  const admin = isAdmin();
  page(`<div class="wrap">
    <div class="sec-h"><h1>${t('tm_title')}</h1>${admin ? `<button class="btn primary" type="button" data-act="staff-edit" data-id="">${ICON.plus}${t('tm_add')}</button>` : ''}</div>
    ${admin ? '' : `<p class="muted">${t('tm_readonly')}</p>`}
    <section class="card list">${team.map(s => `<div class="member ${s.active ? '' : 'off'}"><div class="av">${initials(s.name)}</div><div class="mi"><b>${esc(s.name)}</b><small>${t('role_' + s.role)} · <span dir="ltr" class="num">${esc(fPhone(s.phone))}</span>${s.active ? '' : ' · ' + t('tm_inactive')}${s.locked ? ' · ' + t('tm_locked') : ''}</small></div>${admin ? `<button class="btn sm ghost" type="button" data-act="staff-edit" data-id="${esc(s.id)}">${t('tm_edit')}</button>` : ''}</div>`).join('')}</section>
    <section class="card"><h3>${t('tm_share')}</h3><p class="mono" dir="ltr">${esc(APP_URL)}</p><div class="row"><button class="btn sm" type="button" data-act="copy" data-v="${esc(APP_URL)}">${ICON.copy}${t('q_copy')}</button></div></section>
  </div>`, { staff: true, nav: 'team' });
}
const genPin = () => { let p = ''; const a = new Uint32Array(6); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((x, i) => (a[i] = Math.random() * 1e9)); a.forEach(x => (p += x % 10)); return p; };
function staffModal(s) {
  const roles = ['technician', 'supervisor', 'admin'];
  modal(`<form class="form" data-form="staff" novalidate><input type="hidden" name="id" value="${s ? esc(s.id) : ''}">
    <h3>${s ? t('tm_edit') : t('tm_add')}</h3>
    <div class="field"><label for="st-n">${t('tm_name')}</label><input id="st-n" name="name" maxlength="80" value="${s ? esc(s.name) : ''}"></div>
    <div class="field"><label for="st-p">${t('tm_phone')}</label><input id="st-p" name="phone" type="tel" inputmode="tel" dir="ltr" value="${s ? esc(fPhone(s.phone)) : ''}"></div>
    <div class="field"><label for="st-r">${t('tm_role')}</label><select id="st-r" name="role">${roles.map(r => `<option value="${r}" ${(s ? s.role : 'technician') === r ? 'selected' : ''}>${t('role_' + r)}</option>`).join('')}</select></div>
    ${s ? `<label class="check"><input type="checkbox" name="active" ${s.active ? 'checked' : ''}> ${t('tm_active')}</label>` : ''}
    <div class="field"><label for="st-pin">${s ? t('tm_pin_new') : t('tm_pin')}</label><div class="row"><input id="st-pin" name="pin" inputmode="numeric" maxlength="6" dir="ltr" value="${s ? '' : genPin()}"><button type="button" class="btn sm" data-act="gen-pin">${t('tm_gen')}</button></div></div>
    <p class="err" data-err="form"></p>
    <div class="row end"><button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button class="btn primary" type="submit">${t('save')}</button></div>
  </form>`);
}

/* ============================================================ views: settings */
async function vSettings(alive) {
  page(loadingBox(), { staff: true, nav: 'settings' });
  const [st, units] = await Promise.all([settings(true), srpc('admin_units')]);
  if (!alive()) return;
  const blds = [];
  units.forEach(u => { if (!blds.find(b => b.code === u.building_code)) blds.push({ code: u.building_code, ar: u.building_ar, en: u.building_en }); });
  const tg = st.targets || {};
  const val = v => (v == null ? '' : esc(v));
  page(`<form class="wrap" data-form="settings" novalidate>
    <div class="sec-h"><h1>${t('se_title')}</h1><button class="btn primary" type="submit">${t('save')}</button></div>
    <section class="card"><h3>${t('se_contractor')}</h3><div class="grid2"><div class="field"><label for="c-ar">${t('se_label_ar')}</label><input id="c-ar" name="c_ar" value="${val(st.contractor && st.contractor.ar)}"></div><div class="field"><label for="c-en">${t('se_label_en')}</label><input id="c-en" name="c_en" dir="ltr" value="${val(st.contractor && st.contractor.en)}"></div></div></section>
    <section class="card"><h3>${ICON.clock}${t('se_targets')}</h3>
      <div class="ptable-wrap"><table class="tgt"><thead><tr><th></th><th>${t('se_pickup')}</th><th>${t('se_arrive')}</th><th>${t('se_work')}</th></tr></thead><tbody>
      ${['urgent', 'normal'].map(p => `<tr><th>${t('pr_' + p)}</th>${['pickup', 'arrive', 'work'].map(k => `<td><input type="number" min="1" max="10080" inputmode="numeric" name="tg_${p}_${k}" id="tg-${p}-${k}" aria-label="${t('pr_' + p)} ${t('se_' + k)}" value="${val((tg[p] || {})[k])}"></td>`).join('')}</tr>`).join('')}
      </tbody></table></div><p class="hint">${t('se_note')}</p></section>
    <section class="card"><h3>${ICON.building}${t('se_buildings')}</h3>
      ${blds.map(b => { const bs = (st.buildings || {})[b.code] || {}; const ba = bs.arrive || {}; return `<div class="bld"><b>${esc(LANG === 'ar' ? b.ar : b.en)} <span class="muted mono">${esc(b.code)}</span></b>
        <p class="hint">${t('se_b_arrive')}</p>
        <div class="grid2"><div class="field"><label for="b-${b.code}-u">${t('pr_urgent')}</label><input type="number" min="1" inputmode="numeric" id="b-${b.code}-u" name="b_${b.code}_urgent" value="${val(ba.urgent)}"></div><div class="field"><label for="b-${b.code}-n">${t('pr_normal')}</label><input type="number" min="1" inputmode="numeric" id="b-${b.code}-n" name="b_${b.code}_normal" value="${val(ba.normal)}"></div></div>
        <div class="field"><span class="lbl">${t('se_b_loc')}</span><div class="row"><input name="b_${b.code}_lat" id="b-${b.code}-lat" aria-label="${t('se_lat')}" placeholder="${t('se_lat')}" dir="ltr" value="${val(bs.lat)}"><input name="b_${b.code}_lng" id="b-${b.code}-lng" aria-label="${t('se_lng')}" placeholder="${t('se_lng')}" dir="ltr" value="${val(bs.lng)}">${EMB ? '' : `<button type="button" class="btn sm" data-act="here" data-code="${esc(b.code)}">${ICON.pin}${t('se_b_here')}</button>`}</div></div></div>`; }).join('')}
    </section>
    <section class="card"><div class="sec-h"><h3>${t('se_issues')}</h3><button type="button" class="btn sm" data-act="issue-add">${ICON.plus}${t('se_add_issue')}</button></div><div id="issues">${(st.issueTypes || []).map(issueRow).join('')}</div></section>
    <section class="card"><div class="field"><label for="se-rep">${t('se_repeat')}</label><input id="se-rep" type="number" name="repeat" min="1" max="365" value="${val(st.repeatDays || 30)}"></div></section>
    <p class="err" data-err="form"></p>
    <button class="btn primary big" type="submit">${t('save')}</button>
  </form>`, { staff: true, nav: 'settings' });
}
let ISSUE_SEQ = 0;
function issueRow(i) {
  const n = ++ISSUE_SEQ;
  return `<div class="issue-row" data-k="${esc(i.k || '')}"><input name="ia" id="ia-${n}" aria-label="${t('se_label_ar')}" placeholder="${t('se_label_ar')}" value="${esc(i.ar || '')}"><input name="ie" id="ie-${n}" aria-label="${t('se_label_en')}" placeholder="${t('se_label_en')}" dir="ltr" value="${esc(i.en || '')}"><select name="ip" id="ip-${n}" aria-label="${t('d_priority')}"><option value="urgent" ${i.p === 'urgent' ? 'selected' : ''}>${t('pr_urgent')}</option><option value="normal" ${i.p !== 'urgent' ? 'selected' : ''}>${t('pr_normal')}</option></select><button type="button" class="btn sm ghost danger" data-act="issue-del">${t('se_remove')}</button></div>`;
}

/* ============================================================ views: QR */
async function vQr(alive) {
  page(loadingBox(), { staff: true, nav: 'qr' });
  const units = await srpc('admin_units');
  await loadScript(VENDOR.qrcode).catch(() => {});
  if (!alive()) return;
  S.units = units;
  const groups = [];
  units.forEach(u => { let g = groups.find(x => x.code === u.building_code); if (!g) groups.push((g = { code: u.building_code, ar: u.building_ar, en: u.building_en, units: [] })); g.units.push(u); });
  page(`<div class="wrap wide">
    <div class="sec-h"><h1>${t('q_title')}</h1><button class="btn primary" type="button" data-act="unit-new">${ICON.plus}${t('q_add')}</button></div>
    ${groups.map(g => `<section class="card"><div class="sec-h"><h2>${esc(LANG === 'ar' ? g.ar : g.en)} <span class="count">${g.units.length}</span></h2>${EMB ? '' : `<a class="btn sm" href="#/qr/print/${esc(g.code)}">${ICON.print}${t('q_print')}</a>`}</div>
      <div class="qr-grid">${g.units.map(u => `<div class="qr-item ${u.active ? '' : 'off'}"><div class="qr">${qrSvg(unitUrl(u.token))}</div><b>${esc(LANG === 'ar' ? u.label_ar : u.label_en)}</b><small class="mono" dir="ltr">${esc(u.token)}</small>
        <div class="row"><a class="btn sm ghost" href="${esc(unitHref(u.token))}" ${DEMO ? '' : 'target="_blank" rel="noopener"'}>${t('q_open')}</a><button class="btn sm ghost" type="button" data-act="copy" data-v="${esc(unitUrl(u.token))}">${ICON.copy}</button><button class="btn sm ghost" type="button" data-act="unit-toggle" data-id="${esc(u.id)}" data-on="${u.active ? '0' : '1'}">${u.active ? t('q_disable') : t('q_enable')}</button></div></div>`).join('')}</div></section>`).join('')}
  </div>`, { staff: true, nav: 'qr' });
}
async function vQrPrint(code, alive) {
  page(loadingBox(), { staff: true, nav: 'qr' });
  const units = (await srpc('admin_units')).filter(u => u.building_code === code && u.active);
  await loadScript(VENDOR.qrcode).catch(() => {});
  if (!alive()) return;
  const cards = units.map(u => `<div class="lbl-card"><div class="lb-top">${MARK}<span>رصد · Rasd</span></div><div class="lb-qr">${qrSvg(unitUrl(u.token))}</div><div class="lb-unit">${esc(u.label_ar)} · ${esc(u.label_en)}</div><div class="lb-b">${esc(u.building_ar)} · ${esc(u.building_en)}</div><div class="lb-cta">${t('q_scan_ar')}<br>${t('q_scan_en')}</div></div>`).join('');
  page(`<div class="wrap wide"><div class="sec-h no-print"><a class="back" href="#/qr">${ICON.back}${t('back')}</a><button class="btn primary" type="button" data-act="print">${ICON.print}${t('q_print')}</button></div><p class="muted no-print">${t('q_print_hint')}</p><div class="label-sheet">${cards}</div></div>`, { staff: true, nav: 'qr' });
}
function unitModal() {
  const codes = [];
  (S.units || []).forEach(u => { if (!codes.find(c => c.code === u.building_code)) codes.push({ code: u.building_code, ar: u.building_ar, en: u.building_en }); });
  modal(`<form class="form" data-form="unit-add" novalidate><h3>${t('q_add')}</h3>
    <div class="field"><label for="ua-b">${t('q_building')}</label><select id="ua-b" name="b">${codes.map(c => `<option value="${esc(c.code)}">${esc(LANG === 'ar' ? c.ar : c.en)}</option>`).join('')}<option value="__new">${t('q_new_building')}</option></select></div>
    <div class="newb grid2" ${codes.length ? 'hidden' : ''}><div class="field"><label for="ua-c">${t('q_building_code')}</label><input id="ua-c" name="code" dir="ltr" maxlength="8" placeholder="QRM"></div><div class="field"><label for="ua-bar">${t('q_building_ar')}</label><input id="ua-bar" name="bar"></div><div class="field"><label for="ua-ben">${t('q_building_en')}</label><input id="ua-ben" name="ben" dir="ltr"></div></div>
    <div class="field"><label for="ua-k">${t('q_kind')}</label><select id="ua-k" name="kind"><option value="flat">${t('kind_flat')}</option><option value="common">${t('kind_common')}</option></select></div>
    <div class="grid2"><div class="field"><label for="ua-lar">${t('q_label_ar')}</label><input id="ua-lar" name="lar" placeholder="شقة 71"></div><div class="field"><label for="ua-len">${t('q_label_en')}</label><input id="ua-len" name="len" dir="ltr" placeholder="Flat 71"></div></div>
    <p class="err" data-err="form"></p>
    <div class="row end"><button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button class="btn primary" type="submit">${t('save')}</button></div></form>`);
  if (!codes.length) $('#ua-b').value = '__new';
}

/* ============================================================ views: demo hub */
function vDemo() {
  const db = Demo.peek();
  const techs = db.staff.filter(s => s.role === 'technician' && s.active);
  page(`<div class="wrap wide">
    <div class="demo-hero"><h1>${t('dm_title')}</h1><p class="lead">${t('dm_lead')}</p></div>
    <ol class="flow">${['dm_s1', 'dm_s2', 'dm_s3', 'dm_s4'].map(k => `<li>${t(k)}</li>`).join('')}</ol>
    <p class="muted">${t('dm_body')}</p>
    <div class="demo-grid">
      <article class="demo-role"><div class="ic-b">${ICON.door}</div><h3>${t('dm_tenant')}</h3><p>${t('dm_tenant_body')}</p>
        <div class="field"><label class="vh" for="dm-unit">${t('q_building')}</label><select id="dm-unit">${db.units.filter(u => u.active).map(u => `<option value="${esc(u.token)}" ${myRequests().some(m => m.token === u.token) ? 'selected' : ''}>${esc(LANG === 'ar' ? u.label_ar : u.label_en)} · ${esc(LANG === 'ar' ? u.building_ar : u.building_en)}</option>`).join('')}</select></div>
        <button class="btn primary" type="button" data-act="dm-unit">${t('dm_open_unit')}</button></article>
      <article class="demo-role"><div class="ic-b">${ICON.wrench}</div><h3>${t('dm_tech')}</h3><p>${t('dm_tech_body')}</p>
        <div class="row">${techs.map(s => `<button class="btn" type="button" data-act="dm-login" data-id="${esc(s.id)}">${esc(s.full_name)}</button>`).join('')}</div></article>
      <article class="demo-role"><div class="ic-b">${ICON.list}</div><h3>${t('dm_sup')}</h3><p>${t('dm_sup_body')}</p><button class="btn primary" type="button" data-act="dm-login" data-id="s-sup">${t('dm_enter')}</button></article>
      <article class="demo-role"><div class="ic-b">${ICON.chartbig}</div><h3>${t('dm_admin')}</h3><p>${t('dm_admin_body')}</p><button class="btn primary" type="button" data-act="dm-login" data-id="s-admin">${t('dm_enter')}</button></article>
    </div>
    <div class="row"><button class="btn ghost" type="button" data-act="dm-reset">${t('dm_reset')}</button></div>
  </div>`, { staff: !!S.session });
}

/* ============================================================ actions */
const ACT = {
  lang: () => setLang(LANG === 'ar' ? 'en' : 'ar'),
  'pick-lang': el => setLang(el.dataset.l),
  reload: () => render(),
  logout: () => signOut(false),
  'modal-close': el => closeModal(el.closest('.modal')),
  zoom: el => modal(`<img class="zoom" src="${el.getAttribute('src')}" alt=""><button class="btn" type="button" data-act="modal-close">${t('close')}</button>`, { wide: true }),
  star: el => {
    const box = el.closest('.stars'), v = +el.dataset.v;
    $('input', box).value = v;
    $$('.star', box).forEach(s => s.classList.toggle('on', +s.dataset.v <= v));
    const fl = box.closest('.field'); fl.classList.remove('has-err'); $('.err', fl).textContent = '';
  },
  'sig-clear': el => { const p = PADS[el.dataset.k]; if (p) p.clear(); },
  print: () => { try { window.print(); } catch (e) { /* blocked */ } },
  copy: el => copyText(el.dataset.v, t('q_copied')),
  accept: el => busy(el, async () => { await srpc('tech_accept', { p_id: S.req.id }); toast(t('d_accept_ok')); S.list = null; render(); }),
  scan: () => openScanner(async (token, pos) => {
    await srpc('tech_arrive', { p_id: S.req.id, p_unit_token: token, p_lat: pos ? pos.lat : null, p_lng: pos ? pos.lng : null, p_acc: pos ? pos.acc : null });
    toast(t('d_arrived_ok')); S.list = null; render();
  }, S.req && S.req._token),
  'scan-sim': el => { const m = el.closest('.modal'); if (m && m._sim) m._sim(); },
  'unit-arrive': el => busy(el, async () => {
    const pos = await getPosition(6000);
    await rpc('tech_arrive', { p_token: S.session.token, p_id: el.dataset.id, p_unit_token: S.unit.token, p_lat: pos ? pos.lat : null, p_lng: pos ? pos.lng : null, p_acc: pos ? pos.acc : null });
    toast(t('d_arrived_ok')); S.list = null; go('/r/' + el.dataset.id);
  }),
  prio: el => { if (el.classList.contains('on')) return; busy(el, async () => { await srpc('mgr_priority', { p_id: S.req.id, p_priority: el.dataset.v }); S.list = null; render(); }); },
  mclose: () => reasonModal(t('d_manual_close'), async note => { await srpc('mgr_close', { p_id: S.req.id, p_note: note }); toast(t('d_closed_ok')); S.list = null; render(); }),
  mcancel: () => reasonModal(t('d_cancel_req'), async note => { await srpc('mgr_cancel', { p_id: S.req.id, p_note: note }); S.list = null; render(); }, true),
  btab: el => { S.boardTab = el.dataset.v; $('#btabs').innerHTML = boardTabs(); $('#blist').innerHTML = boardList(S.list || []); tick(); },
  csv: () => {
    const f = evalCsv();
    if (EMB) { copyText(f.text, t('e_copied')); return; }
    const blob = new Blob([String.fromCharCode(0xFEFF) + f.text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  },
  'staff-edit': el => staffModal((S.team || []).find(s => s.id === el.dataset.id) || null),
  'gen-pin': el => { el.closest('.row').querySelector('input').value = genPin(); },
  here: el => busy(el, async () => {
    const p = await getPosition(10000);
    if (!p) { toast(t('se_loc_fail'), 'err'); return; }
    $(`[name="b_${el.dataset.code}_lat"]`).value = p.lat.toFixed(6); $(`[name="b_${el.dataset.code}_lng"]`).value = p.lng.toFixed(6);
    toast(t('se_loc_set'));
  }),
  'issue-add': () => { $('#issues').insertAdjacentHTML('beforeend', issueRow({ k: '', p: 'normal', ar: '', en: '' })); const rows = $$('#issues .issue-row'); $('input', rows[rows.length - 1]).focus(); },
  'issue-del': el => { if ($$('#issues .issue-row').length > 1) el.closest('.issue-row').remove(); },
  'unit-new': () => unitModal(),
  'unit-toggle': el => busy(el, async () => { await srpc('admin_unit_active', { p_id: el.dataset.id, p_active: el.dataset.on === '1' }); render(); }),
  guide: el => { if (el.dataset.role) setSession(Demo.loginAs(el.dataset.role)); S.list = null; go(el.dataset.to); },
  'dm-unit': () => { const v = $('#dm-unit').value; S.unit = null; go('/u/' + encodeURIComponent(v)); },
  'dm-login': el => { setSession(Demo.loginAs(el.dataset.id)); go('/'); },
  'dm-reset': () => { S.session = null; store.del(P + 'session'); store.del(P + 'mine'); store.del(P + 'contact'); Demo.reset(); S.list = null; S.settings = null; S.photos = {}; S.draft = {}; S.unit = null; toast(t('dm_reset_ok')); render(); }
};

/* ============================================================ forms */
const FORM = {
  'submit-req': async f => {
    clearErrs(f);
    const token = S.unit.token, photo = S.photos['before:' + token];
    const issue = (f.querySelector('input[name="issue"]:checked') || {}).value;
    const desc = f.querySelector('[name="desc"]').value.trim();
    let ok = true;
    if (!issue) ok = setErr(f, 'issue', t('t_need_issue'));
    if (desc.length < 3) ok = setErr(f, 'desc', t('t_need_desc'));
    if (!photo) ok = setErr(f, 'photo', t('t_need_photo'));
    if (!ok) return firstErr(f);
    const name = f.querySelector('[name="cname"]').value.trim(), phone = f.querySelector('[name="cphone"]').value.trim();
    await busy(f.querySelector('[type="submit"]'), async () => {
      const res = await rpc('submit_request', { p_token: token, p_issue: issue, p_description: desc, p_photo: photo, p_lang: LANG, p_name: name || null, p_phone: phone || null });
      addMine({ id: res.id, code: res.code, no: res.no, token, at: new Date().toISOString() });
      store.set(P + 'contact', { name, phone });
      delete S.draft[token]; delete S.photos['before:' + token];
      S.justSent = res.id;
      go('/t/' + res.id + '/' + res.code);
    });
  },
  'tenant-sign': async f => {
    clearErrs(f);
    const rating = +f.querySelector('[name="rating"]').value, pad = PADS.tenant;
    let ok = true;
    if (!rating) ok = setErr(f, 'rating', t('t_need_rating'));
    if (!pad || pad.empty()) ok = setErr(f, 'sig', t('t_need_sig'));
    if (!ok) return firstErr(f);
    await busy(f.querySelector('[type="submit"]'), async () => {
      await rpc('tenant_signoff', { p_id: S.track.id, p_code: S.track.code, p_signature: pad.data(), p_rating: rating, p_comment: f.querySelector('[name="comment"]').value.trim() || null });
      toast(t('t_thanks')); render();
    });
  },
  login: async f => {
    clearErrs(f);
    const phone = f.querySelector('[name="phone"]').value, pin = f.querySelector('[name="pin"]').value.trim();
    if (!phone.trim() || !pin) return setErr(f, 'form', t('l_bad'));
    await busy(f.querySelector('[type="submit"]'), async () => {
      const res = await rpc('staff_login', { p_phone: phone, p_pin: pin });
      if (res && res.error) { setErr(f, 'form', t(res.error === 'locked' ? 'l_locked' : 'l_bad')); return; }
      setSession(res); go('/');
    });
  },
  setup: async f => {
    clearErrs(f);
    const v = n => f.querySelector(`[name="${n}"]`).value.trim();
    if (!/^[0-9]{6}$/.test(v('pin'))) return setErr(f, 'form', t('err_pin_format'));
    if (v('pin') !== v('pin2')) return setErr(f, 'form', t('s_mismatch'));
    await busy(f.querySelector('[type="submit"]'), async () => {
      const res = await rpc('setup_admin', { p_name: v('name'), p_phone: v('phone'), p_pin: v('pin') });
      setSession(res); go('/');
    });
  },
  'arrive-manual': async f => {
    clearErrs(f);
    const note = f.querySelector('[name="note"]').value.trim();
    if (note.length < 3) return setErr(f, 'note', t('d_reason_need'));
    await busy(f.querySelector('[type="submit"]'), async () => {
      const pos = await getPosition(6000);
      await srpc('tech_arrive', { p_id: S.req.id, p_note: note, p_lat: pos ? pos.lat : null, p_lng: pos ? pos.lng : null, p_acc: pos ? pos.acc : null });
      toast(t('d_arrived_ok')); S.list = null; render();
    });
  },
  finish: async f => {
    clearErrs(f);
    const key = 'after:' + S.req.id, photo = S.photos[key];
    if (!photo) { setErr(f, 'photo', t('d_need_after')); return firstErr(f); }
    await busy(f.querySelector('[type="submit"]'), async () => {
      await srpc('tech_finish', { p_id: S.req.id, p_photo: photo, p_note: f.querySelector('[name="note"]').value.trim() || null });
      delete S.photos[key]; toast(t('d_finished_ok')); S.list = null; render();
    });
  },
  'onsite-sign': async f => {
    clearErrs(f);
    const signer = f.querySelector('[name="signer"]').value.trim(), rating = +f.querySelector('[name="rating"]').value, pad = PADS.onsite;
    let ok = true;
    if (signer.length < 2) ok = setErr(f, 'signer', t('d_need_signer'));
    if (!rating) ok = setErr(f, 'rating', t('t_need_rating'));
    if (!pad || pad.empty()) ok = setErr(f, 'sig', t('t_need_sig'));
    if (!ok) return firstErr(f);
    await busy(f.querySelector('[type="submit"]'), async () => {
      await srpc('onsite_signoff', { p_id: S.req.id, p_signature: pad.data(), p_signer: signer, p_rating: rating, p_comment: f.querySelector('[name="comment"]').value.trim() || null });
      toast(t('d_closed_ok')); S.list = null; render();
    });
  },
  assign: async f => {
    const staff = f.querySelector('[name="staff"]').value;
    if (staff === S.req.technician_id) return;
    await busy(f.querySelector('[type="submit"]'), async () => { await srpc('mgr_assign', { p_id: S.req.id, p_staff: staff }); toast(t('d_assigned_ok')); S.list = null; render(); });
  },
  reason: async f => {
    clearErrs(f);
    const m = f.closest('.modal'), note = f.querySelector('[name="note"]').value.trim();
    if (note.length < 3) return setErr(f, 'note', t('d_reason_need'));
    await busy(f.querySelector('[type="submit"]'), async () => { await m._reason(note); closeModal(m); });
  },
  staff: async f => {
    clearErrs(f);
    const v = n => { const el = f.querySelector(`[name="${n}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : null; };
    const id = v('id') || null, pin = v('pin'), name = v('name');
    if (pin && !/^[0-9]{6}$/.test(pin)) return setErr(f, 'form', t('err_pin_format'));
    if (!id && !pin) return setErr(f, 'form', t('err_pin_format'));
    await busy(f.querySelector('[type="submit"]'), async () => {
      await srpc('admin_save_staff', { p_id: id, p_name: name, p_phone: v('phone'), p_role: v('role'), p_active: id ? v('active') : true, p_pin: pin || null });
      closeModal(f.closest('.modal'));
      if (pin) modal(`<div class="success">${ICON.check}<div><b>${t('tm_saved_plain')}</b><p>${esc(t('tm_saved', { n: name, p: pin }))}</p><p class="mono" dir="ltr">${esc(APP_URL)}</p></div></div><button class="btn" type="button" data-act="modal-close">${t('close')}</button>`);
      else toast(t('tm_saved_plain'));
      render();
    });
  },
  settings: async f => {
    clearErrs(f);
    const v = n => { const el = f.querySelector(`[name="${n}"]`); return el ? el.value.trim() : ''; };
    const num = (n, d) => { const x = parseInt(v(n), 10); return x > 0 ? x : d; };
    const st = clone(S.settings || DEFAULTS);
    st.contractor = { ar: v('c_ar'), en: v('c_en') };
    st.targets = {};
    ['urgent', 'normal'].forEach(p => { const dflt = (DEFAULTS.targets || {})[p] || {}; st.targets[p] = { pickup: num(`tg_${p}_pickup`, dflt.pickup), arrive: num(`tg_${p}_arrive`, dflt.arrive), work: num(`tg_${p}_work`, dflt.work) }; });
    st.buildings = st.buildings || {};
    $$('[name$="_urgent"]', f).forEach(el => {
      const code = el.name.slice(2, -7);
      const lat = parseFloat(v(`b_${code}_lat`)), lng = parseFloat(v(`b_${code}_lng`));
      st.buildings[code] = { arrive: { urgent: num(`b_${code}_urgent`, null), normal: num(`b_${code}_normal`, null) }, lat: isNaN(lat) ? null : lat, lng: isNaN(lng) ? null : lng };
    });
    const used = new Set();
    st.issueTypes = $$('#issues .issue-row', f).map(row => {
      const ar = $('[name="ia"]', row).value.trim(), en = $('[name="ie"]', row).value.trim(), p = $('[name="ip"]', row).value;
      let k = row.dataset.k || (en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'type');
      while (used.has(k)) k += '_2';
      used.add(k);
      return { k, p, ar, en };
    }).filter(i => i.ar || i.en);
    st.repeatDays = num('repeat', 30);
    if (!st.issueTypes.length || st.issueTypes.some(i => !i.ar || !i.en)) return setErr(f, 'form', t('err_bad_settings'));
    await busy(f.querySelector('[type="submit"]'), async () => { await srpc('admin_save_settings', { p_data: st }); S.settings = st; toast(t('se_saved')); render(); });
  },
  'unit-add': async f => {
    clearErrs(f);
    const v = n => f.querySelector(`[name="${n}"]`).value.trim();
    let code = v('b'), bar, ben;
    if (code === '__new') { code = v('code').toUpperCase(); bar = v('bar'); ben = v('ben'); }
    else { const u = (S.units || []).find(x => x.building_code === code); bar = u.building_ar; ben = u.building_en; }
    const len = v('len'), lar = v('lar'), digits = (len.match(/\d+/) || lar.match(/\d+/) || [])[0];
    await busy(f.querySelector('[type="submit"]'), async () => {
      await srpc('admin_add_unit', { p_building_code: code, p_building_ar: bar, p_building_en: ben, p_kind: v('kind'), p_label_ar: lar, p_label_en: len, p_sort: digits ? +digits : 100 });
      closeModal(f.closest('.modal')); toast(t('q_added')); render();
    });
  }
};

/* ============================================================ events */
function onClick(e) {
  unlockAudio();
  const a = e.target.closest('a[href^="#/"]');
  if (EMB && a) { e.preventDefault(); S.route = a.getAttribute('href'); render(); return; }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const f = ACT[el.dataset.act];
  if (f) { e.preventDefault(); f(el, e); }
}
function onSubmit(e) {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const h = FORM[f.dataset.form];
  if (h) h(f, e);
}
function onChange(e) {
  const el = e.target;
  if (el.matches('input[type="file"][data-photo]')) { onPhoto(el); return; }
  const f = el.closest('form[data-form="submit-req"]');
  if (f && el.name === 'issue' && S.unit) { (S.draft[S.unit.token] || {}).issue = el.value; const fl = el.closest('.field'); fl.classList.remove('has-err'); $('.err', fl).textContent = ''; }
  if (el.matches('#ua-b')) { const nb = $('.newb', el.closest('form')); if (nb) nb.hidden = el.value !== '__new'; }
}
function onInput(e) {
  const el = e.target;
  if (el.dataset.input === 'q') { S.q = el.value; const b = $('#blist'); if (b) { b.innerHTML = boardList(S.list || []); tick(); } return; }
  const f = el.closest('form[data-form="submit-req"]');
  if (f && S.unit && S.draft[S.unit.token] && ['desc', 'cname', 'cphone'].includes(el.name)) {
    S.draft[S.unit.token][el.name] = el.value;
    if (el.name === 'desc' && el.value.trim().length >= 3) { const fl = el.closest('.field'); fl.classList.remove('has-err'); $('.err', fl).textContent = ''; }
  }
}

/* ============================================================ demo server (same rules as the database) */
const Demo = (function () {
  const KEY = 'rasd.demo.db.v1';
  let db = null;
  const now = () => new Date().toISOString();
  const uid = () => 'x' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const fail = c => { throw new Error(c); };
  const LIGHT = ['id', 'no', 'unit_id', 'building_code', 'building_ar', 'building_en', 'unit_ar', 'unit_en', 'unit_kind', 'issue_type', 'priority', 'target_arrive', 'target_work', 'description', 'lang', 'contact_name', 'contact_phone', 'status', 'created_at', 'technician_id', 'accepted_at', 'accept_method', 'arrived_at', 'arrival_method', 'finished_at', 'signed_at', 'signoff_method', 'rating', 'closed_at', 'close_method', 'cancelled_at'];
  function load() {
    if (!db) {
      db = store.get(KEY, null);
      if (!db || db.v !== 2 || !db.units || !db.units.length) { db = seed(); save(); }
      else if (Date.now() - (db.at || 0) > 3600e3) { shift(Date.now() - (db.at || Date.now())); save(); }
    }
    return db;
  }
  function shift(delta) {
    const add = x => (x ? new Date(D(x).getTime() + delta).toISOString() : x);
    db.requests.forEach(r => ['created_at', 'accepted_at', 'arrived_at', 'finished_at', 'signed_at', 'closed_at', 'cancelled_at'].forEach(k => { r[k] = add(r[k]); }));
    db.events.forEach(e => { e.at = add(e.at); });
    db.at = Date.now();
  }
  function save() { store.set(KEY, db); }
  const name = id => { const s = db.staff.find(x => x.id === id); return s ? s.full_name : null; };
  function auth(tok, roles) {
    const id = db.sessions[tok], s = id && db.staff.find(x => x.id === id && x.active);
    if (!s) fail('auth_required');
    if (roles && roles.indexOf(s.role) < 0) fail('not_allowed');
    return s;
  }
  function session(s) { const tok = uid() + uid(); db.sessions[tok] = s.id; return { token: tok, me: { id: s.id, name: s.full_name, role: s.role, phone: s.phone } }; }
  function ev(rid, actor, e, note) { db.events.push({ id: ++db.seq.ev, request_id: rid, at: now(), actor: actor || null, ev: e, note: note ? String(note).trim().slice(0, 500) || null : null }); }
  function targets(code, p) {
    const s = db.settings, b = (s.buildings || {})[code], tg = (s.targets || {})[p] || {};
    return [(b && b.arrive && b.arrive[p]) || tg.arrive || (p === 'urgent' ? 60 : 240), tg.work || (p === 'urgent' ? 120 : 240)];
  }
  function normPhone(p) {
    let d = String(p || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2); else if (d.length === 8) d = '968' + d;
    return d;
  }
  const find = id => db.requests.find(x => x.id === id);
  const isImg = s => /^data:image\/(jpeg|png|webp);base64,/.test(s || '') && s.length >= 1000;
  const isSig = s => /^data:image\/png;base64,/.test(s || '') && s.length <= 400000;
  const own = (r, me) => r.technician_id === me.id || me.role !== 'technician';
  const H = {
    get_settings: () => db.settings,
    unit_info: a => { const u = db.units.find(x => x.token === a.p_token && x.active); return u ? { id: u.id, building_code: u.building_code, building_ar: u.building_ar, building_en: u.building_en, label_ar: u.label_ar, label_en: u.label_en, kind: u.kind, issues: db.settings.issueTypes } : null; },
    submit_request: a => {
      const u = db.units.find(x => x.token === a.p_token && x.active); if (!u) fail('invalid_unit');
      const it = db.settings.issueTypes.find(i => i.k === a.p_issue); if (!it) fail('issue_required');
      if (!a.p_description || a.p_description.trim().length < 3) fail('description_required');
      if (!isImg(a.p_photo)) fail('photo_required');
      if (db.requests.filter(r => r.unit_id === u.id && Date.now() - D(r.created_at) < 600000).length >= 3) fail('slow_down');
      const tg = targets(u.building_code, it.p);
      const r = { id: uid(), no: ++db.seq.no, unit_id: u.id, building_code: u.building_code, building_ar: u.building_ar, building_en: u.building_en, unit_ar: u.label_ar, unit_en: u.label_en, unit_kind: u.kind, issue_type: it.k, priority: it.p, target_arrive: tg[0], target_work: tg[1], description: a.p_description.trim().slice(0, 2000), photo_before: a.p_photo, lang: a.p_lang === 'en' ? 'en' : 'ar', contact_name: (a.p_name || '').trim() || null, contact_phone: (a.p_phone || '').trim() || null, tracking_code: uid() + uid(), status: 'new', created_at: now() };
      db.requests.push(r); ev(r.id, null, 'submitted');
      return { id: r.id, no: r.no, code: r.tracking_code, created_at: r.created_at };
    },
    track_request: a => {
      const r = db.requests.find(x => x.id === a.p_id && x.tracking_code === a.p_code); if (!r) return null;
      const o = {}; ['id', 'no', 'status', 'issue_type', 'description', 'building_ar', 'building_en', 'unit_ar', 'unit_en', 'unit_kind', 'created_at', 'accepted_at', 'arrived_at', 'finished_at', 'closed_at', 'cancelled_at', 'signed_at', 'signoff_method', 'rating', 'tech_note'].forEach(k => (o[k] = r[k] == null ? null : r[k]));
      o.photo_after = ['finished', 'closed'].includes(r.status) ? r.photo_after || null : null; o.technician = name(r.technician_id);
      return o;
    },
    tenant_signoff: a => {
      if (!(a.p_rating >= 1 && a.p_rating <= 5)) fail('rating_required');
      if (!isSig(a.p_signature)) fail('signature_required');
      const r = db.requests.find(x => x.id === a.p_id && x.tracking_code === a.p_code && x.status === 'finished'); if (!r) fail('not_ready');
      Object.assign(r, { signature: a.p_signature, signer_name: null, signoff_method: 'tenant', rating: a.p_rating, rating_comment: (a.p_comment || '').trim() || null, signed_at: now(), closed_at: now(), close_method: 'signed', status: 'closed' });
      ev(r.id, null, 'signed_tenant');
    },
    setup_status: () => ({ ready: true }),
    setup_admin: () => fail('already_setup'),
    staff_login: a => { const s = db.staff.find(x => x.phone === normPhone(a.p_phone)); return !s || !s.active || s.pin !== a.p_pin ? { error: 'bad_login' } : session(s); },
    staff_logout: a => { delete db.sessions[a.p_token]; },
    staff_me: a => { const s = auth(a.p_token); return { id: s.id, name: s.full_name, role: s.role, phone: s.phone }; },
    staff_requests: a => {
      const me = auth(a.p_token), F = a.p_from ? D(a.p_from).getTime() : -Infinity, T = a.p_to ? D(a.p_to).getTime() : Infinity;
      return db.requests.filter(r => (me.role !== 'technician' || r.status === 'new' || r.technician_id === me.id) && (['new', 'accepted', 'onsite', 'finished'].includes(r.status) || (D(r.created_at) >= F && D(r.created_at) < T)))
        .sort((x, y) => D(y.created_at) - D(x.created_at))
        .map(r => { const o = {}; LIGHT.forEach(k => (o[k] = r[k] == null ? null : r[k])); o.description = (r.description || '').slice(0, 280); o.technician = name(r.technician_id); return o; });
    },
    staff_request: a => {
      const me = auth(a.p_token), r = find(a.p_id); if (!r) fail('not_found');
      if (me.role === 'technician' && r.status !== 'new' && r.technician_id !== me.id) fail('not_allowed');
      const o = clone(r); delete o.tracking_code;
      o.technician = name(r.technician_id);
      o.events = db.events.filter(e => e.request_id === r.id).sort((x, y) => D(x.at) - D(y.at) || x.id - y.id).map(e => ({ at: e.at, ev: e.ev, note: e.note, actor: name(e.actor) }));
      const u = db.units.find(x => x.id === r.unit_id); o._token = u ? u.token : null;
      return o;
    },
    tech_accept: a => { const me = auth(a.p_token), r = find(a.p_id); if (!r || r.status !== 'new') fail('already_taken'); Object.assign(r, { status: 'accepted', technician_id: me.id, accepted_at: now(), accept_method: 'self' }); ev(r.id, me.id, 'accepted'); },
    tech_arrive: a => {
      const me = auth(a.p_token), r = find(a.p_id); if (!r || r.status !== 'accepted') fail('not_ready');
      if (!own(r, me)) fail('not_assigned');
      const u = db.units.find(x => x.id === r.unit_id), tk = String(a.p_unit_token || '').trim(); let m;
      if (tk) { if (tk !== u.token) fail('wrong_unit'); m = 'qr'; } else { if (!a.p_note || a.p_note.trim().length < 3) fail('reason_required'); m = 'manual'; }
      Object.assign(r, { status: 'onsite', arrived_at: now(), arrival_method: m, arrival_note: (a.p_note || '').trim() || null, arrival_lat: a.p_lat == null ? null : a.p_lat, arrival_lng: a.p_lng == null ? null : a.p_lng, arrival_acc: a.p_acc == null ? null : a.p_acc });
      ev(r.id, me.id, 'arrived_' + m, a.p_note); return m;
    },
    tech_finish: a => {
      const me = auth(a.p_token); if (!isImg(a.p_photo)) fail('photo_required');
      const r = find(a.p_id); if (!r || r.status !== 'onsite') fail('not_ready'); if (!own(r, me)) fail('not_assigned');
      Object.assign(r, { status: 'finished', finished_at: now(), photo_after: a.p_photo, tech_note: (a.p_note || '').trim() || null }); ev(r.id, me.id, 'finished', a.p_note);
    },
    onsite_signoff: a => {
      const me = auth(a.p_token);
      if (!a.p_signer || a.p_signer.trim().length < 2) fail('signer_required'); if (!(a.p_rating >= 1 && a.p_rating <= 5)) fail('rating_required'); if (!isSig(a.p_signature)) fail('signature_required');
      const r = find(a.p_id); if (!r || r.status !== 'finished') fail('not_ready'); if (!own(r, me)) fail('not_assigned');
      Object.assign(r, { signature: a.p_signature, signer_name: a.p_signer.trim(), signoff_method: 'onsite', rating: a.p_rating, rating_comment: (a.p_comment || '').trim() || null, signed_at: now(), closed_at: now(), close_method: 'signed', status: 'closed' });
      ev(r.id, me.id, 'signed_onsite', a.p_signer);
    },
    mgr_assign: a => {
      const me = auth(a.p_token, ['supervisor', 'admin']), s = db.staff.find(x => x.id === a.p_staff && x.active); if (!s) fail('bad_technician');
      const r = find(a.p_id); if (!r || !['new', 'accepted', 'onsite', 'finished'].includes(r.status)) fail('not_ready');
      if (r.status === 'new') { Object.assign(r, { status: 'accepted', technician_id: s.id, accepted_at: now(), accept_method: 'assigned' }); ev(r.id, me.id, 'assigned', s.full_name); }
      else { r.technician_id = s.id; ev(r.id, me.id, 'reassigned', s.full_name); }
    },
    mgr_priority: a => {
      const me = auth(a.p_token, ['supervisor', 'admin']); if (['urgent', 'normal'].indexOf(a.p_priority) < 0) fail('bad_priority');
      const r = find(a.p_id); if (!r || ['closed', 'cancelled'].includes(r.status)) fail('not_ready'); if (r.priority === a.p_priority) return;
      const tg = targets(r.building_code, a.p_priority); Object.assign(r, { priority: a.p_priority, target_arrive: tg[0], target_work: tg[1] }); ev(r.id, me.id, 'priority_' + a.p_priority);
    },
    mgr_close: a => {
      const me = auth(a.p_token, ['supervisor', 'admin']); if (!a.p_note || a.p_note.trim().length < 3) fail('reason_required');
      const r = find(a.p_id); if (!r || !['accepted', 'onsite', 'finished'].includes(r.status)) fail('not_ready');
      Object.assign(r, { status: 'closed', closed_at: now(), close_method: 'manual', close_note: a.p_note.trim() }); ev(r.id, me.id, 'closed_manual', a.p_note);
    },
    mgr_cancel: a => {
      const me = auth(a.p_token, ['supervisor', 'admin']); if (!a.p_note || a.p_note.trim().length < 3) fail('reason_required');
      const r = find(a.p_id); if (!r || ['closed', 'cancelled'].includes(r.status)) fail('not_ready');
      Object.assign(r, { status: 'cancelled', cancelled_at: now(), cancel_note: a.p_note.trim() }); ev(r.id, me.id, 'cancelled', a.p_note);
    },
    team_list: a => { auth(a.p_token, ['supervisor', 'admin']); return db.staff.slice().sort((x, y) => (y.active - x.active) || x.role.localeCompare(y.role) || x.full_name.localeCompare(y.full_name)).map(s => ({ id: s.id, name: s.full_name, phone: s.phone, role: s.role, active: s.active, locked: false, created_at: s.created_at })); },
    admin_save_staff: a => {
      const me = auth(a.p_token, ['admin']), phone = normPhone(a.p_phone);
      if (!a.p_name || a.p_name.trim().length < 2) fail('name_required'); if (phone.length < 8) fail('phone_required');
      if (['technician', 'supervisor', 'admin'].indexOf(a.p_role) < 0) fail('bad_role'); if (a.p_pin && !/^[0-9]{6}$/.test(a.p_pin)) fail('pin_format');
      if (db.staff.some(s => s.phone === phone && s.id !== a.p_id)) fail('phone_taken');
      if (!a.p_id) { if (!a.p_pin) fail('pin_format'); const s = { id: uid(), full_name: a.p_name.trim(), phone, role: a.p_role, pin: a.p_pin, active: true, created_at: now() }; db.staff.push(s); return { id: s.id }; }
      const s = db.staff.find(x => x.id === a.p_id); if (!s) fail('not_found');
      if (s.id === me.id && (a.p_role !== 'admin' || a.p_active === false)) fail('not_self');
      Object.assign(s, { full_name: a.p_name.trim(), phone, role: a.p_role, active: a.p_active !== false }); if (a.p_pin) s.pin = a.p_pin;
      if ((a.p_pin || a.p_active === false) && s.id !== me.id) Object.keys(db.sessions).forEach(k => { if (db.sessions[k] === s.id) delete db.sessions[k]; });
      return { id: s.id };
    },
    admin_units: a => { auth(a.p_token, ['admin']); return db.units.slice().sort((x, y) => x.building_code.localeCompare(y.building_code) || x.sort - y.sort); },
    admin_add_unit: a => {
      auth(a.p_token, ['admin']); const code = String(a.p_building_code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{2,8}$/.test(code) || !a.p_building_ar || !a.p_building_en) fail('bad_building'); if (!a.p_label_ar || !a.p_label_en) fail('label_required');
      if (db.units.some(u => u.building_code === code && u.label_en === a.p_label_en.trim())) fail('unit_exists');
      const u = { id: uid(), building_code: code, building_ar: a.p_building_ar.trim(), building_en: a.p_building_en.trim(), label_ar: a.p_label_ar.trim(), label_en: a.p_label_en.trim(), kind: a.p_kind === 'common' ? 'common' : 'flat', token: code.toLowerCase() + '-' + uid().slice(1, 9), active: true, sort: a.p_sort || 0 };
      db.units.push(u); return { id: u.id, token: u.token };
    },
    admin_unit_active: a => { auth(a.p_token, ['admin']); const u = db.units.find(x => x.id === a.p_id); if (u) u.active = !!a.p_active; },
    admin_save_settings: a => { auth(a.p_token, ['admin']); const d = a.p_data; if (!d || !Array.isArray(d.issueTypes) || !d.issueTypes.length || d.issueTypes.some(i => !i.k || !i.ar || !i.en || ['urgent', 'normal'].indexOf(i.p) < 0)) fail('bad_settings'); db.settings = clone(d); }
  };

  /* ----- sample data: one building, four technicians with different habits, about five weeks of history ----- */
  function seed() {
    let s = 73110;
    const R = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const pick = a => a[Math.floor(R() * a.length)];
    const wpick = obj => { const ks = Object.keys(obj), tot = ks.reduce((t2, k) => t2 + obj[k], 0); let x = R() * tot; for (const k of ks) { x -= obj[k]; if (x <= 0) return k; } return ks[0]; };
    const B = DEMO_UNITS.building;
    const st = clone(DEFAULTS);
    if (st.buildings && st.buildings[B.code]) { st.buildings[B.code].lat = 23.5893; st.buildings[B.code].lng = 58.3891; }
    const units = DEMO_UNITS.units.map((u, i) => ({ id: 'u' + (i + 1), building_code: B.code, building_ar: B.ar, building_en: B.en, label_ar: u.label_ar, label_en: u.label_en, kind: u.kind, token: u.token, active: true, sort: u.sort }));
    const t0 = new Date(Date.now() - 60 * 864e5).toISOString();
    const staff = [
      { id: 's-admin', full_name: 'مدير المرافق', phone: '96890000001', role: 'admin', pin: '100001', active: true, created_at: t0 },
      { id: 's-sup', full_name: 'ناصر الرواحي', phone: '96890000002', role: 'supervisor', pin: '100002', active: true, created_at: t0 },
      { id: 's-t1', full_name: 'Sanjay Kumar', phone: '96891111111', role: 'technician', pin: '111111', active: true, created_at: t0 },
      { id: 's-t2', full_name: 'Mohammed Rafiq', phone: '96892222222', role: 'technician', pin: '222222', active: true, created_at: t0 },
      { id: 's-t3', full_name: 'Anil Thomas', phone: '96893333333', role: 'technician', pin: '333333', active: true, created_at: t0 },
      { id: 's-t4', full_name: 'سالم البلوشي', phone: '96894444444', role: 'technician', pin: '444444', active: true, created_at: t0 }
    ];
    const prof = { 's-t1': { a: 0.5, w: 0.6, r: 4.7, man: 0.03, on: 0.1 }, 's-t2': { a: 0.85, w: 0.85, r: 4.2, man: 0.08, on: 0.2 }, 's-t3': { a: 1.3, w: 1.15, r: 3.4, man: 0.3, on: 0.45 }, 's-t4': { a: 0.7, w: 0.8, r: 4.4, man: 0.05, on: 0.15 } };
    const techW = { 's-t1': 30, 's-t2': 27, 's-t3': 23, 's-t4': 20 };
    const flatW = { ac: 22, plumbing: 14, water_leak: 9, lights: 10, heater: 8, sockets: 6, drain_overflow: 6, carpentry: 5, door_lock: 4, no_power: 3, pests: 4, no_water: 2, sparks: 1, other: 3 };
    const commonW = { lights: 40, lift: 15, water_leak: 10, plumbing: 8, door_lock: 9, pests: 8, other: 10 };
    const DESC = {
      ac: ['المكيف في غرفة النوم لا يبرّد منذ أمس', 'AC in the living room is blowing warm air', 'صوت عالٍ من وحدة المكيف', 'المكيف يسرّب ماء على الجدار'],
      plumbing: ['الشطاف يسرّب ماء باستمرار', 'Kitchen tap keeps dripping', 'السيفون لا يتوقف عن الجريان'],
      water_leak: ['تسرّب ماء من سقف الحمام', 'Water leaking under the kitchen sink', 'تسرّب من خزان السخان'],
      lights: ['إنارة المطبخ لا تعمل', 'Bedroom light keeps flickering', 'إنارة الصالة لا تعمل'],
      heater: ['السخان لا يسخّن الماء', 'No hot water in the bathroom'], sockets: ['فيش غرفة الجلوس لا يعمل', 'The socket next to the bed is loose'],
      drain_overflow: ['انسداد في مجرى المطبخ', 'Bathroom floor drain is overflowing'], carpentry: ['باب الخزانة مكسور', 'Balcony door does not close properly'],
      door_lock: ['قفل الباب الرئيسي لا يُقفل', 'Main door lock is jammed'], no_power: ['انقطاع الكهرباء عن نصف الشقة', 'Power is off in the kitchen and living room'],
      pests: ['صراصير في المطبخ', 'Ants in the bathroom'], no_water: ['لا يوجد ماء في الشقة منذ الصباح'], sparks: ['رائحة احتراق من لوحة الكهرباء'],
      lift: ['المصعد متوقف في الطابق الثالث', 'Lift door does not open on the ground floor'], other: ['صوت طرق في أنابيب المياه', 'Intercom is not working']
    };
    const COMMON_DESC = { lights: ['إنارة الدرج في الطابق الرابع لا تعمل', 'Corridor lights on the 2nd floor are off', 'إنارة المدخل لا تعمل'], water_leak: ['تسرّب ماء في موقف السيارات'], plumbing: ['حنفية غرفة الحارس تسرّب'], door_lock: ['باب المدخل الرئيسي لا يُقفل'], pests: ['حشرات عند حاويات النفايات'], other: ['جرس الإنتركم في المدخل لا يعمل'] };
    const NOTE = { ac: ['تم تنظيف الفلتر وإعادة شحن الغاز', 'Cleaned the drain line and tested cooling'], plumbing: ['تم تغيير الشطاف', 'Replaced the cartridge and tested'], water_leak: ['تم تغيير الوصلة وتجربة التشغيل', 'Sealed the joint and checked for leaks'], lights: ['تم تغيير اللمبة والمفتاح', 'Replaced the driver'], heater: ['تم تغيير الثرموستات'], sockets: ['تم تثبيت الفيش وتغييره'], drain_overflow: ['تم تسليك المجرى'], carpentry: ['Re-fixed the hinge and adjusted the door'], door_lock: ['تم تغيير الأسطوانة'], no_power: ['تم تغيير القاطع وشد التوصيلات'], pests: ['تم رش المبيد وإغلاق الفتحات'], no_water: ['تم فتح المحبس وتنظيف العوامة'], sparks: ['تم تغيير التوصيلة المحترقة'], lift: ['تمت إعادة تشغيل المصعد مع شركة المصاعد'], other: ['تم الإصلاح'] };
    const COMMENTS = ['شكراً، خدمة سريعة', 'Very polite technician', 'تأخر قليلاً لكن العمل ممتاز', 'Good job', 'الفني محترم ونظيف في العمل', 'وصل متأخراً'];
    const NAMES = ['أحمد', 'Fatma', 'خالد', 'Priya', 'سعيد', 'مريم', 'John', null, null];
    const db0 = { v: 2, at: Date.now(), settings: st, units, staff, sessions: {}, requests: [], events: [], seq: { no: 1000, ev: 0 } };
    const iso = x => new Date(x).toISOString();
    const nowMs = Date.now(), midnight = d => { const n = d + OFFSET; return n - (n % 864e5) - OFFSET; };
    const pushEv = (rid, at, actor, e, note) => db0.events.push({ id: ++db0.seq.ev, request_id: rid, at: iso(at), actor: actor || null, ev: e, note: note || null });
    const flats = units.filter(u => u.kind === 'flat'), commons = units.filter(u => u.kind === 'common');
    const mk = (u, issue, created) => {
      const it = st.issueTypes.find(i => i.k === issue), tg = (st.targets[it.p] || {});
      const descs = (u.kind === 'common' && COMMON_DESC[issue]) || DESC[issue] || DESC.other;
      const nm = pick(NAMES);
      return { id: uid(), no: 0, unit_id: u.id, building_code: B.code, building_ar: B.ar, building_en: B.en, unit_ar: u.label_ar, unit_en: u.label_en, unit_kind: u.kind, issue_type: issue, priority: it.p, target_arrive: tg.arrive, target_work: tg.work, description: pick(descs), photo_before: PH_BEFORE, lang: R() < 0.7 ? 'ar' : 'en', contact_name: nm, contact_phone: nm ? '9' + String(1000000 + Math.floor(R() * 8999999)) : null, tracking_code: uid() + uid(), status: 'new', created_at: iso(created) };
    };
    const play = (r, techId, upTo) => {
      const p = prof[techId], c = D(r.created_at).getTime(); let at = c;
      pushEv(r.id, c, null, 'submitted');
      const pick2 = r.priority === 'urgent' ? 2 + R() * 13 : 5 + R() * 70; at = c + pick2 * 60000;
      if (at > upTo) return r;
      const assigned = R() < 0.2;
      Object.assign(r, { status: 'accepted', technician_id: techId, accepted_at: iso(at), accept_method: assigned ? 'assigned' : 'self' });
      pushEv(r.id, at, assigned ? 's-sup' : techId, assigned ? 'assigned' : 'accepted', assigned ? name2(techId) : null);
      const arr = at + r.target_arrive * p.a * (0.55 + R() * 0.95) * 60000; if (arr > upTo) return r;
      const manual = R() < p.man;
      Object.assign(r, { status: 'onsite', arrived_at: iso(arr), arrival_method: manual ? 'manual' : 'qr', arrival_note: manual ? pick(['ملصق الرمز تالف', 'الكاميرا لا تعمل', 'QR label missing']) : null, arrival_lat: 23.5893 + (R() - 0.5) * 0.0012, arrival_lng: 58.3891 + (R() - 0.5) * 0.0012, arrival_acc: 8 + R() * 25 });
      pushEv(r.id, arr, techId, manual ? 'arrived_manual' : 'arrived_qr', r.arrival_note);
      const fin = arr + r.target_work * p.w * (0.35 + R() * 1.0) * 60000; if (fin > upTo) return r;
      Object.assign(r, { status: 'finished', finished_at: iso(fin), photo_after: PH_AFTER, tech_note: pick(NOTE[r.issue_type] || NOTE.other) });
      pushEv(r.id, fin, techId, 'finished', r.tech_note);
      const sig = fin + (5 + R() * 80) * 60000; if (sig > upTo) return r;
      if (R() < 0.03) { Object.assign(r, { status: 'closed', closed_at: iso(sig), close_method: 'manual', close_note: 'تعذّر الوصول للمستأجر للتوقيع' }); pushEv(r.id, sig, 's-sup', 'closed_manual', r.close_note); return r; }
      const onsite = R() < p.on || r.unit_kind === 'common';
      const rating = Math.max(1, Math.min(5, Math.round(p.r + (R() - 0.5) * 1.8)));
      Object.assign(r, { status: 'closed', signature: SIGS[Math.floor(R() * SIGS.length)], signer_name: onsite ? (r.unit_kind === 'common' ? 'حارس المبنى' : (r.contact_name || 'صاحب الشقة')) : null, signoff_method: onsite ? 'onsite' : 'tenant', rating, rating_comment: R() < 0.3 ? pick(COMMENTS) : null, signed_at: iso(sig), closed_at: iso(sig), close_method: 'signed' });
      pushEv(r.id, sig, onsite ? techId : null, onsite ? 'signed_onsite' : 'signed_tenant', onsite ? r.signer_name : null);
      return r;
    };
    const name2 = id => (staff.find(x => x.id === id) || {}).full_name;
    const hist = [];
    for (let i = 0; i < 52; i++) {
      const day = 1 + Math.floor(R() * 34), created = midnight(nowMs - day * 864e5) + (7 * 60 + R() * 15 * 60) * 60000;
      const common = R() < 0.15, u = common ? pick(commons) : pick(flats), issue = wpick(common ? commonW : flatW);
      const r = mk(u, issue, created);
      play(r, wpick(techW), nowMs - 6 * 3600e3);
      hist.push(r);
    }
    // two repeat faults for the slowest technician
    hist.filter(r => r.technician_id === 's-t3' && r.status === 'closed' && D(r.closed_at) < nowMs - 14 * 864e5).slice(0, 2).forEach(r => {
      const u = units.find(x => x.id === r.unit_id), again = mk(u, r.issue_type, D(r.closed_at).getTime() + (3 + R() * 6) * 864e5);
      play(again, pick(['s-t1', 's-t2', 's-t4']), nowMs - 6 * 3600e3); hist.push(again);
    });
    // two cancelled duplicates
    hist.slice(5, 7).forEach(r => { if (r.status !== 'closed') return; const d = mk(units.find(x => x.id === r.unit_id), r.issue_type, D(r.created_at).getTime() + 9 * 60000); pushEv(d.id, D(d.created_at), null, 'submitted'); Object.assign(d, { status: 'cancelled', cancelled_at: iso(D(d.created_at).getTime() + 20 * 60000), cancel_note: 'طلب مكرر' }); pushEv(d.id, D(d.cancelled_at), 's-sup', 'cancelled', d.cancel_note); hist.push(d); });
    // what is happening right now
    const at = (label, issue, mins) => { const u = units.find(x => x.label_en === label) || flats[0]; return mk(u, issue, nowMs - mins * 60000); };
    const live = [];
    live.push(at('Flat 32', 'water_leak', 6));
    live.push(at('Flat 23', 'ac', 38));
    let r = at('Flat 44', 'lights', 70); Object.assign(r, { status: 'accepted', technician_id: 's-t1', accepted_at: iso(nowMs - 24 * 60000), accept_method: 'self' }); live.push(r);
    r = at('Flat 51', 'no_power', 120); Object.assign(r, { status: 'onsite', technician_id: 's-t2', accepted_at: iso(nowMs - 112 * 60000), accept_method: 'self', arrived_at: iso(nowMs - 62 * 60000), arrival_method: 'qr', arrival_lat: 23.5894, arrival_lng: 58.3890, arrival_acc: 12 }); live.push(r);
    r = at('Flat 13', 'heater', 300); Object.assign(r, { status: 'finished', technician_id: 's-t3', accepted_at: iso(nowMs - 280 * 60000), accept_method: 'self', arrived_at: iso(nowMs - 226 * 60000), arrival_method: 'qr', finished_at: iso(nowMs - 125 * 60000), photo_after: PH_AFTER, tech_note: 'تم تغيير الثرموستات' }); live.push(r);
    r = at('Common area', 'drain_overflow', 95); Object.assign(r, { status: 'accepted', technician_id: 's-t3', accepted_at: iso(nowMs - 82 * 60000), accept_method: 'assigned' }); live.push(r);
    live.forEach(x => {
      const c = D(x.created_at).getTime(); pushEv(x.id, c, null, 'submitted');
      if (x.accepted_at) pushEv(x.id, D(x.accepted_at), x.accept_method === 'assigned' ? 's-sup' : x.technician_id, x.accept_method === 'assigned' ? 'assigned' : 'accepted', x.accept_method === 'assigned' ? name2(x.technician_id) : null);
      if (x.arrived_at) pushEv(x.id, D(x.arrived_at), x.technician_id, 'arrived_qr');
      if (x.finished_at) pushEv(x.id, D(x.finished_at), x.technician_id, 'finished', x.tech_note);
    });
    db0.requests = hist.concat(live).sort((a, b) => D(a.created_at) - D(b.created_at));
    db0.requests.forEach((x, i) => { x.no = 1001 + i; });
    db0.seq.no = 1000 + db0.requests.length;
    const waiting = live[4], wu = units.find(x => x.id === waiting.unit_id);
    store.set(P + 'mine', [{ id: waiting.id, code: waiting.tracking_code, no: waiting.no, token: wu.token, at: waiting.created_at }]);
    return db0;
  }
  return {
    async call(fn, a) {
      load();
      await new Promise(r => setTimeout(r, 90 + Math.random() * 160));
      const h = H[fn]; if (!h) fail('generic');
      const out = h(a || {});
      save();
      return out === undefined ? null : clone(out);
    },
    reset() { db = seed(); save(); },
    peek() { return load(); },
    loginAs(id) { load(); const s = db.staff.find(x => x.id === id) || db.staff[0]; const res = session(s); save(); return res; }
  };
})();
const svgUri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
function demoPhoto(after) {
  const h = after ? 152 : 32, c1 = `hsl(${h},22%,86%)`, c2 = `hsl(${h},20%,68%)`, ink = `hsl(${h},32%,30%)`;
  const glyph = after ? '<path d="M176 140l18 18 36-38"/>' : '<path d="M200 108v40M200 170v1"/>';
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="200" cy="140" r="58" fill="none" stroke="${ink}" stroke-width="9"/><g fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">${glyph}</g><text x="200" y="250" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" fill="${ink}">${after ? 'بعد الإصلاح · After' : 'صورة توضيحية · Sample photo'}</text></svg>`);
}
const PH_BEFORE = demoPhoto(false), PH_AFTER = demoPhoto(true);
const SIGS = ['M30 120 C 60 40, 90 160, 120 90 S 170 60, 190 110 S 240 150, 270 80 L 300 100', 'M40 110 Q 80 30 110 110 T 180 100 Q 210 60 240 120 T 320 90', 'M35 95 C 70 140, 100 40, 140 100 C 160 130, 190 70, 220 105 C 250 130, 280 80, 330 100']
  .map(d => svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180"><rect width="360" height="180" fill="#fff"/><path d="${d}" fill="none" stroke="#1F1E1A" stroke-width="3" stroke-linecap="round"/></svg>`));

/* ============================================================ start */
function boot() {
  applyLang();
  const u = QS.get('u');
  try {
    if (!EMB && u && !location.hash) history.replaceState(null, '', location.pathname + location.search + '#/u/' + encodeURIComponent(u));
    if (!EMB && DEMO && !location.hash) history.replaceState(null, '', location.pathname + location.search + '#/demo');
  } catch (e) { /* ignore */ }
  if (EMB) S.route = '#/demo';
  if (!EMB) window.addEventListener('hashchange', render);
  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('toggle', () => initPads(), true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.modal')) closeModal(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') runPoll(); });
  window.addEventListener('resize', () => Object.values(PADS).forEach(p => p.c.isConnected && p.fit()));
  setInterval(tick, 1000);
  render();
  if (LIVE && S.session) rpc('staff_me', { p_token: S.session.token }).then(me => { if (me && S.session) { S.session.me = me; store.set(P + 'session', S.session); } }).catch(e => { if (e.message === 'auth_required') signOut(true); });
}
boot();
})();
