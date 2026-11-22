/* رصد · Rasd — maintenance request tracking for tenants, technicians and management.
   Plain JavaScript, no build step. Talks to Supabase through database functions only. */
(function () {
'use strict';

const CFG = Object.assign({ supabaseUrl: '', supabaseKey: '', orgAr: '', orgEn: '', appUrl: '', demo: false, embedded: false }, window.RASD_CONFIG || {});
const DEFAULTS = {"v":3,"contractor":{"ar":"الطاؤوس","en":"Tawoos"},"targets":{"urgent":{"dispatch":10,"pickup":10,"arrive":15,"work":120},"normal":{"dispatch":30,"pickup":30,"arrive":60,"work":240}},"buildings":{"AZB":{"ar":"مبنى العذيبة","en":"Azaiba Building","type":"res","ops":30,"sort":1,"lat":null,"lng":null},"SAY":{"ar":"مبنى السيب","en":"Seeb Building","type":"res","ops":120,"sort":2,"lat":null,"lng":null},"MWL":{"ar":"مبنى الموالح","en":"Mawaleh Building","type":"res","ops":90,"sort":3,"lat":null,"lng":null},"BSH":{"ar":"مبنى بوشر","en":"Bousher Building","type":"res","ops":60,"sort":4,"lat":null,"lng":null},"HO":{"ar":"المكتب الرئيسي","en":"Head Office","type":"com","ops":30,"sort":5,"lat":null,"lng":null},"SCC":{"ar":"سابكو سنتر","en":"SABCO Centre","type":"com","ops":30,"sort":6,"lat":null,"lng":null},"OBTS":{"ar":"الواحة على الشاطئ","en":"Oasis by the Sea","type":"com","ops":30,"sort":7,"lat":null,"lng":null}},"repeatDays":30,"issueTypes":[{"k":"water_leak","p":"urgent","ar":"تسرّب مياه أو فيضان","en":"Water leak or flooding"},{"k":"no_power","p":"urgent","ar":"انقطاع الكهرباء","en":"Power outage"},{"k":"sparks","p":"urgent","ar":"شرارة أو رائحة احتراق","en":"Sparks or burning smell"},{"k":"no_water","p":"urgent","ar":"انقطاع المياه","en":"No water supply"},{"k":"drain_overflow","p":"urgent","ar":"انسداد أو طفح المجاري","en":"Blocked or overflowing drain"},{"k":"door_lock","p":"urgent","ar":"باب لا يُقفل","en":"Door will not lock"},{"k":"lift","p":"urgent","ar":"المصعد متوقف أو عالق","en":"Lift stopped or stuck"},{"k":"ac","p":"normal","ar":"المكيف لا يعمل أو لا يبرّد","en":"AC not working or not cooling"},{"k":"lights","p":"normal","ar":"إنارة لا تعمل","en":"Lights not working"},{"k":"sockets","p":"normal","ar":"أفياش أو مفاتيح كهرباء","en":"Sockets or switches"},{"k":"heater","p":"normal","ar":"سخان الماء","en":"Water heater"},{"k":"plumbing","p":"normal","ar":"حنفية أو سيفون أو شطاف","en":"Tap, toilet flush or hand spray"},{"k":"carpentry","p":"normal","ar":"أبواب أو نوافذ أو خزائن","en":"Doors, windows or cupboards"},{"k":"pests","p":"normal","ar":"حشرات","en":"Pests"},{"k":"other","p":"normal","ar":"أخرى","en":"Other"}]};
const DEMO_UNITS = {"buildings":[{"code":"AZB","ar":"مبنى العذيبة","en":"Azaiba Building","units":[{"kind":"flat","label_ar":"شقة 11","label_en":"Flat 11","token":"azb11-v6jt9x","sort":11},{"kind":"flat","label_ar":"شقة 12","label_en":"Flat 12","token":"azb12-vhbyze","sort":12},{"kind":"flat","label_ar":"شقة 13","label_en":"Flat 13","token":"azb13-bky9gm","sort":13},{"kind":"flat","label_ar":"شقة 14","label_en":"Flat 14","token":"azb14-msr63u","sort":14},{"kind":"flat","label_ar":"شقة 21","label_en":"Flat 21","token":"azb21-n7qnnu","sort":21},{"kind":"flat","label_ar":"شقة 22","label_en":"Flat 22","token":"azb22-4eu76z","sort":22},{"kind":"flat","label_ar":"شقة 23","label_en":"Flat 23","token":"azb23-rt4t62","sort":23},{"kind":"flat","label_ar":"شقة 24","label_en":"Flat 24","token":"azb24-cunkud","sort":24},{"kind":"flat","label_ar":"شقة 31","label_en":"Flat 31","token":"azb31-7zped2","sort":31},{"kind":"flat","label_ar":"شقة 32","label_en":"Flat 32","token":"azb32-sj2xbm","sort":32},{"kind":"flat","label_ar":"شقة 33","label_en":"Flat 33","token":"azb33-49c27v","sort":33},{"kind":"flat","label_ar":"شقة 34","label_en":"Flat 34","token":"azb34-sv3ah9","sort":34},{"kind":"flat","label_ar":"شقة 41","label_en":"Flat 41","token":"azb41-c3u93h","sort":41},{"kind":"flat","label_ar":"شقة 42","label_en":"Flat 42","token":"azb42-abp626","sort":42},{"kind":"flat","label_ar":"شقة 43","label_en":"Flat 43","token":"azb43-yjchw5","sort":43},{"kind":"flat","label_ar":"شقة 44","label_en":"Flat 44","token":"azb44-cnxm69","sort":44},{"kind":"flat","label_ar":"شقة 51","label_en":"Flat 51","token":"azb51-7jawz3","sort":51},{"kind":"flat","label_ar":"شقة 52","label_en":"Flat 52","token":"azb52-x8c3aq","sort":52},{"kind":"flat","label_ar":"شقة 53","label_en":"Flat 53","token":"azb53-yhc6ms","sort":53},{"kind":"flat","label_ar":"شقة 54","label_en":"Flat 54","token":"azb54-eea9wx","sort":54},{"kind":"flat","label_ar":"شقة 61","label_en":"Flat 61","token":"azb61-kz68wf","sort":61},{"kind":"flat","label_ar":"شقة 62","label_en":"Flat 62","token":"azb62-wgfyu9","sort":62},{"kind":"flat","label_ar":"شقة 63","label_en":"Flat 63","token":"azb63-f3jjhw","sort":63},{"kind":"flat","label_ar":"شقة 64","label_en":"Flat 64","token":"azb64-tst374","sort":64},{"kind":"common","label_ar":"المنطقة العامة","label_en":"Common area","token":"azbc-b8xswv","sort":100}]},{"code":"SAY","ar":"مبنى السيب","en":"Seeb Building","units":[{"kind":"common","label_ar":"المنطقة العامة","label_en":"Common area","token":"sayc-a5s5va","sort":100}]},{"code":"MWL","ar":"مبنى الموالح","en":"Mawaleh Building","units":[{"kind":"common","label_ar":"المنطقة العامة","label_en":"Common area","token":"mwlc-25ss5i","sort":100}]},{"code":"BSH","ar":"مبنى بوشر","en":"Bousher Building","units":[{"kind":"common","label_ar":"المنطقة العامة","label_en":"Common area","token":"bshc-9arcwu","sort":100}]},{"code":"HO","ar":"المكتب الرئيسي","en":"Head Office","units":[{"kind":"common","label_ar":"المنطقة العامة","label_en":"Common area","token":"hoc-jxu2ur","sort":100}]},{"code":"SCC","ar":"سابكو سنتر","en":"SABCO Centre","units":[{"kind":"common","label_ar":"المنطقة العامة","label_en":"Common area","token":"sccc-2b2ze8","sort":100}]},{"code":"OBTS","ar":"الواحة على الشاطئ","en":"Oasis by the Sea","units":[{"kind":"common","label_ar":"المنطقة العامة","label_en":"Common area","token":"obtsc-tz7gxn","sort":100}]}]};
const QS = new URLSearchParams(location.search);
const DEMO = !!CFG.demo || QS.get('demo') === '1' || !(CFG.supabaseUrl && CFG.supabaseKey);
const LIVE = !DEMO && !!(CFG.supabaseUrl && CFG.supabaseKey);
const EMB = !!CFG.embedded;
const P = DEMO ? 'rasd.demo.' : 'rasd.';
const APP_URL = String(CFG.appUrl || (location.origin + location.pathname)).replace(/index\.html$/, '');
const TZ = 'Asia/Muscat';
const OFFSET = 4 * 3600e3; // Oman has no daylight saving
const VENDOR = Object.assign({ jsqr: 'vendor/jsQR.js', qrcode: 'vendor/qrcode.js', exceljs: 'vendor/exceljs.min.js', pptx: 'vendor/pptxgen.bundle.js', jszip: 'vendor/jszip.min.js' }, CFG.vendor || {});

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
  st_new: 'بانتظار التوزيع', st_accepted: 'في الطريق', st_onsite: 'جارٍ الإصلاح', st_finished: 'بانتظار التوقيع', st_closed: 'مغلق', st_cancelled: 'ملغي',
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
  t_track_title: 'طلب رقم {no}', t_step_sent: 'وصل الطلب لمسؤول الصيانة', t_step_acc: 'قبِل الفني الطلب', t_step_arr: 'وصل الفني',
  t_step_fin: 'انتهى الإصلاح', t_step_closed: 'تم الإغلاق', t_cancelled: 'تم إلغاء هذا الطلب.',
  t_confirm_title: 'أكّد انتهاء العمل', t_confirm_body: 'راجع صورة الإصلاح، ثم قيّم الخدمة ووقّع لإغلاق الطلب.',
  t_rating: 'تقييم الخدمة', t_comment: 'ملاحظة', t_signature: 'التوقيع', t_sign_here: 'وقّع هنا بإصبعك', t_clear: 'مسح',
  t_sign_submit: 'توقيع وإغلاق الطلب', t_need_rating: 'اختر التقييم', t_need_sig: 'التوقيع مطلوب',
  t_thanks: 'شكراً لك، تم إغلاق الطلب.', t_signed_onsite: 'تم التوقيع في الموقع.', t_new_req: 'إرسال طلب جديد',
  t_after_photo: 'صورة بعد الإصلاح', t_tech_note: 'تقرير الفني', t_not_found: 'لم نجد هذا الطلب.',
  t_staff_here: 'لديك مهمة في هذا الموقع', t_staff_arrive: 'تأكيد الوصول، طلب {no}',
  l_title: 'دخول فريق العمل', l_phone: 'رقم الهاتف', l_pin: 'الرمز السري (6 أرقام)', l_submit: 'دخول',
  l_bad: 'رقم الهاتف أو الرمز السري غير صحيح.', l_locked: 'أُوقف الدخول 15 دقيقة بعد 5 محاولات خاطئة.',
  l_forgot: 'نسيت الرمز؟ اطلب من المدير إعادة تعيينه.', l_demo: 'في النموذج التجريبي استخدم «تبديل الدور» للدخول بأي دور.',
  s_title: 'إعداد أول مرة', s_body: 'أنشئ حساب المدير. تظهر هذه الخطوة مرة واحدة فقط.', s_name: 'الاسم',
  s_pin2: 'أعد كتابة الرمز', s_mismatch: 'الرمزان غير متطابقين', s_submit: 'إنشاء الحساب',
  session_expired: 'انتهت الجلسة، سجّل الدخول من جديد.',
  n_jobs: 'المهام', n_history: 'سجلي', n_board: 'اللوحة', n_eval: 'التقييم', n_team: 'الفريق', n_qr: 'رموز QR', n_settings: 'الإعدادات',
  j_mine: 'مهامي الحالية', j_new: 'مهام جديدة مسندة إليك', j_none_mine: 'لا توجد مهام مفتوحة لديك.', j_none_new: 'لا توجد مهام جديدة مسندة إليك.',
  j_alert: 'طلب جديد: {u}',
  tm_way: 'زمن الوصول', tm_work: 'زمن الإصلاح', tm_sign: 'بانتظار التوقيع', tm_total: 'المدة الإجمالية',
  tm_pickup: 'زمن القبول', target: 'الهدف {m}', on_time: 'ضمن الوقت', late: 'متأخر',
  d_reported: 'وقت البلاغ', d_photo_before: 'صورة المشكلة', d_times: 'التوقيتات', d_log: 'سجل الأحداث',
  d_accept: 'قبول والتوجّه الآن', d_accept_ok: 'تم قبول الطلب وبدأ عدّاد الوصول.',
  d_arrive: 'وصلت: امسح رمز QR في الموقع', d_arrive_manual: 'تعذّر المسح؟ سجّل الوصول يدوياً',
  d_manual_reason: 'سبب عدم المسح', d_manual_warn: 'سيظهر للإدارة أن الوصول سُجّل دون مسح الرمز.',
  d_manual_submit: 'تسجيل الوصول يدوياً', d_arrived_ok: 'تم تسجيل وصولك وبدأ عدّاد الإصلاح.',
  d_finish_title: 'إنهاء العمل', d_after_photo: 'صورة بعد الإصلاح', d_note: 'ملاحظة عن العمل',
  d_note_ph: 'مثال: تم تغيير الوصلة وتجربة التشغيل', d_finish: 'إنهاء العمل', d_need_after: 'صورة بعد الإصلاح مطلوبة',
  d_finished_ok: 'تم إنهاء العمل، بانتظار توقيع صاحب الطلب.',
  d_wait_sign: 'اطلب من صاحب الطلب مسح رمز QR في الموقع من جواله، فيظهر له الطلب ليوقّع ويقيّم.',
  d_onsite: 'التوقيع على جهازي بدلاً من ذلك', d_signer: 'اسم الموقّع', d_signer_ph: 'مثال: صاحب الشقة أو حارس المبنى',
  d_need_signer: 'اكتب اسم الموقّع', d_onsite_warn: 'سيظهر للإدارة أن التوقيع تم على جهاز الفني.',
  d_close_req: 'إغلاق الطلب', d_closed_ok: 'تم إغلاق الطلب.', d_mgr: 'إجراءات الإدارة', d_assign: 'توزيع المهمة',
  d_reassign: 'نقل المهمة لشخص آخر', d_assign_btn: 'توزيع', d_pick_tech: 'اختر الهاندي مان أو الفني', d_assigned_ok: 'تم التوزيع، ووصله إشعار ليقبل المهمة.', d_priority: 'التصنيف',
  d_manual_close: 'إغلاق يدوي', d_cancel_req: 'إلغاء الطلب', d_reason: 'السبب', d_reason_need: 'اكتب السبب',
  d_signoff: 'الإغلاق والتقييم', d_signed_tenant: 'وقّع صاحب الطلب من جواله', d_signed_onsite: 'وُقّع على جهاز الفني',
  d_closed_manual: 'أُغلق يدوياً: {n}', d_cancelled: 'أُلغي: {n}', d_location: 'موقع الفني عند الوصول',
  d_from_building: 'يبعد {d} عن المبنى', d_accuracy: 'الدقة ± {d}', d_map: 'عرض على الخريطة', d_print: 'طباعة التقرير',
  d_by_qr: 'بمسح الرمز', d_by_manual: 'يدوياً', d_no_techs: 'أضف فنيين من صفحة الفريق أولاً.',
  ev_submitted: 'أرسل صاحب الطلب البلاغ', ev_accepted: 'قبِل الفني الطلب', ev_assigned: 'وُزّع على {n}',
  ev_reassigned: 'نُقل إلى {n}', ev_arrived_qr: 'وصل الفني ومسح رمز الموقع', ev_arrived_manual: 'وصل الفني (تسجيل يدوي)',
  ev_finished: 'انتهى الإصلاح', ev_signed_tenant: 'وقّع صاحب الطلب وقيّم الخدمة', ev_signed_onsite: 'توقيع على جهاز الفني: {n}',
  ev_closed_manual: 'أُغلق يدوياً', ev_cancelled: 'أُلغي الطلب', ev_priority_urgent: 'تغيّر التصنيف إلى عاجل',
  ev_priority_normal: 'تغيّر التصنيف إلى عادي',
  sc_title: 'امسح رمز QR في الموقع', sc_hint: 'وجّه الكاميرا إلى الملصق على الباب.',
  sc_no_cam: 'تعذّر تشغيل الكاميرا. اسمح للمتصفح باستخدامها، أو سجّل الوصول يدوياً.', sc_sim: 'محاكاة مسح الرمز (تجريبي)',
  sc_found: 'تمت قراءة الرمز…',
  b_open: 'المفتوحة', b_closed: 'المغلقة', b_all: 'الكل', b_search: 'بحث برقم الطلب أو الشقة أو الفني',
  b_k_new: 'بانتظار التوزيع', b_k_progress: 'قيد التنفيذ', b_k_sign: 'بانتظار التوقيع', b_k_late: 'متأخرة', b_k_today: 'أُغلقت اليوم',
  b_none: 'لا توجد طلبات هنا.', b_unassigned: 'لم يُوزَّع بعد',
  e_title: 'التقييم الشهري', e_contractor: 'المقاول: {n}', e_requests: 'الطلبات', e_closed_open: '{c} مغلقة · {o} مفتوحة',
  e_arr_on: 'الوصول ضمن الوقت', e_fix_on: 'الإصلاح ضمن الوقت', e_rating: 'متوسط التقييم', e_rated: 'من {n} تقييم',
  e_avg_pickup: 'متوسط القبول', e_avg_arrive: 'متوسط الوصول', e_avg_work: 'متوسط الإصلاح', e_score: 'الدرجة',
  e_techs: 'الفنيون', e_jobs: 'المهام', e_manual_arr: 'وصول دون مسح: {n}', e_onsite: 'توقيع على جهاز الفني: {n}',
  e_manual_close: 'إغلاق يدوي: {n}', e_repeat: 'عطل متكرر: {n}', e_csv: 'تنزيل CSV', e_csv_copy: 'نسخ البيانات',
  e_copied: 'تم نسخ البيانات', e_print: 'طباعة', e_none: 'لا توجد طلبات في هذا الشهر.',
  e_formula: 'الدرجة = 40% الوصول ضمن الوقت + 30% الإصلاح ضمن الوقت + 30% تقييم أصحاب الطلبات. لا يُحتسب وقت التوقف: انشغال الفني بطلب آخر، أو انتظار قطع الغيار، أو عدم تواجد المستأجر. العطل المتكرر: بلاغ جديد بنفس المشكلة في نفس الموقع خلال {d} يوماً من الإغلاق.',
  e_by_priority: 'حسب التصنيف', e_late_list: 'طلبات تجاوزت الوقت المستهدف', e_cancelled: 'ملغاة: {n}',
  e_col_count: 'العدد', h_title: 'سجلي', h_month: 'هذا الشهر',
  tm_title: 'فريق العمل', tm_add: 'إضافة عضو', tm_edit: 'تعديل', tm_name: 'الاسم', tm_phone: 'رقم الهاتف', tm_role: 'الدور',
  tm_active: 'الحساب نشط', tm_inactive: 'موقوف', tm_locked: 'مقفل مؤقتاً', tm_pin: 'الرمز السري (6 أرقام)',
  tm_pin_new: 'رمز جديد (اتركه فارغاً للإبقاء على الحالي)', tm_gen: 'توليد', tm_saved: 'تم الحفظ. أعطِ {n} الرمز السري {p} ورابط الدخول.',
  tm_saved_plain: 'تم الحفظ.', tm_readonly: 'إضافة الأعضاء وتعديلهم وحذفهم من صلاحية المدير فقط.', tm_share: 'رابط دخول الفريق',
  se_title: 'الإعدادات', se_contractor: 'اسم المقاول', se_targets: 'الأوقات المستهدفة بالدقائق', se_pickup: 'قبول الفني',
  se_arrive: 'وصول الهاندي مان', se_work: 'الإصلاح', se_buildings: 'المباني ووقت وصول غرفة العمليات', se_b_arrive: 'وقت الوصول لهذا المبنى حسب بعده عن المقر (اتركه فارغاً لاستخدام الوقت العام)',
  se_b_loc: 'موقع المبنى (لحساب بُعد الفني عند الوصول)', se_b_here: 'استخدم موقعي الحالي', se_issues: 'أنواع المشاكل وتصنيفها',
  se_add_issue: 'إضافة نوع', se_repeat: 'يُحتسب العطل متكرراً إذا تكرر خلال (يوم)', se_saved: 'تم حفظ الإعدادات.',
  se_note: 'التعديل يسري على الطلبات الجديدة، وتحتفظ الطلبات السابقة بأهدافها.', se_label_ar: 'بالعربية', se_label_en: 'بالإنجليزية',
  se_remove: 'حذف', se_loc_set: 'تم تحديد الموقع.', se_loc_fail: 'تعذّر تحديد الموقع.', se_lat: 'خط العرض', se_lng: 'خط الطول',
  q_title: 'رموز QR', q_print: 'طباعة الملصقات', q_open: 'فتح', q_copy: 'نسخ الرابط', q_copied: 'تم نسخ الرابط',
  q_add: 'إضافة موقع', q_building: 'المبنى', q_new_building: 'مبنى جديد', q_building_code: 'رمز المبنى (حروف إنجليزية)',
  q_building_ar: 'اسم المبنى بالعربية', q_building_en: 'اسم المبنى بالإنجليزية', q_kind: 'النوع', q_label_ar: 'الاسم بالعربية',
  q_label_en: 'الاسم بالإنجليزية', q_added: 'تمت الإضافة.', q_disable: 'إيقاف', q_enable: 'تفعيل',
  q_scan_ar: 'للإبلاغ عن عطل امسح الرمز', q_scan_en: 'Scan to report a maintenance problem', q_print_hint: 'اطبع على ورق A4 ثم قصّ الملصقات.',
  dm_title: 'متابعة أعمال الصيانة بالدقيقة', dm_lead: 'من بلاغ المستأجر إلى توقيعه، كل خطوة مسجّلة بوقتها: مسؤول الصيانة يوزّع، والهاندي مان أو الفني ينفّذ، والتقارير والتقييم الشهري جاهزة للمدير.',
  dm_s1: 'المستأجر يمسح رمز الشقة ويرسل البلاغ مع صورة، فيصل مباشرةً لمسؤول الصيانة.', dm_s2: 'مسؤول الصيانة يوزّع المهمة على الهاندي مان أو فني غرفة العمليات، فيصله إشعار ليقبلها.', dm_s3: 'الفني يقبل ويتوجّه ويمسح رمز الموقع عند وصوله، ثم يكتب تقريره وقطع الغيار، أو يطلب غرفة العمليات.',
  dm_s4: 'المستأجر يوقّع ويقيّم، والتقارير اليومية والتقييم الشهري تصل للمدير جاهزة.', dm_body: 'اختر دوراً وجرّب بنفسك. البيانات افتراضية وتبقى على جهازك فقط.',
  g_next: 'الخطوة التالية', g_tech: 'وزّع مسؤول الصيانة المهمة على {n}. ادخل بدوره واقبلها.', g_tech_btn: 'ادخل بدوره',
  g_tenant: 'ارجع لدور المستأجر ليراجع صورة الإصلاح ويوقّع ويقيّم.', g_tenant_btn: 'افتح صفحة المستأجر',
  g_admin: 'شاهد الطلب كما يراه المدير: من وزّعه ومتى، والتوقيتات كاملة، والتقرير وقطع الغيار والتوقيع والتقييم.', g_admin_btn: 'ادخل كمدير',
  g_ops: 'طلب الهاندي مان فني غرفة العمليات، فعاد البلاغ لمسؤول الصيانة ليوزّعه. ادخل بدوره.', g_ops_btn: 'ادخل كمسؤول الصيانة',
  dm_hm: 'الهاندي مان', dm_hm_body: 'في المبنى السكني: يستلم بلاغات مبناه أولاً، فيصلحها أو يحوّلها لغرفة العمليات.',
  dm_tenant: 'المستأجر', dm_tenant_body: 'يمسح رمز الشقة، يرسل البلاغ مع صورة، ثم يوقّع ويقيّم بعد الإصلاح.', dm_open_unit: 'افتح صفحة الموقع',
  dm_tech: 'فني غرفة العمليات', dm_tech_body: 'يستلم ما يحوّله الهاندي مان، وبلاغات المكتب الرئيسي وسابكو سنتر والواحة. هدف الوصول حسب بُعد المبنى.',
  dm_sup: 'مسؤول الصيانة', dm_sup_body: 'تصله كل البلاغات فور إرسالها، فيوزّع كل مهمة على الهاندي مان أو فني غرفة العمليات، ويتابع المتأخر والمعلّق، ويسجّل البلاغات الهاتفية.',
  dm_admin: 'المدير', dm_admin_body: 'التقارير اليومية والأسبوعية والشهرية، والتقييم الشهري للفنيين وللتوزيع، والفريق، والإعدادات، ورموز QR.',
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
  err_not_found: 'غير موجود.', err_not_assigned: 'هذه المهمة ليست مسندة إليك.', err_network: 'تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة.',
  err_not_configured: 'النظام غير مربوط بقاعدة البيانات بعد.', err_image: 'تعذّر قراءة الصورة. جرّب صورة أخرى.',
  err_generic: 'حدث خطأ غير متوقع. أعد المحاولة.', of100: 'من 100',
  pu_title: 'فعّل إشعارات الجوال', pu_body: 'ليصلك كل بلاغ أو مهمة فوراً حتى والجوال مقفل.', pu_btn: 'تفعيل الإشعارات',
  pu_done: 'تم التفعيل، ووصلك الآن إشعار تجربة.', pu_ios_title: 'الإشعارات على آيفون',
  pu_ios_body: 'اضغط زر المشاركة في Safari ثم «إضافة إلى الشاشة الرئيسية»، وافتح رصد من الأيقونة الجديدة وسجّل الدخول، ثم فعّل الإشعارات من هناك.',
  pu_unsupported: 'هذا المتصفح لا يعرض الإشعارات. استخدم Chrome على أندرويد، أو أضف رصد إلى الشاشة الرئيسية على آيفون.',
  pu_denied: 'الإشعارات محظورة لرصد على هذا الجهاز. اسمح بها من إعدادات المتصفح ثم أعد فتح الصفحة.',
  pu_admin_first: 'إشعارات الجوال غير مفعّلة للنظام بعد. فعّلها من الإعدادات.', pu_go_settings: 'فتح الإعدادات', pu_sys: 'إشعارات الجوال',
  pu_sys_intro: 'تُرسل الإشعارات عبر خدمة صغيرة في Supabase اسمها rasd-notify. بعد إنشائها اضغط الزر مرة واحدة.', pu_sys_btn: 'تفعيل إشعارات النظام',
  pu_sys_ok: 'تم إعداد الإشعارات للنظام.', pu_sender_ok: 'خدمة الإرسال تعمل.',
  pu_sender_bad: 'خدمة الإرسال لا تستجيب. تأكد من إنشاء rasd-notify في Edge Functions وإيقاف Verify JWT.',
  pu_phones: 'الأجهزة المفعّلة: {n}، لعدد {p} من الفريق.', pu_reminders_ok: 'تذكير مسؤول الصيانة بالبلاغات غير الموزّعة والمهام غير المقبولة يعمل كل 5 دقائق.',
  pu_reminders_off: 'التذكير غير متاح (pg_cron غير مفعّل).', pu_test: 'إرسال إشعار تجربة لي',
  pu_test_ok: 'أُرسل إشعار التجربة إلى {n} جهاز.', pu_test_none: 'لم تفعّل الإشعارات على أي جهاز بعد.', pu_on: 'الإشعارات مفعّلة', pu_off: 'لم يفعّل الإشعارات',
  pu_here: 'تفعيل على هذا الجهاز', ev_escalated: 'تذكير: لم يقبله الفني في الوقت المحدد',
  err_push_denied: 'لم يُسمح بالإشعارات على هذا الجهاز.', err_push_not_ready: 'إشعارات النظام غير مفعّلة بعد.',
  err_push_failed: 'تعذّر تفعيل الإشعارات على هذا الجهاز. أعد المحاولة.', err_bad_subscription: 'تعذّر تفعيل الإشعارات على هذا الجهاز. أعد المحاولة.',
  err_bad_keys: 'تعذّر إعداد الإشعارات. أعد المحاولة.',
  x_export_title: 'تصدير تقرير {m}', x_excel_d: 'كل الطلبات بتوقيتاتها، مع الملخص', x_pdf_d: 'تقرير جاهز للطباعة والإرسال', x_pptx_d: 'عرض جاهز للإدارة',
  x_summary: 'الملخص', x_requests: 'الطلبات', x_generated: 'أُعدّ في {d}', x_pdf_hint: 'في نافذة الطباعة اختر «حفظ بصيغة PDF».',
  x_minutes: 'بالدقائق', x_minutes_note: 'الأوقات في الجداول بالدقائق: الفعلي / المستهدف.', x_avg_arr_min: 'متوسط الوصول (دقيقة)', x_avg_work_min: 'متوسط الإصلاح (دقيقة)',
  x_arr_vs: 'الوصول / الهدف (د)', x_work_vs: 'الإصلاح / الهدف (د)', x_log: 'سجل الطلبات', x_count: 'عدد الطلبات: {n}', x_avg_pickup_note: 'متوسط القبول {v}',
  x_f_manual: 'وصول دون مسح الرمز', x_f_manual_d: 'سجّل الفني وصوله يدوياً مع ذكر السبب.', x_f_onsite: 'توقيع على جهاز الفني', x_f_onsite_d: 'وقّع صاحب الطلب على جوال الفني بدل جواله.',
  x_f_close: 'إغلاق يدوي', x_f_close_d: 'أغلقته الإدارة دون توقيع، مع ذكر السبب.', x_f_repeat: 'أعطال متكررة', x_f_repeat_d: 'بلاغ جديد بنفس المشكلة في نفس الموقع خلال {d} يوماً من الإغلاق.',
  yes: 'نعم', no: 'لا', col_accepted: 'قبول الفني', col_arrived: 'وقت الوصول', col_finished: 'انتهاء الإصلاح', col_closed: 'الإغلاق', col_repeat: 'عطل متكرر', col_desc: 'وصف المشكلة',
  col_method: 'طريقة الوصول', m_qr: 'مسح الرمز', m_manual: 'يدوي',
  p_eyebrow: 'رصد · التقرير الشهري', p_title: 'أداء فنيي {c}', p_title_plain: 'أداء فنيي الصيانة', p_score: 'درجة المقاول', p_s2: 'ملخص {m}',
  p_weak: 'أضعف مؤشر هذا الشهر: {k} ({v})', p_weights: '40% الوصول · 30% الإصلاح · 30% التقييم', p_s3: 'ترتيب الفنيين', p_best: 'الأعلى أداءً {a} ({x})، والأدنى {b} ({y})',
  p_jobs_line: '{n} مهمة · الوصول {a} · الإصلاح {f} · التقييم {r}', p_s4: 'العاجل والعادي', p_s4_sub: 'الأداء حسب تصنيف البلاغ', p_s5_sub: 'عدد الطلبات المتأخرة: {n}',
  p_more: 'باقي الطلبات المتأخرة ({n}) في ملف Excel.', p_none_late: 'كل الطلبات هذا الشهر ضمن الوقت المستهدف.', p_s6: 'مؤشرات للمتابعة', p_s6_sub: 'حالات تستحق المراجعة مع المقاول',
  p_s7: 'كيف تُجمع هذه الأرقام', p_s7_note: 'كل توقيت يسجّله الخادم، ولا يُغلق طلب دون صورة الإصلاح وتوقيع صاحب الطلب أو سبب مكتوب.',
  col_no: 'رقم الطلب', col_date: 'وقت البلاغ', col_building: 'المبنى', col_unit: 'الموقع', col_issue: 'المشكلة', col_priority: 'التصنيف', col_tech: 'الفني', col_status: 'الحالة',
  col_pickup: 'القبول (دقيقة)', col_arrive: 'الوصول (دقيقة)', col_arrive_t: 'هدف الوصول', col_arrive_ok: 'الوصول ضمن الوقت', col_work: 'الإصلاح (دقيقة)', col_work_t: 'هدف الإصلاح',
  col_work_ok: 'الإصلاح ضمن الوقت', col_total: 'الإجمالي (دقيقة)', col_qr: 'الوصول بمسح الرمز', col_rating: 'التقييم', col_close: 'طريقة الإغلاق',
  cm_tenant: 'توقيع صاحب الطلب', cm_onsite: 'توقيع على جهاز الفني', cm_manual: 'إغلاق يدوي',
  team_hm: 'هاندي مان', team_ops: 'غرفة العمليات', tech_hm: 'هاندي مان · {b}', tech_ops: 'فني · غرفة العمليات', role_hm: 'هاندي مان',
  stage_hm: 'عند الهاندي مان', stage_ops: 'عند غرفة العمليات', st_queued: 'بانتظار الفني', st_hold: 'معلّق',
  hold_busy: 'ينتظر انتهاء عمل آخر', hold_access: 'المستأجر غير متاح', hold_parts: 'بانتظار قطع غيار', hold_other: 'معلّق لسبب آخر',
  tm_paused: 'متوقف', tm_busy_on: 'بعد #{no}', d_target_from: 'الهدف {m} · قادم من {b}', d_target_in: 'الهدف {m} · داخل المبنى', d_target_ops: 'الهدف {m} · من غرفة العمليات',
  paused_note: 'توقف {d} لا يُحتسب', d_accept_busy: 'أقبله، لكني مشغول بعمل آخر الآن',
  b_title: 'مشغول بعمل آخر', b_body: 'يتوقف عدّاد الوصول لهذا الطلب، ويبدأ تلقائياً عند إنهائك العمل الذي بين يديك.',
  b_pick: 'ما العمل الذي تنهيه الآن؟', b_other: 'عمل آخر خارج رصد', b_other_ph: 'مثال: صيانة دورية لمضخات المياه',
  b_other_warn: 'عند انتهائك اضغط «أنا في الطريق الآن» ليبدأ عدّاد الوصول.', b_submit: 'قبول وإيقاف العدّاد', b_pause_submit: 'إيقاف العدّاد',
  d_pause_busy: 'مشغول بعمل آخر؟ أوقف عدّاد الوصول', d_pause_access: 'المستأجر غير متاح أو طلب موعداً آخر',
  d_access_title: 'المستأجر غير متاح', d_access_ph: 'مثال: طلب الحضور بعد الساعة 5 مساءً', d_access_when: 'الموعد الجديد',
  d_go_now: 'أنا في الطريق الآن', d_go_ok: 'بدأ عدّاد الوصول.', d_paused_ok: 'تم إيقاف العدّاد.',
  d_wait_auto: 'يبدأ عدّاد الوصول تلقائياً عند إنهائك الطلب #{no}.', d_wait_other: 'أنت مشغول بعمل خارج رصد: {n}',
  d_wait_access: 'المستأجر غير متاح: {n}', d_paused_title: 'العدّاد متوقف', d_paused_since: 'متوقف منذ {d}',
  d_hold_parts: 'بانتظار قطع غيار', d_hold_other: 'تعليق لسبب آخر', d_hold_title: 'تعليق العمل',
  d_parts_needed: 'القطع المطلوبة', d_eta: 'الموعد المتوقع لوصولها', d_other_ph: 'مثال: يحتاج موافقة المالك أو شركة متخصصة',
  d_hold_note: 'ملاحظة', d_hold_warn: 'يتوقف عدّاد الإصلاح، وعند عودتك امسح رمز الموقع ليستأنف.',
  d_resume_scan: 'عدت للموقع: امسح الرمز للاستئناف', d_resume_manual: 'تعذّر المسح؟ استأنف يدوياً', d_resume_submit: 'استئناف يدوياً',
  d_resumed_ok: 'استؤنف عدّاد الإصلاح.', d_held_since: 'معلّق منذ {d}', d_held_eta: 'المتوقع: {d}',
  d_escalate: 'طلب فني غرفة العمليات', d_escalate_body: 'يعود البلاغ لمسؤول الصيانة ليوزّعه على فني من غرفة العمليات. اكتب ما وجدته ليعرف الفني ماذا يحضر معه.',
  d_findings: 'ما الذي وجدته؟', d_escalate_ph: 'مثال: الكمبروسر لا يعمل، يحتاج فني تكييف وغاز', d_escalate_submit: 'إرسال لمسؤول الصيانة', d_escalated_ok: 'أُرسل لمسؤول الصيانة ليوزّعه على غرفة العمليات.',
  d_report: 'تقرير الفني', d_report_ph: 'ماذا وجدت وماذا أصلحت؟ مثال: الوصلة تحت المغسلة متآكلة، تم تغييرها وتجربة التشغيل',
  d_need_report: 'اكتب تقرير العمل', d_parts_used: 'قطع الغيار والمواد المستبدلة', d_part_name: 'اسم القطعة', d_part_qty: 'الكمية',
  d_add_part: 'إضافة قطعة', d_del_part: 'حذف', d_none_parts: 'لم تُستبدل أي قطعة', d_need_parts: 'أضف قطعة واحدة على الأقل',
  d_legs: 'مراحل الطلب', d_leg_now: 'الآن', leg_escalated: 'طلب غرفة العمليات', leg_reassigned: 'نُقلت المهمة لغيره', leg_finished: 'أصلحه', leg_open: 'يعمل عليه', leg_closed: 'أُغلق', leg_cancelled: 'أُلغي',
  d_inspect: 'الفحص',
  d_parts_list: 'القطع المستبدلة', d_parts_wait: 'القطع المنتظرة', d_source: 'المصدر',
  t_hold_busy: 'الفني ينهي عملاً آخر الآن، وسيتوجه إليك بعده مباشرة.', t_hold_access: 'تم تأجيل الزيارة إلى موعد مناسب.',
  t_hold_parts: 'طلبك بانتظار وصول قطع الغيار.', t_hold_eta: 'الموعد المتوقع: {d}', t_hold_other: 'طلبك معلّق مؤقتاً، وسيتابعه الفريق.',
  t_escalated: 'حُوِّل طلبك إلى فنيي غرفة العمليات المختصين.', t_parts: 'القطع المستبدلة',
  b_k_hold: 'معلّقة', b_hold: 'المعلّقة', b_all_buildings: 'كل المباني', b_new_req: 'بلاغ جديد',
  n_title: 'تسجيل بلاغ', n_sub: 'لبلاغ وصل بالهاتف أو واتساب أو حضورياً. يُحسب في التقارير كأي بلاغ آخر.', n_source: 'وصل البلاغ عن طريق',
  n_building: 'المبنى', n_unit: 'الموقع', n_requester: 'اسم صاحب البلاغ', n_photo: 'صورة', n_submit: 'تسجيل البلاغ',
  n_done: 'تم تسجيل البلاغ رقم {no}', n_share: 'أرسل لصاحب البلاغ رابط المتابعة ليتابع طلبه ويوقّع بعد الإصلاح.',
  n_wa: 'إرسال عبر واتساب', n_open: 'فتح الطلب', n_wa_text: 'تم استلام بلاغك رقم {no} لدى {o}. لمتابعته والتوقيع بعد الإصلاح: {u}',
  src_qr: 'رمز QR', src_phone: 'اتصال هاتفي', src_whatsapp: 'واتساب', src_walkin: 'حضورياً', src_email: 'بريد إلكتروني', src_other: 'أخرى',
  ev_logged: 'سُجّل البلاغ ({n})', ev_hold_busy: 'الفني مشغول بعمل آخر: توقف عدّاد الوصول', ev_hold_access: 'تعليق: المستأجر غير متاح',
  ev_hold_parts: 'تعليق: بانتظار قطع غيار', ev_hold_other: 'تعليق لسبب آخر', ev_resumed: 'الفني في الطريق: استؤنف عدّاد الوصول',
  ev_resumed_auto: 'بدأ عدّاد الوصول بعد إنهاء {n}', ev_resumed_qr: 'عاد الفني ومسح الرمز: استؤنف الإصلاح', ev_resumed_manual: 'عاد الفني (تسجيل يدوي): استؤنف الإصلاح',
  ev_to_ops: 'طلب الهاندي مان فني غرفة العمليات', ev_sent_ops: 'أُرسل لغرفة العمليات', ev_sent_hm: 'أُرسل للهاندي مان',
  err_bad_busy: 'اختر عملاً مفتوحاً لديك.', err_on_hold: 'العدّاد متوقف. اضغط «أنا في الطريق الآن» أولاً.',
  err_report_required: 'اكتب تقرير العمل (5 أحرف على الأقل).', err_parts_required: 'أضف قطعة واحدة على الأقل.', err_sites_required: 'اختر مبنى الهاندي مان.',
  tm_team: 'الفريق', tm_sites: 'المباني التي يغطيها', tm_hm_hint: 'يوزّع عليه مسؤول الصيانة بلاغات مبانيه، ويطلب غرفة العمليات لما يحتاجهم.',
  se_b_type: 'النوع', type_res: 'سكني', type_com: 'تجاري ومكاتب', se_b_ops: 'وصول غرفة العمليات (دقيقة)',
  se_b_hint: 'للمبنى السكني يُقترح الهاندي مان أولاً إن وُجد، وللتجاري فني غرفة العمليات. إذا كان الفني قادماً من مبنى آخر يُعتمد الوقت الأطول.',
  se_hm_note: 'التوزيع: من وصول البلاغ لمسؤول الصيانة إلى إسناده. القبول: من الإسناد إلى قبول الفني. وصول الهاندي مان: هو في المبنى نفسه فيُقاس وصوله بهذا الوقت، ووصول غرفة العمليات يُضبط لكل مبنى في الأسفل.',
  n_reports: 'التقارير', r_title: 'تقارير البلاغات', r_day: 'يومي', r_week: 'أسبوعي', r_month: 'شهري', r_today: 'اليوم', r_this_week: 'هذا الأسبوع', r_this_month: 'هذا الشهر',
  r_total: 'البلاغات', r_done: 'تم حلها', r_progress: 'قيد التنفيذ', r_hold: 'معلّقة', r_cancel: 'ملغاة', r_carried: 'مفتوحة من قبل',
  r_carried_s: 'بلاغات سابقة لم تُغلق', r_prev_day: 'عن اليوم السابق', r_prev_week: 'عن الأسبوع السابق', r_prev_month: 'عن الشهر السابق', r_same: 'نفس {p}',
  r_first_line: 'حلّها الهاندي مان بنفسه', r_arr_on: 'الوصول ضمن الوقت', r_fix_on: 'الإصلاح ضمن الوقت',
  r_trend_day: 'عدد البلاغات في آخر 14 يوماً', r_trend_week: 'عدد البلاغات في آخر 8 أسابيع', r_trend_month: 'عدد البلاغات في آخر 6 أشهر',
  r_urgent_part: 'منها عاجل', r_by_type: 'حسب الأهمية ونوع البلاغ', r_by_building: 'حسب المبنى', r_by_team: 'حسب الفريق',
  r_list: 'كل البلاغات', r_table: 'عرض كجدول', r_holds: 'البلاغات المعلّقة', r_none: 'لا توجد بلاغات في هذه الفترة.', r_all: 'الكل',
  r_f_building: 'المبنى', r_f_status: 'الحالة', r_f_priority: 'الأهمية', r_s_open: 'مفتوحة', r_s_done: 'تم حلها', r_s_hold: 'معلّقة', r_s_cancel: 'ملغاة',
  r_week_of: '{a} – {b}', r_col_type: 'النوع', r_col_open: 'مفتوحة', r_col_avg_fix: 'متوسط الإصلاح', r_col_avg_arr: 'متوسط الوصول',
  r_hm_fixed: 'أصلحها الهاندي مان', r_hm_handed: 'طلب غرفة العمليات', r_ops_direct: 'لغرفة العمليات مباشرة', r_ops_fixed: 'أصلحها فنيو غرفة العمليات',
  r_export: 'تصدير تقرير {p}', x_period_excel_d: 'كل البلاغات بتفاصيلها وتقارير الفنيين وقطع الغيار، مع الملخص', x_period_pdf_d: 'تقرير جاهز للطباعة أو الحفظ PDF',
  x_parts_sheet: 'قطع الغيار', x_holds_sheet: 'المعلّقة', x_counts_sheet: 'العدد اليومي', x_visits: 'الزيارات',
  col_time: 'الوقت', col_source: 'المصدر', col_hold: 'سبب التعليق', col_hold_since: 'معلّق منذ', col_eta: 'الموعد المتوقع', col_by: 'نفّذه',
  col_team: 'الفريق', col_handed: 'محوّل لغرفة العمليات', col_hm: 'الهاندي مان', col_paused_a: 'توقف قبل الوصول (دقيقة)', col_paused_w: 'توقف أثناء العمل (دقيقة)',
  col_report: 'تقرير الفني', col_parts: 'قطع الغيار المستبدلة', col_part: 'القطعة', col_qty: 'الكمية', col_comment: 'ملاحظة صاحب الطلب', col_count: 'العدد',
  col_urgent: 'عاجل', col_normal: 'عادي', col_period: 'الفترة', col_outcome: 'النتيجة', col_parts_wait: 'القطع المنتظرة', col_note: 'ملاحظة',
  e_by_team: 'حسب الفريق', e_hm_group: 'الهاندي مان', e_ops_group: 'فنيو غرفة العمليات', e_paused: 'توقف لا يُحتسب', e_self_fixed: 'أصلحها بنفسه', e_visits: 'الزيارات',
  p_s8: 'الهاندي مان وغرفة العمليات', p_s8_sub: 'الأداء حسب الفريق', p_team_line: '{n} زيارة · الوصول {a} · الإصلاح {f}',
  st_assigned: 'بانتظار قبول الفني',
  t_step_assigned: 'أُسند إلى الفني',
  j_alert_mine: 'أُسندت إليك مهمة: {u}',
  j_how: 'يوزّع مسؤول الصيانة البلاغات، فتصلك مهمتك هنا مع إشعار على جوالك.',
  tm_q: 'بانتظار التوزيع',
  tm_ack: 'بانتظار القبول',
  tm_dispatch: 'زمن التوزيع',
  d_dispatch_body: 'اختر من يتولى البلاغ. يصله إشعار على جواله، ويبدأ عدّاد الوصول بعد أن يقبله.',
  d_reassign_body: 'يبقى ما سجّله السابق في مراحل الطلب، ويصل للجديد إشعار ليقبل المهمة.',
  d_people: 'من يتولى المهمة؟',
  d_own_b: 'مسؤول عن هذا المبنى',
  d_free: 'متفرغ',
  d_load: 'مهام مفتوحة: {n}',
  d_now_at: 'الآن في {b}',
  d_goal: 'هدف الوصول {m}',
  d_was_declined: 'اعتذر عنه',
  d_note_for: 'ملاحظة له',
  d_note_for_ph: 'مثال: المستأجر في البيت بعد العصر، والمفتاح عند الحارس',
  d_dispatch_submit: 'توزيع المهمة',
  d_by_line: 'وزّعه {n}',
  d_q_declined: 'اعتذر {n}: {m}',
  d_q_escalated: 'طلب {n} فني غرفة العمليات: {m}',
  c_declined: 'اعتذر {n}',
  d_wait_tech: 'بانتظار أن يقبله {n}',
  d_your_turn: 'أسنده إليك {n}',
  d_decline: 'اعتذار عن المهمة',
  d_decline_title: 'الاعتذار عن المهمة',
  d_decline_body: 'تعود المهمة لمسؤول الصيانة ليوزّعها على غيرك. اكتب السبب.',
  d_decline_ph: 'مثال: أنا في مبنى آخر بمهمة عاجلة حتى المساء',
  d_decline_submit: 'اعتذار',
  d_declined_ok: 'تم الاعتذار، وعادت المهمة لمسؤول الصيانة.',
  d_gone: 'لم تعد هذه المهمة مسندة إليك.',
  ev_late_dispatch: 'تذكير: لم يُوزَّع في الوقت المحدد',
  ev_declined: 'اعتذر الفني عن المهمة',
  b_k_assigned: 'بانتظار القبول',
  b_rest: 'قيد المتابعة',
  e_avg_dispatch: 'متوسط التوزيع',
  e_dispatch_on: 'التوزيع ضمن الوقت',
  e_dispatches: 'مرات التوزيع',
  e_declines: 'اعتذار: {n}',
  e_sup_title: 'توزيع البلاغات',
  e_sup_note: 'من وصول البلاغ لمسؤول الصيانة إلى إسناده لأحد الفريق. لا يدخل في درجة الفنيين.',
  se_dispatch: 'توزيع مسؤول الصيانة',
  g_sup: 'وصل البلاغ لمسؤول الصيانة. ادخل بدوره ووزّع المهمة على الهاندي مان أو الفني.',
  g_sup_btn: 'ادخل كمسؤول الصيانة',
  dm_team: 'الهاندي مان والفني',
  dm_team_body: 'تصله المهام التي يوزّعها عليه مسؤول الصيانة، فيقبلها ويتوجّه ويمسح رمز الموقع، ثم يكتب تقريره وقطع الغيار.',
  col_dispatch: 'التوزيع (دقيقة)',
  col_assigned_by: 'وزّعه',
  col_declines: 'اعتذارات',
  leg_declined: 'اعتذر',
  leg_waiting: 'بانتظار قبوله',
  t_q: 'وصل طلبك لمسؤول الصيانة، وسيُسند إلى الفني المختص.',
  n_assign: 'توزيع المهمة الآن',
  n_assign_later: 'لاحقاً من اللوحة',
  tm_wait_s: 'الانتظار',
  st_assigned_me: 'بانتظار قبولك',
  tm_only_you: 'أنت وحدك تضيف الأعضاء وتعدّلهم وتحذفهم، وتغيّر الإعدادات ورموز QR. هذه الصلاحية محمية في قاعدة البيانات نفسها، ولا تُعطى لأحد غيرك.',
  tm_self_role: 'المدير · حسابك',
  tm_delete: 'حذف من الفريق',
  tm_delete_q: 'حذف {n} من الفريق؟',
  tm_delete_body: 'لن يستطيع الدخول بعد الآن، ويبقى ما سجّله من أعمال في التقارير والتقييم.',
  tm_delete_btn: 'حذف',
  tm_deleted: 'حُذف {n} من الفريق.',
  se_only_you: 'الإعدادات تُعدّل من حسابك فقط.',
  err_has_open_jobs: 'لديه مهام مفتوحة. انقلها لغيره من اللوحة أولاً، ثم احذفه.',
  err_one_admin: 'صلاحية المدير لحسابك وحدك ولا تُعطى لغيرك.',
  r_units: 'الشقق',
  r_this_year: 'هذا العام',
  u_title: 'تقرير الشقق والمواقع',
  u_sub: 'عدد البلاغات في كل شقة أو منطقة عامة شهراً بشهر، ومقارنتها بالعام السابق، ونوع كل بلاغ.',
  u_year_total: 'بلاغات {y}',
  u_vs: 'عن {y}',
  u_places: 'مواقع لها بلاغات',
  u_of: 'من {n} موقعاً',
  u_top_place: 'الأكثر بلاغات',
  u_top_type: 'النوع الأكثر',
  u_matrix: 'عدد البلاغات في كل موقع شهرياً',
  u_place: 'الموقع',
  u_total: 'المجموع',
  u_types_col: 'الأكثر تكراراً',
  u_quiet: '{n} مواقع بلا أي بلاغ في {y}.',
  u_open_hint: 'اضغط على أي موقع لعرض سجله الكامل.',
  u_less: 'أقل',
  u_more: 'أكثر',
  u_by_type: 'حسب نوع البلاغ',
  u_type_hint: 'اضغط على نوع لعرض المواقع التي تكرر فيها.',
  u_all_types: 'كل أنواع البلاغات',
  u_none: 'لا توجد بلاغات في {y}.',
  u_history: 'سجل الموقع',
  u_history_link: 'سجل هذا الموقع',
  u_all_time: 'كل البلاغات',
  u_since: 'منذ {d}',
  u_by_year: 'حسب السنة والشهر',
  u_back: 'تقرير الشقق',
  u_repeat: 'أعطال تكررت بعد الإصلاح',
  u_repeat_s: 'خلال {d} يوماً',
  u_list: 'كل البلاغات في هذا الموقع',
  u_export: 'تصدير تقرير الشقق {y}',
  u_export_one: 'تصدير سجل الموقع',
  x_units_d: 'كل المواقع شهرياً مع المقارنة السنوية وأنواع البلاغات',
  x_unit_d: 'السجل حسب السنة والشهر والنوع، وكل البلاغات بتفاصيلها',
  x_units_sheet: 'المواقع شهرياً',
  x_unit_types_sheet: 'المواقع حسب النوع',
  x_types_sheet: 'الأنواع شهرياً',
  u_change: 'الفرق',
  u_kind: 'النوع'
},
en: {
  app: 'Rasd', tagline: 'Maintenance tracking', demo_banner: 'Demo with sample data', demo_switch: 'Switch role',
  lang_other: 'العربية', loading: 'Loading…', retry: 'Try again', back: 'Back', save: 'Save', cancel: 'Cancel',
  close: 'Close', confirm: 'Confirm', optional: 'optional', min: 'min', hr: 'h', day: 'd', logout: 'Sign out',
  role_technician: 'Technician', role_supervisor: 'Maintenance supervisor', role_admin: 'Manager',
  st_new: 'To assign', st_accepted: 'On the way', st_onsite: 'Being fixed', st_finished: 'Awaiting sign-off', st_closed: 'Closed', st_cancelled: 'Cancelled',
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
  t_track_title: 'Request {no}', t_step_sent: 'Received by the maintenance supervisor', t_step_acc: 'Technician accepted', t_step_arr: 'Technician arrived',
  t_step_fin: 'Repair finished', t_step_closed: 'Closed', t_cancelled: 'This request was cancelled.',
  t_confirm_title: 'Confirm the work is done', t_confirm_body: 'Check the photo of the repair, then rate the service and sign to close the request.',
  t_rating: 'Rate the service', t_comment: 'Comment', t_signature: 'Signature', t_sign_here: 'Sign here with your finger', t_clear: 'Clear',
  t_sign_submit: 'Sign and close request', t_need_rating: 'Choose a rating', t_need_sig: 'Your signature is required',
  t_thanks: 'Thank you. The request is closed.', t_signed_onsite: 'Signed on site.', t_new_req: 'Send a new request',
  t_after_photo: 'Photo after the repair', t_tech_note: "Technician's report", t_not_found: 'We could not find this request.',
  t_staff_here: 'You have a job at this location', t_staff_arrive: 'Confirm arrival for request {no}',
  l_title: 'Team sign-in', l_phone: 'Phone number', l_pin: 'PIN (6 digits)', l_submit: 'Sign in',
  l_bad: 'Wrong phone number or PIN.', l_locked: 'Sign-in is paused for 15 minutes after 5 wrong tries.',
  l_forgot: 'Forgot your PIN? Ask the admin to reset it.', l_demo: 'In the demo, use “Switch role” to enter as anyone.',
  s_title: 'First-time setup', s_body: 'Create the admin account. This step appears only once.', s_name: 'Name',
  s_pin2: 'Repeat the PIN', s_mismatch: 'The two PINs do not match', s_submit: 'Create account',
  session_expired: 'Your session ended. Please sign in again.',
  n_jobs: 'Jobs', n_history: 'My record', n_board: 'Board', n_eval: 'Evaluation', n_team: 'Team', n_qr: 'QR codes', n_settings: 'Settings',
  j_mine: 'My current jobs', j_new: 'New jobs for you', j_none_mine: 'You have no open jobs.', j_none_new: 'No new jobs for you.',
  j_alert: 'New request: {u}',
  tm_way: 'Time to arrive', tm_work: 'Repair time', tm_sign: 'Awaiting sign-off', tm_total: 'Total time',
  tm_pickup: 'Time to accept', target: 'target {m}', on_time: 'On time', late: 'Late',
  d_reported: 'Reported', d_photo_before: 'Photo of the problem', d_times: 'Timings', d_log: 'Event log',
  d_accept: 'Accept and go now', d_accept_ok: 'Accepted. The arrival timer has started.',
  d_arrive: "I've arrived: scan the QR code on site", d_arrive_manual: "Can't scan? Record arrival manually",
  d_manual_reason: 'Why could you not scan?', d_manual_warn: 'Management will see that arrival was recorded without a scan.',
  d_manual_submit: 'Record arrival manually', d_arrived_ok: 'Arrival recorded. The repair timer has started.',
  d_finish_title: 'Finish the job', d_after_photo: 'Photo after the repair', d_note: 'Note about the work',
  d_note_ph: 'Example: replaced the hose and tested it', d_finish: 'Finish job', d_need_after: 'An after-repair photo is required',
  d_finished_ok: 'Job finished. Waiting for the requester to sign.',
  d_wait_sign: 'Ask the requester to scan the QR code on site with their phone. The request opens for them to sign and rate.',
  d_onsite: 'Sign on my phone instead', d_signer: "Signer's name", d_signer_ph: 'e.g. the tenant or the building guard',
  d_need_signer: "Enter the signer's name", d_onsite_warn: "Management will see this was signed on the technician's phone.",
  d_close_req: 'Close request', d_closed_ok: 'Request closed.', d_mgr: 'Management actions', d_assign: 'Assign the job',
  d_reassign: 'Give the job to someone else', d_assign_btn: 'Assign', d_pick_tech: 'Choose a handyman or technician', d_assigned_ok: 'Assigned. They have been notified to accept it.', d_priority: 'Priority',
  d_manual_close: 'Close manually', d_cancel_req: 'Cancel request', d_reason: 'Reason', d_reason_need: 'Please give a reason',
  d_signoff: 'Sign-off and rating', d_signed_tenant: 'Signed by the requester on their phone', d_signed_onsite: "Signed on the technician's phone",
  d_closed_manual: 'Closed manually: {n}', d_cancelled: 'Cancelled: {n}', d_location: "Technician's location on arrival",
  d_from_building: '{d} from the building', d_accuracy: 'accuracy ± {d}', d_map: 'Show on map', d_print: 'Print report',
  d_by_qr: 'by QR scan', d_by_manual: 'manually', d_no_techs: 'Add technicians on the Team page first.',
  ev_submitted: 'Request sent by the requester', ev_accepted: 'Technician accepted', ev_assigned: 'Assigned to {n}',
  ev_reassigned: 'Moved to {n}', ev_arrived_qr: 'Technician arrived and scanned the code', ev_arrived_manual: 'Technician arrived (manual record)',
  ev_finished: 'Repair finished', ev_signed_tenant: 'Requester signed and rated', ev_signed_onsite: "Signed on the technician's phone: {n}",
  ev_closed_manual: 'Closed manually', ev_cancelled: 'Request cancelled', ev_priority_urgent: 'Priority changed to urgent',
  ev_priority_normal: 'Priority changed to normal',
  sc_title: 'Scan the QR code on site', sc_hint: 'Point the camera at the label on the door.',
  sc_no_cam: 'Could not start the camera. Allow camera access, or record arrival manually.', sc_sim: 'Simulate the scan (demo)',
  sc_found: 'Code read…',
  b_open: 'Open', b_closed: 'Closed', b_all: 'All', b_search: 'Search by number, flat or technician',
  b_k_new: 'To assign', b_k_progress: 'In progress', b_k_sign: 'Awaiting sign-off', b_k_late: 'Late', b_k_today: 'Closed today',
  b_none: 'No requests here.', b_unassigned: 'Not assigned yet',
  e_title: 'Monthly evaluation', e_contractor: 'Contractor: {n}', e_requests: 'Requests', e_closed_open: '{c} closed · {o} open',
  e_arr_on: 'Arrived on time', e_fix_on: 'Fixed on time', e_rating: 'Average rating', e_rated: 'from {n} ratings',
  e_avg_pickup: 'Avg. time to accept', e_avg_arrive: 'Average arrival', e_avg_work: 'Average repair', e_score: 'Score',
  e_techs: 'Technicians', e_jobs: 'Jobs', e_manual_arr: 'Arrivals without scan: {n}', e_onsite: "Signed on tech's phone: {n}",
  e_manual_close: 'Closed manually: {n}', e_repeat: 'Repeat faults: {n}', e_csv: 'Download CSV', e_csv_copy: 'Copy data',
  e_copied: 'Data copied', e_print: 'Print', e_none: 'No requests in this month.',
  e_formula: 'Score = 40% arrival on time + 30% repair on time + 30% requester rating. Paused time is not counted: the technician busy with another job, waiting for parts, or the tenant unavailable. A repeat fault is a new report of the same problem at the same location within {d} days of closing.',
  e_by_priority: 'By priority', e_late_list: 'Requests that missed their target', e_cancelled: 'Cancelled: {n}',
  e_col_count: 'Count', h_title: 'My record', h_month: 'This month',
  tm_title: 'Team', tm_add: 'Add member', tm_edit: 'Edit', tm_name: 'Name', tm_phone: 'Phone number', tm_role: 'Role',
  tm_active: 'Account active', tm_inactive: 'Disabled', tm_locked: 'Temporarily locked', tm_pin: 'PIN (6 digits)',
  tm_pin_new: 'New PIN (leave empty to keep the current one)', tm_gen: 'Generate', tm_saved: 'Saved. Give {n} the PIN {p} and the sign-in link.',
  tm_saved_plain: 'Saved.', tm_readonly: 'Only the manager can add, change or remove members.', tm_share: 'Team sign-in link',
  se_title: 'Settings', se_contractor: 'Contractor name', se_targets: 'Target times in minutes', se_pickup: 'Technician accepts',
  se_arrive: 'Handyman arrival', se_work: 'Repair', se_buildings: 'Buildings and operations-room travel time', se_b_arrive: 'Arrival target for this building, by its distance from base (leave empty to use the general target)',
  se_b_loc: "Building location (to measure the technician's distance on arrival)", se_b_here: 'Use my current location', se_issues: 'Problem types and priority',
  se_add_issue: 'Add type', se_repeat: 'Count a fault as repeat within (days)', se_saved: 'Settings saved.',
  se_note: 'Changes apply to new requests; earlier requests keep their targets.', se_label_ar: 'Arabic', se_label_en: 'English',
  se_remove: 'Remove', se_loc_set: 'Location set.', se_loc_fail: 'Could not get the location.', se_lat: 'Latitude', se_lng: 'Longitude',
  q_title: 'QR codes', q_print: 'Print labels', q_open: 'Open', q_copy: 'Copy link', q_copied: 'Link copied',
  q_add: 'Add location', q_building: 'Building', q_new_building: 'New building', q_building_code: 'Building code (letters)',
  q_building_ar: 'Building name in Arabic', q_building_en: 'Building name in English', q_kind: 'Type', q_label_ar: 'Name in Arabic',
  q_label_en: 'Name in English', q_added: 'Added.', q_disable: 'Switch off', q_enable: 'Switch on',
  q_scan_ar: 'للإبلاغ عن عطل امسح الرمز', q_scan_en: 'Scan to report a maintenance problem', q_print_hint: 'Print on A4 paper, then cut out the labels.',
  dm_title: 'Maintenance work, tracked to the minute', dm_lead: 'From the tenant\'s report to their signature, every step is time-stamped: the maintenance supervisor assigns, the handyman or technician does the work, and the reports and monthly score are ready for the manager.',
  dm_s1: 'The tenant scans the flat code and sends the report with a photo; it goes straight to the maintenance supervisor.', dm_s2: 'The supervisor gives the job to the building handyman or an operations-room technician, who is notified to accept it.', dm_s3: 'The technician accepts, heads there and scans the code on arrival, then writes the report and parts used, or asks for the operations room.',
  dm_s4: 'The tenant signs and rates; daily reports and the monthly score reach the manager ready-made.', dm_body: 'Pick a role and try it yourself. The data is sample data and stays on your device.',
  g_next: 'Next step', g_tech: 'The supervisor gave the job to {n}. Switch to them and accept it.', g_tech_btn: 'Enter as them',
  g_tenant: 'Switch back to the tenant to check the repair photo, sign and rate.', g_tenant_btn: 'Open the tenant page',
  g_admin: 'See the request as the manager sees it: who assigned it and when, every timing, the report and parts, the signature and the rating.', g_admin_btn: 'Enter as the manager',
  g_ops: 'The handyman asked for the operations room, so the request went back to the supervisor to assign. Switch to him.', g_ops_btn: 'Enter as the supervisor',
  dm_hm: 'Handyman', dm_hm_body: 'In the residential building: gets its requests first, then fixes them or hands them to the operations room.',
  dm_tenant: 'Tenant', dm_tenant_body: 'Scans the flat code, sends the report with a photo, then signs and rates after the repair.', dm_open_unit: 'Open the location page',
  dm_tech: 'Operations-room technician', dm_tech_body: 'Takes what the handymen hand over, and requests at Head Office, SABCO Centre and Oasis. Arrival targets follow the distance.',
  dm_sup: 'Maintenance supervisor', dm_sup_body: 'Gets every request as soon as it is sent and gives each job to a handyman or an operations-room technician; follows late and paused work and logs phone reports.',
  dm_admin: 'Manager', dm_admin_body: 'Daily, weekly and monthly reports, the monthly score for the technicians and for assigning, the team, settings and QR codes.',
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
  err_not_found: 'Not found.', err_not_assigned: 'This job is not assigned to you.', err_network: 'Could not connect. Check the internet and try again.',
  err_not_configured: 'The system is not connected to its database yet.', err_image: 'Could not read the photo. Try another one.',
  err_generic: 'Something went wrong. Please try again.', of100: 'out of 100',
  pu_title: 'Turn on phone notifications', pu_body: 'Get every request or job right away, even when the phone is locked.', pu_btn: 'Turn on notifications',
  pu_done: 'Done. A test notification is on its way.', pu_ios_title: 'Notifications on iPhone',
  pu_ios_body: 'In Safari tap Share, then “Add to Home Screen”. Open Rasd from the new icon, sign in, and turn on notifications there.',
  pu_unsupported: 'This browser cannot show notifications. Use Chrome on Android, or add Rasd to the Home Screen on iPhone.',
  pu_denied: 'Notifications are blocked for Rasd on this device. Allow them in the browser settings, then reopen the page.',
  pu_admin_first: 'Phone notifications are not set up yet. Set them up in Settings.', pu_go_settings: 'Open Settings', pu_sys: 'Phone notifications',
  pu_sys_intro: 'Notifications are sent by a small Supabase service called rasd-notify. Once it exists, press the button once.', pu_sys_btn: 'Set up notifications',
  pu_sys_ok: 'Notifications are set up.', pu_sender_ok: 'The sender is working.',
  pu_sender_bad: 'The sender does not respond. Check that rasd-notify exists in Edge Functions and that Verify JWT is off.',
  pu_phones: 'Phones with notifications: {n}, for {p} team members.', pu_reminders_ok: 'Reminders to the supervisor for requests not yet assigned or accepted run every 5 minutes.',
  pu_reminders_off: 'Reminders are off (pg_cron is not enabled).', pu_test: 'Send me a test',
  pu_test_ok: 'Test sent to {n} device(s).', pu_test_none: 'You have not turned on notifications on any device yet.', pu_on: 'Notifications on', pu_off: 'Notifications off',
  pu_here: 'Turn on for this device', ev_escalated: 'Reminder: not accepted in time',
  err_push_denied: 'Notifications were not allowed on this device.', err_push_not_ready: 'Notifications are not set up yet.',
  err_push_failed: 'Could not turn on notifications on this device. Try again.', err_bad_subscription: 'Could not turn on notifications on this device. Try again.',
  err_bad_keys: 'Could not set up notifications. Try again.',
  x_export_title: 'Export the {m} report', x_excel_d: 'Every request with its timings, plus the summary', x_pdf_d: 'A report ready to print or send', x_pptx_d: 'A deck ready for management',
  x_summary: 'Summary', x_requests: 'Requests', x_generated: 'Generated {d}', x_pdf_hint: 'In the print window, choose “Save as PDF”.',
  x_minutes: 'in minutes', x_minutes_note: 'Times in the tables are in minutes: actual / target.', x_avg_arr_min: 'Avg arrival (min)', x_avg_work_min: 'Avg repair (min)',
  x_arr_vs: 'Arrival / target (min)', x_work_vs: 'Repair / target (min)', x_log: 'Request log', x_count: 'Requests: {n}', x_avg_pickup_note: 'Avg. time to accept {v}',
  x_f_manual: 'Arrivals without a scan', x_f_manual_d: 'The technician recorded arrival by hand, with a reason.', x_f_onsite: "Signed on the technician's phone", x_f_onsite_d: "The requester signed on the technician's phone instead of their own.",
  x_f_close: 'Closed manually', x_f_close_d: 'Management closed it without a signature, with a reason.', x_f_repeat: 'Repeat faults', x_f_repeat_d: 'A new report of the same problem at the same location within {d} days of closing.',
  yes: 'Yes', no: 'No', col_accepted: 'Accepted', col_arrived: 'Arrived', col_finished: 'Finished', col_closed: 'Closed', col_repeat: 'Repeat fault', col_desc: 'Description',
  col_method: 'Arrival record', m_qr: 'QR scan', m_manual: 'Manual',
  p_eyebrow: 'Rasd · Monthly report', p_title: '{c} technicians', p_title_plain: 'Maintenance technicians', p_score: 'Contractor score', p_s2: '{m} at a glance',
  p_weak: 'Weakest measure this month: {k} ({v})', p_weights: '40% arrival · 30% repair · 30% rating', p_s3: 'Technician ranking', p_best: 'Highest: {a} ({x}). Lowest: {b} ({y})',
  p_jobs_line: '{n} jobs · arrival {a} · repair {f} · rating {r}', p_s4: 'Urgent and normal requests', p_s4_sub: 'Performance by request priority', p_s5_sub: 'Late requests: {n}',
  p_more: 'The other {n} late requests are in the Excel file.', p_none_late: 'Every request this month met its targets.', p_s6: 'Points to follow up', p_s6_sub: 'Cases worth reviewing with the contractor',
  p_s7: 'Where these numbers come from', p_s7_note: "Every time is recorded by the server, and no request closes without a repair photo and the requester's signature or a written reason.",
  col_no: 'Request no.', col_date: 'Reported', col_building: 'Building', col_unit: 'Location', col_issue: 'Problem', col_priority: 'Priority', col_tech: 'Technician', col_status: 'Status',
  col_pickup: 'Accept (min)', col_arrive: 'Arrival (min)', col_arrive_t: 'Arrival target', col_arrive_ok: 'Arrived on time', col_work: 'Repair (min)', col_work_t: 'Repair target',
  col_work_ok: 'Fixed on time', col_total: 'Total (min)', col_qr: 'Arrival by QR scan', col_rating: 'Rating', col_close: 'Closed by',
  cm_tenant: 'Requester signature', cm_onsite: "Signed on technician's phone", cm_manual: 'Closed manually',
  team_hm: 'Handyman', team_ops: 'Operations room', tech_hm: 'Handyman · {b}', tech_ops: 'Technician · Operations room', role_hm: 'Handyman',
  stage_hm: 'with the handyman', stage_ops: 'with the operations room', st_queued: 'Queued', st_hold: 'On hold',
  hold_busy: 'Waiting for another job', hold_access: 'Tenant unavailable', hold_parts: 'Waiting for parts', hold_other: 'On hold, other reason',
  tm_paused: 'Paused', tm_busy_on: 'after #{no}', d_target_from: 'target {m} · coming from {b}', d_target_in: 'target {m} · in the building', d_target_ops: 'target {m} · from the operations room',
  paused_note: '{d} paused, not counted', d_accept_busy: "Accept, but I'm busy with another job",
  b_title: 'Busy with another job', b_body: 'The arrival timer for this request waits, and starts by itself when you finish the job you are on.',
  b_pick: 'Which job are you finishing now?', b_other: 'Other work, not in Rasd', b_other_ph: 'e.g. routine maintenance of the water pumps',
  b_other_warn: 'When you finish, tap “On my way now” to start the arrival timer.', b_submit: 'Accept and pause the timer', b_pause_submit: 'Pause the timer',
  d_pause_busy: 'Busy with another job? Pause the arrival timer', d_pause_access: 'Tenant unavailable or asked for another time',
  d_access_title: 'Tenant unavailable', d_access_ph: 'e.g. asked us to come after 5 pm', d_access_when: 'New time',
  d_go_now: "I'm on my way now", d_go_ok: 'The arrival timer has started.', d_paused_ok: 'Timer paused.',
  d_wait_auto: 'The arrival timer starts by itself when you finish #{no}.', d_wait_other: 'You are on work outside Rasd: {n}',
  d_wait_access: 'Tenant unavailable: {n}', d_paused_title: 'Timer paused', d_paused_since: 'Paused for {d}',
  d_hold_parts: 'Waiting for parts', d_hold_other: 'Pause for another reason', d_hold_title: 'Pause the job',
  d_parts_needed: 'Parts needed', d_eta: 'Expected date', d_other_ph: "e.g. needs the owner's approval or a specialist company",
  d_hold_note: 'Note', d_hold_warn: 'The repair timer stops. When you are back, scan the location code to resume.',
  d_resume_scan: "I'm back on site: scan to resume", d_resume_manual: "Can't scan? Resume manually", d_resume_submit: 'Resume manually',
  d_resumed_ok: 'The repair timer is running again.', d_held_since: 'On hold for {d}', d_held_eta: 'Expected: {d}',
  d_escalate: 'Ask for the operations room', d_escalate_body: 'The request goes back to the maintenance supervisor to give to an operations-room technician. Write what you found so they know what to bring.',
  d_findings: 'What did you find?', d_escalate_ph: 'e.g. the compressor is dead; needs an AC technician and gas', d_escalate_submit: 'Send to the supervisor', d_escalated_ok: 'Sent to the supervisor to give to the operations room.',
  d_report: "Technician's report", d_report_ph: 'What did you find and fix? e.g. the hose under the sink was corroded; replaced and tested',
  d_need_report: 'Write the work report', d_parts_used: 'Parts and materials replaced', d_part_name: 'Part', d_part_qty: 'Qty',
  d_add_part: 'Add part', d_del_part: 'Remove', d_none_parts: 'No parts replaced', d_need_parts: 'Add at least one part',
  d_legs: 'Visits', d_leg_now: 'now', leg_escalated: 'Asked for the operations room', leg_reassigned: 'Moved to someone else', leg_finished: 'Fixed it', leg_open: 'Working on it', leg_closed: 'Closed', leg_cancelled: 'Cancelled',
  d_inspect: 'Inspection',
  d_parts_list: 'Parts replaced', d_parts_wait: 'Parts awaited', d_source: 'Source',
  t_hold_busy: 'The technician is finishing another job and will come to you right after.', t_hold_access: 'The visit has been moved to a convenient time.',
  t_hold_parts: 'Your request is waiting for spare parts.', t_hold_eta: 'Expected: {d}', t_hold_other: 'Your request is on hold for now; the team is following it.',
  t_escalated: 'Your request has been passed to the specialist technicians.', t_parts: 'Parts replaced',
  b_k_hold: 'On hold', b_hold: 'On hold', b_all_buildings: 'All buildings', b_new_req: 'New request',
  n_title: 'Log a request', n_sub: 'For a report received by phone, WhatsApp or in person. It counts in the reports like any other.', n_source: 'Received by',
  n_building: 'Building', n_unit: 'Location', n_requester: "Requester's name", n_photo: 'Photo', n_submit: 'Log the request',
  n_done: 'Request {no} logged', n_share: 'Send the requester the tracking link so they can follow it and sign after the repair.',
  n_wa: 'Send by WhatsApp', n_open: 'Open the request', n_wa_text: 'We received your request no. {no} at {o}. Follow it and sign after the repair here: {u}',
  src_qr: 'QR code', src_phone: 'Phone call', src_whatsapp: 'WhatsApp', src_walkin: 'In person', src_email: 'Email', src_other: 'Other',
  ev_logged: 'Logged ({n})', ev_hold_busy: 'Technician busy with another job: arrival timer paused', ev_hold_access: 'Paused: tenant unavailable',
  ev_hold_parts: 'Paused: waiting for parts', ev_hold_other: 'Paused, other reason', ev_resumed: 'Technician on the way: arrival timer running',
  ev_resumed_auto: 'Arrival timer started after finishing {n}', ev_resumed_qr: 'Technician back on site (QR): repair resumed', ev_resumed_manual: 'Technician back on site (manual): repair resumed',
  ev_to_ops: 'Handyman asked for the operations room', ev_sent_ops: 'Sent to the operations room', ev_sent_hm: 'Sent to the handyman',
  err_bad_busy: 'Choose one of your open jobs.', err_on_hold: 'The timer is paused. Tap “On my way now” first.',
  err_report_required: 'Write the work report (at least 5 characters).', err_parts_required: 'Add at least one part.', err_sites_required: "Choose the handyman's building.",
  tm_team: 'Team', tm_sites: 'Buildings covered', tm_hm_hint: 'The supervisor gives him the requests of his buildings; he asks for the operations room when needed.',
  se_b_type: 'Type', type_res: 'Residential', type_com: 'Commercial and offices', se_b_ops: 'Operations-room arrival (min)',
  se_b_hint: 'For residential buildings the handyman is suggested first, if there is one; for commercial buildings an operations-room technician. Coming from another building, the longer time applies.',
  se_hm_note: 'Assign: from the request reaching the maintenance supervisor to its assignment. Accept: from the assignment to the technician accepting. Handyman arrival: he is in the building, so it is measured against this time; operations-room arrival is set per building below.',
  n_reports: 'Reports', r_title: 'Request reports', r_day: 'Daily', r_week: 'Weekly', r_month: 'Monthly', r_today: 'Today', r_this_week: 'This week', r_this_month: 'This month',
  r_total: 'Requests', r_done: 'Fixed', r_progress: 'In progress', r_hold: 'On hold', r_cancel: 'Cancelled', r_carried: 'Open from before',
  r_carried_s: 'Earlier requests not closed yet', r_prev_day: 'vs the day before', r_prev_week: 'vs the week before', r_prev_month: 'vs the month before', r_same: 'Same as {p}',
  r_first_line: 'Fixed by the handyman', r_arr_on: 'Arrived on time', r_fix_on: 'Fixed on time',
  r_trend_day: 'Requests over the last 14 days', r_trend_week: 'Requests over the last 8 weeks', r_trend_month: 'Requests over the last 6 months',
  r_urgent_part: 'of which urgent', r_by_type: 'By priority and type', r_by_building: 'By building', r_by_team: 'By team',
  r_list: 'All requests', r_table: 'Show as a table', r_holds: 'Requests on hold', r_none: 'No requests in this period.', r_all: 'All',
  r_f_building: 'Building', r_f_status: 'Status', r_f_priority: 'Priority', r_s_open: 'Open', r_s_done: 'Fixed', r_s_hold: 'On hold', r_s_cancel: 'Cancelled',
  r_week_of: '{a} – {b}', r_col_type: 'Type', r_col_open: 'Open', r_col_avg_fix: 'Avg repair', r_col_avg_arr: 'Avg arrival',
  r_hm_fixed: 'Fixed by the handyman', r_hm_handed: 'Asked for the operations room', r_ops_direct: 'Straight to the operations room', r_ops_fixed: 'Fixed by the operations room',
  r_export: 'Export the {p} report', x_period_excel_d: "Every request in detail, with the technicians' reports and parts, plus the summary", x_period_pdf_d: 'A report ready to print or save as PDF',
  x_parts_sheet: 'Parts', x_holds_sheet: 'On hold', x_counts_sheet: 'Daily counts', x_visits: 'Visits',
  col_time: 'Time', col_source: 'Source', col_hold: 'On hold for', col_hold_since: 'On hold since', col_eta: 'Expected', col_by: 'Done by',
  col_team: 'Team', col_handed: 'Handed to operations room', col_hm: 'Handyman', col_paused_a: 'Paused before arrival (min)', col_paused_w: 'Paused during work (min)',
  col_report: "Technician's report", col_parts: 'Parts replaced', col_part: 'Part', col_qty: 'Qty', col_comment: "Requester's comment", col_count: 'Count',
  col_urgent: 'Urgent', col_normal: 'Normal', col_period: 'Period', col_outcome: 'Outcome', col_parts_wait: 'Parts awaited', col_note: 'Note',
  e_by_team: 'By team', e_hm_group: 'Handymen', e_ops_group: 'Operations-room technicians', e_paused: 'Paused, not counted', e_self_fixed: 'Fixed himself', e_visits: 'Visits',
  p_s8: 'Handymen and the operations room', p_s8_sub: 'Performance by team', p_team_line: '{n} visits · arrival {a} · repair {f}',
  st_assigned: 'Awaiting acceptance',
  t_step_assigned: 'Assigned to a technician',
  j_alert_mine: 'New job for you: {u}',
  j_how: 'The maintenance supervisor assigns the requests; your jobs arrive here with a phone notification.',
  tm_q: 'Waiting to be assigned',
  tm_ack: 'Waiting for acceptance',
  tm_dispatch: 'Time to assign',
  d_dispatch_body: 'Choose who takes this request. They get a phone notification, and the arrival timer starts once they accept.',
  d_reassign_body: 'What the previous person recorded stays in the request stages, and the new person is notified to accept the job.',
  d_people: 'Who takes the job?',
  d_own_b: 'Covers this building',
  d_free: 'Free',
  d_load: 'Open jobs: {n}',
  d_now_at: 'Now at {b}',
  d_goal: 'Arrival target {m}',
  d_was_declined: 'Declined it',
  d_note_for: 'Note for them',
  d_note_for_ph: 'e.g. The tenant is home after 4 pm; the key is with the guard',
  d_dispatch_submit: 'Assign the job',
  d_by_line: 'Assigned by {n}',
  d_q_declined: '{n} declined: {m}',
  d_q_escalated: '{n} asked for the operations room: {m}',
  c_declined: '{n} declined',
  d_wait_tech: 'Waiting for {n} to accept',
  d_your_turn: 'Given to you by {n}',
  d_decline: 'Decline the job',
  d_decline_title: 'Decline the job',
  d_decline_body: 'The job goes back to the maintenance supervisor to give to someone else. Write the reason.',
  d_decline_ph: 'e.g. I am at another building on an urgent job until the evening',
  d_decline_submit: 'Decline',
  d_declined_ok: 'Declined. The job is back with the maintenance supervisor.',
  d_gone: 'This job is no longer assigned to you.',
  ev_late_dispatch: 'Reminder: not assigned in time',
  ev_declined: 'Declined the job',
  b_k_assigned: 'Awaiting acceptance',
  b_rest: 'In hand',
  e_avg_dispatch: 'Avg. time to assign',
  e_dispatch_on: 'Assigned on time',
  e_dispatches: 'Assignments',
  e_declines: 'Declined: {n}',
  e_sup_title: 'Assigning requests',
  e_sup_note: 'From the request reaching the maintenance supervisor to its assignment. It is not part of the technicians\' score.',
  se_dispatch: 'Supervisor assigns',
  g_sup: 'The request reached the maintenance supervisor. Switch to him and give the job to a handyman or technician.',
  g_sup_btn: 'Enter as the supervisor',
  dm_team: 'Handyman or technician',
  dm_team_body: 'Gets the jobs the supervisor gives him, accepts, heads there and scans the location code, then writes the report and the parts used.',
  col_dispatch: 'Assign (min)',
  col_assigned_by: 'Assigned by',
  col_declines: 'Declines',
  leg_declined: 'Declined',
  leg_waiting: 'Not accepted yet',
  t_q: 'Your request is with the maintenance supervisor, who will assign it to the right technician.',
  n_assign: 'Assign the job now',
  n_assign_later: 'Later, from the board',
  tm_wait_s: 'Waiting',
  st_assigned_me: 'Waiting for you to accept',
  tm_only_you: 'Only you add, change and remove members, and change the settings and QR codes. This is enforced by the database itself and cannot be given to anyone else.',
  tm_self_role: 'Manager · your account',
  tm_delete: 'Remove from the team',
  tm_delete_q: 'Remove {n} from the team?',
  tm_delete_body: 'They will no longer be able to sign in. Their recorded work stays in the reports and the evaluation.',
  tm_delete_btn: 'Remove',
  tm_deleted: '{n} was removed from the team.',
  se_only_you: 'Only your account can change the settings.',
  err_has_open_jobs: 'They still have open jobs. Give them to someone else from the board first.',
  err_one_admin: 'The manager role belongs to your account only.',
  r_units: 'Flats',
  r_this_year: 'This year',
  u_title: 'Flats and locations',
  u_sub: 'Requests at each flat or common area month by month, compared with the year before, by problem type.',
  u_year_total: 'Requests in {y}',
  u_vs: 'vs {y}',
  u_places: 'Locations with requests',
  u_of: 'of {n} locations',
  u_top_place: 'Most requests',
  u_top_type: 'Most common problem',
  u_matrix: 'Requests at each location, by month',
  u_place: 'Location',
  u_total: 'Total',
  u_types_col: 'Most frequent',
  u_quiet: '{n} locations had no requests in {y}.',
  u_open_hint: 'Tap a location to see its full history.',
  u_less: 'Fewer',
  u_more: 'More',
  u_by_type: 'By problem type',
  u_type_hint: 'Tap a problem type to see where it keeps happening.',
  u_all_types: 'All problem types',
  u_none: 'No requests in {y}.',
  u_history: 'Location history',
  u_history_link: 'History of this location',
  u_all_time: 'All requests',
  u_since: 'since {d}',
  u_by_year: 'By year and month',
  u_back: 'Flats report',
  u_repeat: 'Faults that came back',
  u_repeat_s: 'within {d} days',
  u_list: 'Every request at this location',
  u_export: 'Export the flats report {y}',
  u_export_one: 'Export this location’s history',
  x_units_d: 'Every location by month, with the yearly comparison and problem types',
  x_unit_d: 'History by year, month and type, with every request in detail',
  x_units_sheet: 'Locations by month',
  x_unit_types_sheet: 'Locations by type',
  x_types_sheet: 'Types by month',
  u_change: 'Change',
  u_kind: 'Kind'
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
const bMeta = code => (((S.settings || DEFAULTS).buildings || {})[code]) || {};
const bLabel = code => { const m = bMeta(code); return (LANG === 'ar' ? m.ar : m.en) || m.ar || m.en || code || ''; };
function bCodes() { const b = (S.settings || DEFAULTS).buildings || {}; return Object.keys(b).sort((x, y) => ((b[x].sort || 99) - (b[y].sort || 99)) || x.localeCompare(y)); }
const holdLabel = r => t('hold_' + r.hold_kind);
const secs = v => (+v || 0) * 1000;
const isoPlus = (x, msAdd) => new Date(D(x).getTime() + msAdd).toISOString();
const minsOf = v => (v == null ? null : Math.round(v / 60000));
function dayKey(x) { const d = new Date(D(x).getTime() + OFFSET); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
const teamOf = s => (s && s.role === 'technician' ? (s.team === 'hm' ? 'hm' : 'ops') : null);
function teamLine(s) { if (!s || s.role !== 'technician') return t('role_' + (s ? s.role : 'technician')); return s.team === 'hm' ? t('tech_hm', { b: (s.sites || []).map(bLabel).join('، ') }) : t('tech_ops'); }

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
  bell: I('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  chartbig: I('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>'),
  pause: I('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'),
  play: I('<path d="M7 5l12 7-12 7z"/>'),
  handover: I('<path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12"/>'),
  box: I('<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>'),
  calendar: I('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  report: I('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>'),
  send: I('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'),
  trash: I('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>')
};

/* ------------------------------------------------------------ state */
const S = {
  session: store.get(P + 'session', null),
  settings: null, list: null, listAt: 0, req: null, draft: {}, photos: {}, unit: null, track: null,
  seenNew: null, boardTab: 'open', q: '', bf: '', route: '#/demo', justSent: null, rf: { b: '', st: '', p: '' }, uf: { b: '', k: '' }
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
  return { dispatch: tg.dispatch || (r.priority === 'urgent' ? 10 : 30), pickup: tg.pickup || (r.priority === 'urgent' ? 10 : 30), arrive: r.target_arrive, work: r.target_work };
}
function setSession(res) {
  S.session = { token: res.token, me: res.me };
  store.set(P + 'session', S.session);
  S.list = null; S.seenNew = null;
}
function signOut(expired) {
  const had = !!S.session, tok = S.session && S.session.token;
  if (tok && !expired) (async () => { if (LIVE) await dropPush(tok); await rpc('staff_logout', { p_token: tok }).catch(() => {}); })();
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
    case 'reports': return mgr ? (p[1] === 'units' ? vUnitsReport(p[2], alive) : p[1] === 'unit' ? vUnitHistory(p[2], alive) : vReports(p[1], p[2], alive)) : go('/jobs');
    case 'new': return mgr ? vNewReq(alive) : go('/jobs');
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
    right.push(`<span class="who"><b>${esc(S.session.me.name)}</b><small>${esc(S.session.me.role === 'technician' ? (S.session.me.team === 'hm' ? t('role_hm') : t('team_ops')) : t('role_' + S.session.me.role))}</small></span>`);
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
    : [['board', ICON.list, t('n_board')], ['reports', ICON.report, t('n_reports')], ['eval', ICON.chart, t('n_eval')], ['team', ICON.users, t('n_team')]];
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
  const list = await srpc('staff_requests', { p_from: new Date(Date.now() - 10 * 864e5).toISOString() });
  S.list = Array.isArray(list) ? list : [];
  S.listAt = Date.now();
  const me = S.session.me, tech = me.role === 'technician';
  const fresh = S.list.filter(r => (tech ? r.status === 'assigned' && r.technician_id === me.id : r.status === 'new'));
  if (S.seenNew) {
    const added = fresh.filter(r => !S.seenNew.has(r.id));
    if (added.length) { chime(); toast(t(tech ? 'j_alert_mine' : 'j_alert', { u: uName(added[0]) + ' · ' + issueLabel(added[0].issue_type) })); }
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
function statusChip(r) {
  if (typeof r === 'string') return `<span class="status s-${r}">${t('st_' + r)}</span>`;
  if (r.hold_kind === 'busy') return `<span class="status s-queued">${t('st_queued')}</span>`;
  if (r.hold_kind) return `<span class="status s-hold">${esc(holdLabel(r))}</span>`;
  if (r.status === 'assigned' && S.session && r.technician_id === S.session.me.id) return `<span class="status s-assigned">${t('st_assigned_me')}</span>`;
  return `<span class="status s-${r.status}">${t('st_' + r.status)}</span>`;
}
const stageChip = r => (r.status === 'new' && r.stage ? `<span class="stage st-${r.stage}">${r.stage === 'hm' ? t('team_hm') : t('team_ops')}</span>` : '');
const pickupTarget = r => r.target_pickup || targetsFor(r).pickup;
const dispatchTarget = r => r.target_dispatch || targetsFor(r).dispatch;
const lastLeg = r => (r.legs && r.legs.length ? r.legs[r.legs.length - 1] : null);
function phase(r) {
  if (r.hold_kind) return null;
  if (r.status === 'new') return { from: r.queued_at || r.created_at, target: dispatchTarget(r), label: 'tm_wait_s' };
  if (r.status === 'assigned') return { from: r.offered_at || r.created_at, target: pickupTarget(r), label: 'tm_wait_s' };
  if (r.status === 'accepted') return { from: isoPlus(r.accepted_at, secs(r.paused_arrive)), target: r.target_arrive, label: 'tm_way' };
  if (r.status === 'onsite') return { from: isoPlus(r.arrived_at, secs(r.paused_work)), target: r.target_work, label: 'tm_work' };
  if (r.status === 'finished') return { from: r.finished_at, target: 24 * 60, label: 'tm_sign' };
  return null;
}
function isLate(r) { const p = phase(r); return !!(p && p.from && Date.now() - D(p.from) > p.target * 60000); }
function timerChip(r) {
  if (r.hold_kind && ['accepted', 'onsite'].includes(r.status)) {
    const sub = r.hold_kind === 'busy' && r.hold_ref_no ? t('tm_busy_on', { no: r.hold_ref_no }) : t('tm_paused');
    return `<span class="tm paused">${ICON.pause}<small>${esc(sub)}</small><b class="clock" data-tick="${esc(r.hold_at)}">${fClock(Date.now() - D(r.hold_at))}</b></span>`;
  }
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
  const ha = !!a.hold_kind, hb = !!b.hold_kind;
  if (ha !== hb) return ha ? 1 : -1;
  if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1;
  return D(a.created_at) - D(b.created_at);
}
function reqCard(r, o) {
  o = o || {};
  const handed = (r.legs || []).some(l => l.outcome === 'escalated'), ll = lastLeg(r);
  const back = r.status === 'new' && ll && ll.outcome === 'declined' ? `<span class="stage st-warn">${ICON.alert}${esc(t('c_declined', { n: ll.name || '' }))}</span>` : '';
  return `<a class="req ${r.priority} st-${r.status} ${r.hold_kind ? 'held' : ''} ${isLate(r) ? 'is-late' : ''}" href="#/r/${esc(r.id)}">
    <div class="req-top">${prBadge(r.priority)}<b class="no num">#${r.no}</b><span class="where">${esc(uName(r))}<small> · ${esc(bName(r))}</small></span>${o.queue ? '' : statusChip(r)}</div>
    <div class="req-issue">${esc(issueLabel(r.issue_type))}${stageChip(r)}${handed && r.status !== 'new' ? `<span class="stage st-ops">${ICON.handover}${t('team_ops')}</span>` : ''}${back}</div>
    <div class="req-desc">${esc(r.description)}</div>
    <div class="req-foot">${o.queue ? `<span class="tech muted">${r.contact_name ? ICON.user + esc(r.contact_name) : ''}</span>` : `<span class="tech">${ICON.user}${r.technician ? esc(r.technician) : `<i>${t('b_unassigned')}</i>`}</span>`}${timerChip(r)}</div>
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

/* ------------------------------------------------------------ phone notifications */
const PUSH = {
  supported: () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!window.isSecureContext,
  ios: /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  standalone: () => { try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } }
};
const b64uEnc = buf => { const b = new Uint8Array(buf); let x = ''; for (let i = 0; i < b.length; i++) x += String.fromCharCode(b[i]); return btoa(x).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64uDec = str => { const t2 = String(str).replace(/-/g, '+').replace(/_/g, '/'); const x = atob(t2 + '==='.slice((t2.length + 3) % 4)); const b = new Uint8Array(x.length); for (let i = 0; i < x.length; i++) b[i] = x.charCodeAt(i); return b; };
async function swReg() {
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}
async function pushHere(key) {
  if (!PUSH.supported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return false;
  const k = sub.options && sub.options.applicationServerKey;
  if (key && k && b64uEnc(k) !== key) return false;
  const mark = store.get(P + 'push', null);
  return !!(mark && S.session && mark.staff === S.session.me.id && mark.endpoint === sub.endpoint);
}
async function enablePush() {
  if (!PUSH.supported()) throw new Error('push_failed');
  const key = await rpc('push_public_key');
  if (!key) throw new Error('push_not_ready');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('push_denied');
  const reg = await swReg();
  let sub = await reg.pushManager.getSubscription();
  const k = sub && sub.options && sub.options.applicationServerKey;
  if (sub && k && b64uEnc(k) !== key) { await sub.unsubscribe().catch(() => {}); sub = null; }
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uDec(key) }); }
    catch (e) { throw new Error('push_failed'); }
  }
  await srpc('push_subscribe', { p_sub: sub.toJSON(), p_lang: LANG });
  store.set(P + 'push', { staff: S.session.me.id, endpoint: sub.endpoint });
  return srpc('push_test');
}
async function dropPush(tok) {
  try {
    if (!PUSH.supported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (!sub) return;
    if (tok) await rpc('push_unsubscribe', { p_token: tok, p_endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch (e) { /* nothing to undo */ }
  store.del(P + 'push');
}
function pushCard(icon, title, body, btn) {
  return `<section class="push-card"><div class="pc-ic">${icon}</div><div class="pc-t"><b>${title}</b><p>${body}</p></div>${btn || ''}</section>`;
}
async function fillPushSlot() {
  const el = $('#push-slot');
  if (!el || DEMO || !LIVE || !S.session) return;
  let html = '';
  try {
    const key = await rpc('push_public_key');
    if (!key) html = isAdmin() ? pushCard(ICON.bell, t('pu_sys'), t('pu_admin_first'), `<a class="btn" href="#/settings">${t('pu_go_settings')}</a>`) : '';
    else if (!PUSH.supported()) html = PUSH.ios && !PUSH.standalone() ? pushCard(ICON.bell, t('pu_ios_title'), t('pu_ios_body')) : pushCard(ICON.alert, t('pu_title'), t('pu_unsupported'));
    else if (Notification.permission === 'denied') html = pushCard(ICON.alert, t('pu_title'), t('pu_denied'));
    else if (!(await pushHere(key))) html = pushCard(ICON.bell, t('pu_title'), t('pu_body'), `<button class="btn primary" type="button" data-act="push-on">${t('pu_btn')}</button>`);
  } catch (e) { html = ''; }
  if (el.isConnected) el.innerHTML = html;
}
async function checkSender(url) {
  try {
    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) return false;
    const j = await r.json().catch(() => ({}));
    return j.service === 'rasd-notify';
  } catch (e) { return false; }
}
async function fillPushAdmin() {
  const el = $('#push-admin');
  if (!el) return;
  let html;
  try {
    const st = await srpc('admin_push_status');
    if (!st.configured) {
      html = `<p class="muted small">${t('pu_sys_intro')}</p><div class="row"><button class="btn primary" type="button" data-act="push-setup">${ICON.bell}${t('pu_sys_btn')}</button></div>`;
    } else {
      const ok = await checkSender(st.fn_url);
      const here = await pushHere(await rpc('push_public_key')).catch(() => false);
      html = `<ul class="pu-list">
        <li class="${ok ? 'good' : 'bad'}">${ok ? ICON.check : ICON.alert}<span>${ok ? t('pu_sender_ok') : t('pu_sender_bad')}</span></li>
        <li>${ICON.bell}<span>${t('pu_phones', { n: st.phones, p: st.people })}</span></li>
        <li class="${st.reminders ? '' : 'muted'}">${ICON.clock}<span>${st.reminders ? t('pu_reminders_ok') : t('pu_reminders_off')}</span></li></ul>
        <div class="row">${here ? '' : `<button class="btn primary" type="button" data-act="push-on">${t('pu_here')}</button>`}<button class="btn" type="button" data-act="push-test">${t('pu_test')}</button></div>`;
    }
  } catch (e) { html = `<p class="err">${esc(errMsg(e))}</p>`; }
  if (el.isConnected) el.innerHTML = html;
}
async function makeVapid() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { publicKey: b64uEnc(await crypto.subtle.exportKey('raw', kp.publicKey)), privateKey: (await crypto.subtle.exportKey('jwk', kp.privateKey)).d };
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
      const nowIso = new Date().toISOString();
      const list = await rpc('staff_requests', { p_token: S.session.token, p_from: nowIso, p_to: nowIso });
      const mine = (list || []).filter(r => r.unit_id === unit.id && r.technician_id === S.session.me.id);
      job = mine.find(r => r.status === 'accepted' && !r.hold_kind) || mine.find(r => r.status === 'onsite' && r.hold_kind) || mine.find(r => r.status === 'accepted') || null;
    } catch (e) { /* not signed in on this device */ }
  }
  if (!alive()) return;
  const contact = store.get(P + 'contact', {}) || {};
  const d = S.draft[token] || (S.draft[token] = { issue: '', desc: '', cname: contact.name || '', cphone: contact.phone || '' });
  const issues = unit.issues || issueList();
  page(`<div class="wrap narrow">
    <section class="unit-card"><div class="uc-ic">${unit.kind === 'common' ? ICON.building : ICON.door}</div><div><small>${esc(bName(unit))}</small><h1>${esc(uName(unit))}</h1></div></section>
    ${job ? `<section class="card"><h3>${ICON.wrench}${t('t_staff_here')}</h3>${job.status === 'accepted' && !job.hold_kind
      ? `<button class="btn primary block big" type="button" data-act="unit-arrive" data-id="${esc(job.id)}">${ICON.check}${t('t_staff_arrive', { no: job.no })}</button>`
      : job.status === 'onsite' ? `<button class="btn primary block big" type="button" data-act="unit-resume" data-id="${esc(job.id)}">${ICON.play}${t('d_resume_scan').split(':')[0]} · #${job.no}</button>`
      : `<p class="callout">${ICON.pause}<span>${esc(t('d_paused_title'))} · ${esc(holdLabel(job))}</span></p><a class="btn block" href="#/r/${esc(job.id)}">#${job.no}</a>`}</section>` : ''}
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
      ${r.status === 'cancelled' ? `<p class="callout">${ICON.alert}${t('t_cancelled')}</p>` : trackNotes(r) + stepper(r)}
    </section>
    ${DEMO && r.status === 'new' ? guide(r.escalated ? 'g_ops' : 'g_sup', 'g_sup_btn', '/r/' + r.id, 's-sup') : ''}
    ${DEMO && r.status === 'assigned' ? guide('g_tech', 'g_tech_btn', '/r/' + r.id, Demo.assignee(r.id), { n: r.technician || '' }) : ''}
    ${r.status === 'finished' ? tenantSignForm(r) : ''}
    ${r.status === 'closed' ? `<section class="card"><div class="success">${ICON.check}<div><b>${t('t_thanks')}</b>${r.rating ? `<p>${starsRo(r.rating)}</p>` : ''}${r.signoff_method === 'onsite' ? `<p class="muted small">${t('t_signed_onsite')}</p>` : ''}</div></div>${r.photo_after ? `<figure class="ph"><img src="${r.photo_after}" alt="" data-act="zoom"><figcaption>${t('t_after_photo')}</figcaption></figure>` : ''}${reportBlock(r)}</section>` : ''}
    ${DEMO && r.status === 'closed' ? guide('g_admin', 'g_admin_btn', '/r/' + r.id, 's-admin') : ''}
    ${token ? `<a class="btn block" href="#/u/${esc(encodeURIComponent(token))}">${ICON.plus}${t('t_new_req')}</a>` : ''}
  </div>`, { tenant: true });
  initPads();
  if (['new', 'assigned', 'accepted', 'onsite'].includes(r.status)) {
    startPoll(async () => {
      const n = await rpc('track_request', { p_id: id, p_code: code });
      if (n && (n.status !== S.track.r.status || n.hold_kind !== S.track.r.hold_kind || n.escalated !== S.track.r.escalated || n.technician !== S.track.r.technician)) render();
    }, 20000);
  }
}
function trackNotes(r) {
  const n = [];
  if (r.escalated && !['finished', 'closed'].includes(r.status)) n.push(`<p class="callout">${ICON.handover}<span>${t('t_escalated')}</span></p>`);
  else if (r.status === 'new') n.push(`<p class="callout">${ICON.user}<span>${t('t_q')}</span></p>`);
  if (r.hold_kind) {
    const eta = r.hold_eta ? ' ' + t('t_hold_eta', { d: fmt(r.hold_eta, { weekday: 'long', day: 'numeric', month: 'long' }) }) : '';
    n.push(`<p class="callout hold">${ICON.pause}<span>${t('t_hold_' + r.hold_kind)}${r.hold_kind === 'busy' ? '' : esc(eta)}</span></p>`);
  }
  return n.join('');
}
function partsList(parts) {
  if (!parts || !parts.length) return '';
  return `<ul class="parts-ro">${parts.map(x => `<li><span>${esc(x.n)}</span><b class="num">× ${esc(x.q)}</b></li>`).join('')}</ul>`;
}
function reportBlock(r) {
  if (!r.tech_note && !(r.parts && r.parts.length)) return '';
  return `<div class="report-b">${r.tech_note ? `<p class="note"><b>${t('t_tech_note')}:</b> ${esc(r.tech_note)}</p>` : ''}${r.parts && r.parts.length ? `<div><span class="lbl">${t('t_parts')}</span>${partsList(r.parts)}</div>` : ''}</div>`;
}
function stepper(r) {
  const steps = [['t_step_sent', r.created_at], ['t_step_assigned', r.status === 'new' ? null : r.assigned_at, r.status === 'assigned' ? r.technician : null], ['t_step_acc', r.accepted_at, r.technician], ['t_step_arr', r.arrived_at], ['t_step_fin', r.finished_at], ['t_step_closed', r.closed_at]];
  const cur = steps.findIndex(s => !s[1]);
  return `<ol class="steps">${steps.map((s, i) => `<li class="${s[1] ? 'done' : i === cur ? 'now' : ''}"><span class="dot">${s[1] ? ICON.check : ''}</span><div><b>${t(s[0])}</b>${s[1] ? `<small class="num">${fDT(s[1])}${s[2] ? ' · ' + esc(s[2]) : ''}</small>` : ''}</div></li>`).join('')}</ol>`;
}
function tenantSignForm(r) {
  return `<form class="card form" data-form="tenant-sign" novalidate>
    <div><h2>${t('t_confirm_title')}</h2><p class="muted small">${t('t_confirm_body')}</p></div>
    ${r.photo_after ? `<figure class="ph"><img src="${r.photo_after}" alt="${esc(t('t_after_photo'))}" data-act="zoom"><figcaption>${t('t_after_photo')}</figcaption></figure>` : ''}
    ${reportBlock(r)}
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
  page(`<div class="wrap wide"><div id="push-slot"></div><div class="stack" id="jobs">${jobsBody(list)}</div></div>`, { staff: true, nav: 'jobs' });
  fillPushSlot();
  listPoll(() => { const el = $('#jobs'); if (el) { el.innerHTML = jobsBody(S.list); tick(); } });
}
function jobOrder(a, b) {
  const rank = r => (r.status === 'onsite' && !r.hold_kind ? 0 : r.status === 'accepted' && !r.hold_kind ? 1 : r.status === 'finished' ? 3 : 2);
  return rank(a) - rank(b) || byUrgency(a, b);
}
function jobsBody(list) {
  const me = S.session.me;
  const given = list.filter(r => r.technician_id === me.id && r.status === 'assigned').sort(byUrgency);
  const mine = list.filter(r => r.technician_id === me.id && ['accepted', 'onsite', 'finished'].includes(r.status)).sort(jobOrder);
  return `<p class="team-line">${me.team === 'hm' ? ICON.building : ICON.wrench}<span>${esc(teamLine(me))}</span></p>
    ${given.length ? `<h2 class="sec">${t('j_new')}<span class="count">${given.length}</span></h2><div class="cards">${given.map(reqCard).join('')}</div>` : ''}
    <h2 class="sec">${t('j_mine')}<span class="count">${mine.length}</span></h2>
    ${mine.length ? `<div class="cards">${mine.map(reqCard).join('')}</div>` : `<p class="empty-line">${t(given.length ? 'j_none_mine' : 'j_none_new')}</p>`}
    <p class="muted small">${t('j_how')}</p>`;
}
async function vHistory(alive) {
  page(loadingBox(), { staff: true, nav: isMgr() ? 'board' : 'history' });
  const st = await settings();
  const ym = ymNow(), [from, to] = ymRange(ym);
  const list = await srpc('staff_requests', { p_from: from.toISOString(), p_to: to.toISOString() });
  if (!alive()) return;
  const me = S.session.me.id;
  const month = list.filter(r => D(r.created_at) >= from && D(r.created_at) < to && r.status !== 'cancelled');
  const legs = [];
  month.forEach(r => legsOf(r).forEach(l => { if (l.staff_id === me) legs.push(l); }));
  const reqs = month.filter(r => legsOf(r).some(l => l.staff_id === me));
  const m = metricsL(legs, new Set());
  page(`<div class="wrap wide">
    <div class="eval-h"><div><h1>${t('h_title')}</h1><p class="muted">${ymLabel(ym)} · ${esc(teamLine(S.session.me))}</p></div></div>
    ${legs.length ? `<section class="score-card"><div class="score-big"><small>${t('e_score')}</small><b>${m.score == null ? '—' : m.score}</b><small>${t('of100')}</small></div>${kpiGrid(m)}</section>
    <div class="cards">${reqs.sort((a, b) => D(b.created_at) - D(a.created_at)).map(reqCard).join('')}</div>` : `<p class="empty-line">${t('e_none')}</p>`}
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
    if (isMgr()) [team] = await Promise.all([srpc('team_list').catch(() => null), loadList().catch(() => null)]);
  } catch (e) { if (alive()) page(errorBox(e), { staff: true, nav: navKey() }); return; }
  if (!alive()) return;
  S.req = r; S.team = team || S.team;
  page(reqView(r, team), { staff: true, nav: navKey() });
  initPads();
  if (!['closed', 'cancelled'].includes(r.status)) {
    startPoll(async () => {
      const n = await srpc('staff_request', { p_id: id });
      if (n.status !== S.req.status || n.technician_id !== S.req.technician_id || n.priority !== S.req.priority || n.hold_kind !== S.req.hold_kind || n.stage !== S.req.stage) { S.list = null; render(); }
    }, 20000);
  }
}
function reqView(r, team) {
  const back = isMgr() ? 'board' : 'jobs';
  const src = r.source && r.source !== 'qr' ? `<span class="flag info">${ICON.phone}${t('src_' + r.source)}</span>` : '';
  return `<div class="wrap wide">
    <a class="back no-print" href="#/${back}">${ICON.back}${t('back')}</a>
    <div class="det-h">
      <div><div class="det-tags">${prBadge(r.priority)}${statusChip(r)}${stageChip(r)}${src}${r.arrival_method === 'manual' ? `<span class="flag">${ICON.alert}${t('ev_arrived_manual')}</span>` : ''}</div>
        <h1><span class="num">#${r.no}</span> · ${esc(uName(r))}</h1>
        <p class="muted">${esc(bName(r))} · ${t('d_reported')} <span class="num">${fDT(r.created_at)}</span>${isMgr() && r.unit_id ? ` · <a class="no-print" href="#/reports/unit/${esc(r.unit_id)}">${t('u_history_link')}</a>` : ''}</p></div>
      ${r.status === 'closed' && !EMB ? `<button class="btn sm no-print" type="button" data-act="print">${ICON.print}${t('d_print')}</button>` : ''}
    </div>
    <div class="det-grid">
      <div class="col">
        <section class="card">
          <h3>${esc(issueLabel(r.issue_type))}</h3>
          <p class="desc">${esc(r.description)}</p>
          ${r.contact_name || r.contact_phone ? `<p class="contact">${ICON.user}<span>${esc(r.contact_name || '')}</span>${r.contact_phone ? `<a href="tel:${esc(r.contact_phone)}" dir="ltr">${ICON.phone}${esc(r.contact_phone)}</a>` : ''}</p>` : ''}
          ${r.photo_before || r.photo_after ? `<div class="photos">
            ${r.photo_before ? `<figure class="ph"><img src="${r.photo_before}" alt="" data-act="zoom"><figcaption>${t('d_photo_before')}</figcaption></figure>` : ''}
            ${r.photo_after ? `<figure class="ph"><img src="${r.photo_after}" alt="" data-act="zoom"><figcaption>${t('t_after_photo')}</figcaption></figure>` : ''}
          </div>` : ''}
          ${reportBlock(r)}
        </section>
        ${closeSummary(r)}
        ${locationBlock(r)}
      </div>
      <div class="col">
        ${actionPanel(r)}
        <section class="card"><h3>${ICON.clock}${t('d_times')}</h3>${timesTable(r)}</section>
        ${legsCard(r)}
        ${mgrPanel(r)}
        <section class="card"><h3>${t('d_log')}</h3>${eventsList(r.events || [])}</section>
      </div>
    </div>
  </div>`;
}
function bigTimer(from, target, label, sub) {
  return `<div class="big-timer" data-tick="${esc(from)}" data-target="${target || ''}"><small>${t(label)}</small><b class="clock">${fClock(Date.now() - D(from))}</b>${target ? `<small>${esc(sub || t('target', { m: target + ' ' + t('min') }))}</small>` : ''}</div>`;
}
function arriveTargetNote(r) {
  const m = r.target_arrive + ' ' + t('min');
  if (r.stage === 'hm' || (r.origin && r.origin === r.building_code)) return t('d_target_in', { m });
  if (r.origin) return t('d_target_from', { m, b: bLabel(r.origin) });
  return t('d_target_ops', { m });
}
function pausedPanel(r, body, buttons) {
  return `<section class="card paused-card">
    <div class="big-timer paused" data-tick="${esc(r.hold_at)}"><small>${ICON.pause} ${t('d_paused_title')} · ${esc(holdLabel(r))}</small><b class="clock">${fClock(Date.now() - D(r.hold_at))}</b><small>${t('tm_paused')}</small></div>
    ${body}${buttons}</section>`;
}
function holdInfo(r) {
  const bits = [];
  if (r.hold_kind === 'busy') bits.push(r.hold_ref ? t('d_wait_auto', { no: r.hold_ref_no || '' }) : t('d_wait_other', { n: r.hold_note || '' }));
  else if (r.hold_kind === 'access') bits.push(t('d_wait_access', { n: r.hold_note || '' }));
  else if (r.hold_note) bits.push(r.hold_note);
  if (r.hold_eta) bits.push(t('d_held_eta', { d: fmt(r.hold_eta, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) }));
  const parts = r.hold_kind === 'parts' && r.hold_parts && r.hold_parts.length ? `<div><span class="lbl">${t('d_parts_wait')}</span>${partsList(r.hold_parts)}</div>` : '';
  return (bits.length ? `<p class="callout hold">${ICON.pause}<span>${bits.map(esc).join(' · ')}</span></p>` : '') + parts;
}
function partRow(x, i) {
  x = x || {};
  return `<div class="part-row"><input name="pn" aria-label="${t('d_part_name')}" placeholder="${t('d_part_name')}" maxlength="80" value="${esc(x.n || '')}"><input name="pq" type="number" min="0.1" step="any" inputmode="decimal" aria-label="${t('d_part_qty')}" value="${esc(x.q || 1)}"><button type="button" class="icon-btn" data-act="part-del" aria-label="${t('d_del_part')}" title="${t('d_del_part')}">${ICON.trash}</button></div>`;
}
function partsEditor(id, parts, min1) {
  const rows = parts && parts.length ? parts : min1 ? [{ n: '', q: 1 }] : [];
  return `<div class="parts-ed" id="${id}">${rows.map(partRow).join('')}<p class="empty-parts">${t('d_none_parts')}</p></div><button type="button" class="btn sm" data-act="part-add" data-to="${id}">${ICON.plus}${t('d_add_part')}</button>`;
}
const readParts = root => $$('.part-row', root).map(r => ({ n: $('[name="pn"]', r).value.trim(), q: Math.max(0.1, Math.round((+$('[name="pq"]', r).value || 1) * 100) / 100) })).filter(x => x.n);
function actionPanel(r) {
  const me = S.session.me, mine = r.technician_id === me.id, can = mine || isMgr();
  if (r.status === 'new' && isMgr()) {
    return `<section class="card dispatch">${bigTimer(r.queued_at || r.created_at, dispatchTarget(r), 'tm_q')}
      <div><h3>${ICON.send}${t('d_assign')}</h3><p class="muted small">${t('d_dispatch_body')}</p></div>
      ${dispatchForm(r, S.team, S.list, false)}</section>`;
  }
  if (r.status === 'assigned' && mine) {
    return `<section class="card">${bigTimer(r.offered_at || r.created_at, pickupTarget(r), 'tm_ack')}
      ${r.assigned_by_name || r.assign_note ? `<p class="callout">${ICON.user}<span>${r.assigned_by_name ? esc(t('d_your_turn', { n: r.assigned_by_name })) : ''}${r.assign_note ? `<b class="a-note">${esc(r.assign_note)}</b>` : ''}</span></p>` : ''}
      <p class="muted small">${esc(arriveTargetNote(r))}</p>
      <button class="btn primary block big" type="button" data-act="accept">${ICON.check}${t('d_accept')}</button>
      <button class="btn block" type="button" data-act="accept-busy">${ICON.pause}${t('d_accept_busy')}</button>
      <button class="btn block ghost danger" type="button" data-act="decline">${t('d_decline')}</button></section>`;
  }
  if (r.status === 'assigned' && isMgr()) {
    return `${DEMO ? guide('g_tech', 'g_tech_btn', '/r/' + r.id, r.technician_id, { n: r.technician || '' }) : ''}<section class="card">${bigTimer(r.offered_at || r.created_at, pickupTarget(r), 'tm_ack')}
      <p class="callout">${ICON.user}<span>${esc(t('d_wait_tech', { n: r.technician || '' }))}${r.assign_note ? `<b class="a-note">${esc(r.assign_note)}</b>` : ''}</span></p>
      <button class="btn block" type="button" data-act="move">${ICON.handover}${t('d_reassign')}</button></section>`;
  }
  if (me.role === 'technician' && !mine && !['closed', 'cancelled'].includes(r.status)) return `<p class="callout">${ICON.alert}<span>${t('d_gone')}</span></p>`;
  if (r.status === 'accepted' && can) {
    if (r.hold_kind) return pausedPanel(r, holdInfo(r), `<button class="btn primary block big" type="button" data-act="go-now">${ICON.play}${t('d_go_now')}</button>`);
    return `<section class="card">${bigTimer(isoPlus(r.accepted_at, secs(r.paused_arrive)), r.target_arrive, 'tm_way', arriveTargetNote(r))}
      <button class="btn primary block big" type="button" data-act="scan">${ICON.qr}${t('d_arrive')}</button>
      <details class="more"><summary>${t('d_arrive_manual')}</summary>
        <form class="form" data-form="arrive-manual" novalidate><div class="field"><label for="am-n">${t('d_manual_reason')}</label><textarea id="am-n" name="note" rows="2" maxlength="300"></textarea><p class="warn-line">${ICON.alert}${t('d_manual_warn')}</p><p class="err" data-err="note"></p></div>
        <button class="btn block" type="submit">${t('d_manual_submit')}</button></form></details>
      <div class="row pause-row"><button class="btn sm" type="button" data-act="pause-busy">${ICON.pause}${t('d_pause_busy')}</button><button class="btn sm" type="button" data-act="pause-access">${ICON.calendar}${t('d_pause_access')}</button></div></section>`;
  }
  if (r.status === 'onsite' && can) {
    const esc8 = r.stage === 'hm' ? `<button class="btn block" type="button" data-act="escalate">${ICON.handover}${t('d_escalate')}</button>` : '';
    if (r.hold_kind) {
      return pausedPanel(r, holdInfo(r), `<button class="btn primary block big" type="button" data-act="resume-scan">${ICON.qr}${t('d_resume_scan')}</button>
        <details class="more"><summary>${t('d_resume_manual')}</summary>
          <form class="form" data-form="resume-manual" novalidate><div class="field"><label for="rm-n">${t('d_manual_reason')}</label><textarea id="rm-n" name="note" rows="2" maxlength="300"></textarea><p class="warn-line">${ICON.alert}${t('d_manual_warn')}</p><p class="err" data-err="note"></p></div>
          <button class="btn block" type="submit">${t('d_resume_submit')}</button></form></details>${esc8}`);
    }
    return `<section class="card">${bigTimer(isoPlus(r.arrived_at, secs(r.paused_work)), r.target_work, 'tm_work')}
      <form class="form" data-form="finish" novalidate><h3>${t('d_finish_title')}</h3>
        <div class="field"><span class="lbl">${t('d_after_photo')} <i class="must">*</i></span>${photoField('after:' + r.id, 'fin-photo')}<p class="err" data-err="photo"></p></div>
        <div class="field"><label for="fin-n">${t('d_report')} <i class="must">*</i></label><textarea id="fin-n" name="note" rows="3" maxlength="1500" placeholder="${esc(t('d_report_ph'))}"></textarea><p class="err" data-err="note"></p></div>
        <div class="field"><span class="lbl">${t('d_parts_used')}</span>${partsEditor('fin-parts', r.hold_parts || [], false)}</div>
        <button class="btn primary block big" type="submit">${ICON.check}${t('d_finish')}</button></form>
      <div class="row pause-row"><button class="btn sm" type="button" data-act="hold-parts">${ICON.box}${t('d_hold_parts')}</button><button class="btn sm" type="button" data-act="hold-other">${ICON.pause}${t('d_hold_other')}</button></div>
      ${esc8}</section>`;
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
  if (isMgr() && r.hold_kind && ['accepted', 'onsite'].includes(r.status)) return pausedPanel(r, holdInfo(r), '');
  return '';
}
function timesTable(r) {
  const open = !['closed', 'cancelled'].includes(r.status), held = !!r.hold_kind;
  const pa = secs(r.paused_arrive), pw = secs(r.paused_work);
  const rows = [
    { k: 'tm_dispatch', a: r.queued_at, b: r.status === 'new' ? null : r.offered_at, tg: dispatchTarget(r), live: r.status === 'new', p: 0, note: r.assigned_by_name && r.status !== 'new' ? t('d_by_line', { n: r.assigned_by_name }) : '' },
    { k: 'tm_pickup', a: r.offered_at, b: r.accepted_at, tg: pickupTarget(r), live: r.status === 'assigned', p: 0 },
    { k: 'tm_way', a: r.accepted_at, b: r.arrived_at, tg: r.target_arrive, live: r.status === 'accepted', p: pa,
      note: [r.arrival_method ? t(r.arrival_method === 'qr' ? 'd_by_qr' : 'd_by_manual') : '', r.accepted_at ? arriveTargetNote(r).replace(/^[^·]*· ?/, '') : ''].filter(Boolean).join(' · ') },
    { k: 'tm_work', a: r.arrived_at, b: r.finished_at, tg: r.target_work, live: r.status === 'onsite', p: pw },
    { k: 'tm_sign', a: r.finished_at, b: r.signed_at || r.closed_at, tg: null, live: r.status === 'finished', p: 0 },
    { k: 'tm_total', a: r.created_at, b: r.closed_at || r.cancelled_at, tg: null, live: open, p: 0 }
  ];
  return `<table class="times"><tbody>${rows.map(x => {
    let val = '—', cls = '';
    if (x.a && x.b) { const d = ms(x.a, x.b) - x.p; val = `<span class="num">${fDur(d)}</span>`; if (x.tg) cls = d <= x.tg * 60000 ? 'ok' : 'over'; }
    else if (x.a && x.live && held && x.k !== 'tm_total') val = `<span class="num">${fDur(D(r.hold_at) - D(x.a) - x.p)}</span> <span class="paused-tag">${ICON.pause}${t('tm_paused')}</span>`;
    else if (x.a && x.live) val = `<span data-tick="${esc(isoPlus(x.a, x.p))}" data-target="${x.tg || ''}"><b class="clock"></b></span>`;
    const stamp = x.b ? `<small class="num">${fTime(x.a)} – ${fTime(x.b)}</small>` : '';
    const pnote = x.p > 60000 ? `<small class="paused-note">${ICON.pause}${esc(t('paused_note', { d: fDur(x.p) }))}</small>` : '';
    return `<tr class="${cls}"><th>${t(x.k)}</th><td class="v">${val}${stamp}${pnote}${x.note ? `<small>${esc(x.note)}</small>` : ''}</td><td class="tg">${x.tg ? t('target', { m: x.tg + ' ' + t('min') }) : ''}</td><td class="st">${cls === 'ok' ? ICON.check : cls === 'over' ? ICON.alert : ''}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function legsCard(r) {
  if (!r.legs || !r.legs.length) return '';
  const L2 = legsOf(r);
  const row = l => {
    const out = l.current ? (r.status === 'assigned' ? t('leg_waiting') : t('leg_' + l.outcome)) : t('leg_' + l.outcome);
    const bits = [];
    if (l.assigned_by_name) bits.push(esc(t('d_by_line', { n: l.assigned_by_name })));
    if (l.arrive != null) bits.push(`${t('tm_way')} <b class="${l.arrOk === false ? 'bad' : ''}">${fDur(l.arrive)}</b> / ${l.t_arrive} ${t('min')}`);
    if (l.outcome === 'escalated' && l.arrived_at) bits.push(`${t('d_inspect')} <b>${fDur(D(l.ended_at) - D(l.arrived_at) - l.pw)}</b>`);
    if (l.work != null) bits.push(`${t('tm_work')} <b class="${l.workOk === false ? 'bad' : ''}">${fDur(l.work)}</b> / ${l.t_work} ${t('min')}`);
    return `<li class="${l.current ? 'now' : ''}"><div class="lg-h"><b>${esc(l.name || '—')}</b><span class="stage st-${l.team}">${l.team === 'hm' ? t('team_hm') : t('team_ops')}</span>${out ? `<span class="muted">${esc(out)}</span>` : ''}</div>
      ${bits.length ? `<p class="lg-t">${bits.join(' · ')}</p>` : ''}${l.note && (l.outcome === 'escalated' || l.outcome === 'declined') ? `<p class="quote">${esc(l.note)}</p>` : ''}</li>`;
  };
  const tail = r.technician_id ? '' : `<li class="now"><div class="lg-h"><i class="muted">${t('b_unassigned')}</i><span class="stage st-${r.stage}">${r.stage === 'hm' ? t('team_hm') : t('team_ops')}</span></div></li>`;
  return `<section class="card"><h3>${ICON.handover}${t('d_legs')}</h3><ol class="legs">${L2.map(row).join('')}${tail}</ol></section>`;
}
function eventsList(evs) {
  if (!evs.length) return `<p class="muted">—</p>`;
  const inLabel = { assigned: 1, reassigned: 1, signed_onsite: 1, logged: 1, resumed_auto: 1 };
  const label = e => (e.ev === 'logged' ? t('ev_logged', { n: t('src_' + (e.note || 'other')) }) : t('ev_' + e.ev, { n: e.note || '' }));
  return `<ol class="tline">${evs.map(e => `<li><time class="num">${fDT(e.at)}</time><div><b>${esc(label(e))}</b>${e.actor ? `<small>${esc(e.actor)}</small>` : ''}${e.note && !inLabel[e.ev] ? `<p>${esc(e.note)}</p>` : ''}</div></li>`).join('')}</ol>`;
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
  const b = bMeta(r.building_code);
  const dist = b.lat != null && b.lng != null && b.lat !== '' ? haversine(+b.lat, +b.lng, r.arrival_lat, r.arrival_lng) : null;
  const url = `https://www.google.com/maps?q=${r.arrival_lat},${r.arrival_lng}`;
  return `<section class="card"><h3>${ICON.pin}${t('d_location')}</h3>
    <p>${dist != null ? `<b>${t('d_from_building', { d: km(dist) })}</b> · ` : ''}<span class="muted">${r.arrival_acc ? t('d_accuracy', { d: km(r.arrival_acc) }) : ''}</span></p>
    <p class="mono" dir="ltr">${(+r.arrival_lat).toFixed(5)}, ${(+r.arrival_lng).toFixed(5)}</p>
    <a href="${url}" target="_blank" rel="noopener">${t('d_map')}</a></section>`;
}
// Where someone sets out from, and the arrival target that gives (the database works it out the same way)
function arrivePreview(r, team, origin) {
  const st = S.settings || DEFAULTS, tg = (st.targets || {})[r.priority] || {}, b = st.buildings || {};
  if (origin === r.building_code || (team === 'hm' && !origin)) return tg.arrive || (r.priority === 'urgent' ? 15 : 60);
  return Math.max(+((b[r.building_code] || {}).ops) || 60, origin ? +((b[origin] || {}).ops) || 0 : 0);
}
// every active handyman and technician, with what he has on hand now
function peopleFor(r, team, list) {
  const open = (list || []).filter(x => x.id !== r.id && ['assigned', 'accepted', 'onsite'].includes(x.status));
  const declined = new Set((r.legs || []).filter(l => l.outcome === 'declined').map(l => l.staff_id));
  return (team || []).filter(s => s.active && s.role === 'technician' && s.id !== r.technician_id).map(s => {
    const has = open.filter(x => x.technician_id === s.id), hm = s.team === 'hm', sites = s.sites || [];
    const on = has.filter(x => x.status === 'onsite' && !x.hold_kind).sort((a, b) => D(b.arrived_at) - D(a.arrived_at))[0];
    const fin = (list || []).filter(x => x.technician_id === s.id && x.finished_at && Date.now() - D(x.finished_at) < 90 * 60000).sort((a, b) => D(b.finished_at) - D(a.finished_at))[0];
    const at = on ? on.building_code : fin ? fin.building_code : null, own = hm && sites.includes(r.building_code);
    const origin = at || (hm && sites.length ? (own ? r.building_code : sites[0]) : null);
    return { s, hm, own, at, load: has.length, goal: arrivePreview(r, hm ? 'hm' : 'ops', origin), declined: declined.has(s.id) };
  });
}
// the person the request most likely needs: the building's handyman, else the least busy technician
function suggestFor(r, people) {
  const ok = people.filter(p => !p.declined), byLoad = (a, b) => a.load - b.load || a.goal - b.goal || a.s.name.localeCompare(b.s.name);
  const own = ok.filter(p => p.own).sort(byLoad), ops = ok.filter(p => !p.hm).sort(byLoad);
  return (r.stage === 'ops' ? ops[0] || own[0] : own[0] || ops[0]) || ok.slice().sort(byLoad)[0] || null;
}
function dispatchForm(r, team, list, inModal) {
  const people = peopleFor(r, team, list);
  if (!people.length) return `<p class="muted small">${t('d_no_techs')}</p>`;
  const sug = suggestFor(r, people), ll = r.status === 'new' ? lastLeg(r) : null;
  const why = ll && ll.outcome === 'declined' ? t('d_q_declined', { n: ll.name || '', m: ll.note || '' }) : ll && ll.outcome === 'escalated' ? t('d_q_escalated', { n: ll.name || '', m: ll.note || '' }) : '';
  const order = (a, b) => (b.own - a.own) || a.load - b.load || a.s.name.localeCompare(b.s.name);
  const hm = people.filter(p => p.hm).sort(order), ops = people.filter(p => !p.hm).sort(order);
  const groups = (r.stage === 'ops' ? [['e_ops_group', ops], ['e_hm_group', hm]] : [['e_hm_group', hm], ['e_ops_group', ops]]).filter(g => g[1].length);
  const fid = 'dp-' + esc(r.id) + (inModal ? '-m' : '');
  const person = p => {
    const where = p.hm ? (p.s.sites || []).map(bLabel).join('، ') : '';
    const tags = [p.own ? `<em class="tag ok">${t('d_own_b')}</em>` : '', p.declined ? `<em class="tag warn">${t('d_was_declined')}</em>` : ''].join('');
    const state = [p.load ? t('d_load', { n: p.load }) : t('d_free'), p.at ? t('d_now_at', { b: bLabel(p.at) }) : '', t('d_goal', { m: p.goal + ' ' + t('min') })].filter(Boolean).join(' · ');
    return `<label class="choice person"><input type="radio" name="staff" value="${esc(p.s.id)}" ${p === sug ? 'checked' : ''}><span><b>${esc(p.s.name)}${tags}</b>${where ? `<small>${esc(where)}</small>` : ''}<small class="${p.load ? '' : 'free'}">${esc(state)}</small></span></label>`;
  };
  return `<form class="form" data-form="dispatch" data-id="${esc(r.id)}" novalidate>
    ${why ? `<p class="callout ${ll.outcome === 'declined' ? 'warn' : ''}">${ll.outcome === 'declined' ? ICON.alert : ICON.handover}<span>${esc(why)}</span></p>` : ''}
    <fieldset class="field"><legend>${t('d_people')}</legend>
      ${groups.map(g => `<p class="grp">${t(g[0])}</p><div class="choices one people">${g[1].map(person).join('')}</div>`).join('')}
      <p class="err" data-err="staff"></p></fieldset>
    <div class="field"><label for="${fid}-n">${t('d_note_for')} <span class="opt">(${t('optional')})</span></label><textarea id="${fid}-n" name="note" rows="2" maxlength="300" placeholder="${esc(t('d_note_for_ph'))}"></textarea></div>
    ${inModal ? `<div class="row end"><button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button class="btn primary" type="submit">${ICON.send}${t('d_dispatch_submit')}</button></div>`
      : `<button class="btn primary block big" type="submit">${ICON.send}${t('d_dispatch_submit')}</button>`}
  </form>`;
}
function dispatchModal(r) {
  const moving = r.status !== 'new';
  modal(`<div class="dp-h"><h3>${ICON.send} ${t(moving ? 'd_reassign' : 'd_assign')} · <span class="num">#${r.no}</span></h3>
    <p class="muted small">${prBadge(r.priority)} ${esc(issueLabel(r.issue_type))} · ${esc(uName(r))} · ${esc(bName(r))}</p>
    <p class="muted small">${t(moving ? 'd_reassign_body' : 'd_dispatch_body')}</p></div>${dispatchForm(r, S.team, S.list, true)}`);
}
function mgrPanel(r) {
  if (!isMgr() || ['closed', 'cancelled'].includes(r.status)) return '';
  const move = ['accepted', 'onsite'].includes(r.status) ? `<button class="btn block" type="button" data-act="move">${ICON.handover}${t('d_reassign')}</button>` : '';
  return `<section class="card mgr no-print"><h3>${t('d_mgr')}</h3>
    ${move}
    <div class="field"><span class="lbl">${t('d_priority')}</span><div class="seg">${['urgent', 'normal'].map(p => `<button type="button" data-act="prio" data-v="${p}" class="${r.priority === p ? 'on' : ''}">${t('pr_' + p)}</button>`).join('')}</div></div>
    <div class="row">${['accepted', 'onsite', 'finished'].includes(r.status) ? `<button class="btn sm" type="button" data-act="mclose">${t('d_manual_close')}</button>` : ''}<button class="btn sm danger" type="button" data-act="mcancel">${t('d_cancel_req')}</button></div>
  </section>`;
}
function guide(textKey, btnKey, to, role, params) {
  return `<section class="guide no-print"><div><small>${t('g_next')}</small><p>${esc(t(textKey, params))}</p></div><button class="btn primary" type="button" data-act="guide" data-to="${esc(to)}" data-role="${esc(role || '')}">${t(btnKey)}</button></section>`;
}
function reasonModal(title, fn, danger, o) {
  o = o || {};
  const m = modal(`<form class="form" data-form="reason" novalidate><div><h3>${esc(title)}</h3>${o.body ? `<p class="muted small">${esc(o.body)}</p>` : ''}</div><div class="field"><label for="rs-n">${t('d_reason')}</label><textarea id="rs-n" name="note" rows="3" maxlength="300" placeholder="${esc(o.ph || '')}"></textarea><p class="err" data-err="note"></p></div><div class="row end"><button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button type="submit" class="btn ${danger ? 'danger solid' : 'primary'}">${esc(o.submit || t('confirm'))}</button></div></form>`);
  m._reason = fn;
  setTimeout(() => { const ta = $('textarea', m); if (ta) ta.focus(); }, 60);
}
// Muscat date or date-time from a form input, as an ISO instant
function muscatIso(v) {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] != null ? +m[4] : 12, m[5] != null ? +m[5] : 0) - OFFSET).toISOString();
}
function busyModal(mode) {
  const others = (S.list || []).filter(x => x.technician_id === S.session.me.id && x.id !== S.req.id && ['accepted', 'onsite'].includes(x.status) && x.hold_kind !== 'busy');
  const m = modal(`<form class="form" data-form="busy" novalidate><input type="hidden" name="mode" value="${mode}">
    <div><h3>${ICON.pause} ${t('b_title')}</h3><p class="muted small">${t('b_body')}</p></div>
    <fieldset class="field"><legend>${t('b_pick')}</legend><div class="choices one">
      ${others.map((x, i) => `<label class="choice"><input type="radio" name="ref" value="${esc(x.id)}" ${i ? '' : 'checked'}><span><b class="num">#${x.no}</b>&nbsp;· ${esc(uName(x))} · ${esc(bName(x))}</span></label>`).join('')}
      <label class="choice"><input type="radio" name="ref" value="" ${others.length ? '' : 'checked'}><span>${t('b_other')}</span></label></div></fieldset>
    <div class="field other-work" ${others.length ? 'hidden' : ''}><label for="bz-n">${t('d_reason')}</label><textarea id="bz-n" name="note" rows="2" maxlength="300" placeholder="${esc(t('b_other_ph'))}"></textarea><p class="hint">${t('b_other_warn')}</p><p class="err" data-err="note"></p></div>
    <div class="row end"><button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button class="btn primary" type="submit">${mode === 'accept' ? t('b_submit') : t('b_pause_submit')}</button></div></form>`);
  return m;
}
function holdModal(kind) {
  const title = kind === 'parts' ? t('d_hold_parts') : kind === 'access' ? t('d_access_title') : t('d_hold_other');
  const after = S.req.status === 'onsite';
  modal(`<form class="form" data-form="hold" novalidate><input type="hidden" name="kind" value="${kind}">
    <div><h3>${kind === 'parts' ? ICON.box : ICON.pause} ${esc(title)}</h3>${after ? `<p class="muted small">${t('d_hold_warn')}</p>` : ''}</div>
    ${kind === 'parts' ? `<div class="field"><span class="lbl">${t('d_parts_needed')} <i class="must">*</i></span>${partsEditor('hold-parts', [], true)}<p class="err" data-err="parts"></p></div>` : ''}
    <div class="field"><label for="hd-n">${kind === 'parts' ? t('d_hold_note') : t('d_reason')} ${kind === 'parts' ? `<span class="opt">(${t('optional')})</span>` : '<i class="must">*</i>'}</label><textarea id="hd-n" name="note" rows="2" maxlength="300" placeholder="${esc(kind === 'access' ? t('d_access_ph') : kind === 'other' ? t('d_other_ph') : '')}"></textarea><p class="err" data-err="note"></p></div>
    <div class="field"><label for="hd-eta">${kind === 'access' ? t('d_access_when') : t('d_eta')} <span class="opt">(${t('optional')})</span></label><input id="hd-eta" name="eta" type="${kind === 'access' ? 'datetime-local' : 'date'}" dir="ltr"></div>
    <div class="row end"><button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button class="btn primary" type="submit">${t('b_pause_submit')}</button></div></form>`);
}
function escalateModal() {
  modal(`<form class="form" data-form="escalate" novalidate>
    <div><h3>${ICON.handover} ${t('d_escalate')}</h3><p class="muted small">${t('d_escalate_body')}</p></div>
    <div class="field"><label for="es-n">${t('d_findings')} <i class="must">*</i></label><textarea id="es-n" name="note" rows="3" maxlength="500" placeholder="${esc(t('d_escalate_ph'))}"></textarea><p class="err" data-err="note"></p></div>
    <div class="row end"><button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button class="btn primary" type="submit">${t('d_escalate_submit')}</button></div></form>`);
}

/* ============================================================ views: board */
const isHeld = r => !!r.hold_kind && r.hold_kind !== 'busy' && ['accepted', 'onsite'].includes(r.status);
const isOpen = r => ['new', 'assigned', 'accepted', 'onsite', 'finished'].includes(r.status);
async function vBoard(alive) {
  page(loadingBox(), { staff: true, nav: 'board' });
  await settings();
  const list = await loadList();
  if (!alive()) return;
  page(`<div class="wrap wide">
    <div id="push-slot"></div>
    <div id="kpis">${boardKpis(list)}</div>
    <div class="toolbar"><div class="seg" id="btabs">${boardTabs()}</div>
      <div class="tb-r"><select id="b-bld" aria-label="${esc(t('r_f_building'))}">${buildingOptions(S.bf, t('b_all_buildings'))}</select>
      <a class="btn primary" href="#/new">${ICON.plus}${t('b_new_req')}</a></div></div>
    <input class="search" id="b-q" type="search" placeholder="${esc(t('b_search'))}" aria-label="${esc(t('b_search'))}" value="${esc(S.q)}" data-input="q">
    <div id="blist">${boardList(list)}</div>
  </div>`, { staff: true, nav: 'board' });
  fillPushSlot();
  listPoll(() => refreshBoard());
}
function refreshBoard() { const k = $('#kpis'), b = $('#blist'); if (k) k.innerHTML = boardKpis(S.list || []); if (b) b.innerHTML = boardList(S.list || []); tick(); }
function buildingOptions(sel, allLabel) {
  return `<option value="">${esc(allLabel)}</option>` + bCodes().map(c => `<option value="${esc(c)}" ${c === sel ? 'selected' : ''}>${esc(bLabel(c))}</option>`).join('');
}
const boardTabs = () => ['open', 'hold', 'closed', 'all'].map(k => `<button type="button" data-act="btab" data-v="${k}" class="${S.boardTab === k ? 'on' : ''}">${t('b_' + k)}</button>`).join('');
function boardKpis(list) {
  list = list.filter(r => !S.bf || r.building_code === S.bf);
  const open = list.filter(isOpen);
  const late = open.filter(isLate).length, held = open.filter(isHeld).length;
  const today = list.filter(r => r.closed_at && D(r.closed_at) >= dayStart()).length;
  const k = (v, l, cls) => `<div class="kpi ${cls || ''}"><span class="v">${v}</span><span class="l">${l}</span></div>`;
  const q = open.filter(r => r.status === 'new').length;
  return `<div class="kpis tight board-k">${k(q, t('b_k_new'), 'q-lead' + (q ? ' attn info' : ''))}${k(open.filter(r => r.status === 'assigned').length, t('b_k_assigned'))}${k(open.filter(r => (r.status === 'accepted' || r.status === 'onsite') && !isHeld(r)).length, t('b_k_progress'))}${k(held, t('b_k_hold'), held ? 'attn warn' : '')}${k(open.filter(r => r.status === 'finished').length, t('b_k_sign'))}${k(late, t('b_k_late'), late ? 'attn bad' : '')}${k(today, t('b_k_today'))}</div>`;
}
function boardList(list) {
  const q = S.q.trim().toLowerCase();
  let rows = list.filter(r => (!S.bf || r.building_code === S.bf) && (S.boardTab === 'all' || (S.boardTab === 'open' ? isOpen(r) : S.boardTab === 'hold' ? isHeld(r) : !isOpen(r))));
  if (q) rows = rows.filter(r => [r.no, r.unit_ar, r.unit_en, r.building_ar, r.building_en, r.technician, issueLabel(r.issue_type), r.description].join(' ').toLowerCase().includes(q.replace(/^#/, '')));
  rows.sort(S.boardTab === 'open' || S.boardTab === 'hold' ? byUrgency : (a, b) => D(b.closed_at || b.cancelled_at || b.created_at) - D(a.closed_at || a.cancelled_at || a.created_at));
  if (!rows.length) return `<p class="empty-line">${t('b_none')}</p>`;
  if (S.boardTab !== 'open') return `<div class="cards">${rows.slice(0, 200).map(reqCard).join('')}</div>`;
  // the supervisor's queue first: what still needs to be given to someone
  const queue = rows.filter(r => r.status === 'new'), rest = rows.filter(r => r.status !== 'new');
  return (queue.length ? `<h2 class="sec">${t('b_k_new')}<span class="count">${queue.length}</span></h2><div class="cards">${queue.map(dispatchCard).join('')}</div>` : '')
    + (rest.length ? `${queue.length ? `<h2 class="sec">${t('b_rest')}<span class="count">${rest.length}</span></h2>` : ''}<div class="cards">${rest.slice(0, 200).map(reqCard).join('')}</div>` : '');
}
function dispatchCard(r) {
  return `<div class="req-wrap ${r.priority} ${isLate(r) ? 'is-late' : ''}">${reqCard(r, { queue: true })}<button class="btn primary req-act" type="button" data-act="dispatch" data-id="${esc(r.id)}">${ICON.send}${t('d_assign')}</button></div>`;
}

/* ============================================================ views: the supervisor logs a request */
async function vNewReq(alive) {
  page(loadingBox(), { staff: true, nav: 'board' });
  const [st, units, team] = await Promise.all([settings(), srpc('admin_units'), srpc('team_list').catch(() => null)]);
  if (!alive()) return;
  S.units = units; S.team = team || S.team;
  const codes = bCodes().filter(c => units.some(u => u.building_code === c && u.active));
  units.forEach(u => { if (u.active && !codes.includes(u.building_code)) codes.push(u.building_code); });
  const d = S.draft.desk || (S.draft.desk = { b: codes[0] || '', u: '', issue: '', desc: '', cname: '', cphone: '', src: 'phone' });
  if (!codes.includes(d.b)) d.b = codes[0] || '';
  page(`<div class="wrap narrow">
    <a class="back" href="#/board">${ICON.back}${t('back')}</a>
    <form class="card form" data-form="desk-req" novalidate>
      <div><h1>${t('n_title')}</h1><p class="muted small">${t('n_sub')}</p></div>
      <fieldset class="field"><legend>${t('n_source')}</legend><div class="seg">${['phone', 'whatsapp', 'walkin', 'email', 'other'].map(k => `<button type="button" data-act="src" data-v="${k}" class="${d.src === k ? 'on' : ''}">${t('src_' + k)}</button>`).join('')}</div></fieldset>
      <div class="grid2">
        <div class="field"><label for="nr-b">${t('n_building')}</label><select id="nr-b" name="b">${codes.map(c => `<option value="${esc(c)}" ${c === d.b ? 'selected' : ''}>${esc(bLabel(c) || c)}</option>`).join('')}</select></div>
        <div class="field"><label for="nr-u">${t('n_unit')}</label><select id="nr-u" name="u">${unitOptions(d.b, d.u)}</select><p class="err" data-err="u"></p></div>
      </div>
      <fieldset class="field"><legend>${t('t_issue')} <i class="must">*</i></legend>
        <div class="choices">${issueList().map((i, n) => `<label class="choice"><input type="radio" name="issue" id="nr-is-${n}" value="${esc(i.k)}" ${d.issue === i.k ? 'checked' : ''}><span>${esc(i[LANG] || i.ar)}${i.p === 'urgent' ? `<em class="urg" title="${esc(t('pr_urgent'))}">${ICON.alert}<i class="vh">${t('pr_urgent')}</i></em>` : ''}</span></label>`).join('')}</div>
        <p class="err" data-err="issue"></p></fieldset>
      <div class="field"><label for="nr-desc">${t('t_desc')} <i class="must">*</i></label><textarea id="nr-desc" name="desc" rows="3" maxlength="1000">${esc(d.desc)}</textarea><p class="err" data-err="desc"></p></div>
      <div class="grid2">
        <div class="field"><label for="nr-name">${t('n_requester')} <span class="opt">(${t('optional')})</span></label><input id="nr-name" name="cname" maxlength="80" value="${esc(d.cname)}"></div>
        <div class="field"><label for="nr-phone">${t('t_phone')} <span class="opt">(${t('optional')})</span></label><input id="nr-phone" name="cphone" type="tel" inputmode="tel" dir="ltr" maxlength="20" value="${esc(d.cphone)}"></div>
      </div>
      <div class="field"><span class="lbl">${t('n_photo')} <span class="opt">(${t('optional')})</span></span>${photoField('before:desk', 'nr-photo')}</div>
      <div class="grid2">
        <div class="field"><label for="nr-s">${t('n_assign')} <span class="opt">(${t('optional')})</span></label><select id="nr-s" name="staff">${staffOptions(S.team, d.staff)}</select></div>
        <div class="field"><label for="nr-an">${t('d_note_for')} <span class="opt">(${t('optional')})</span></label><input id="nr-an" name="anote" maxlength="300" value="${esc(d.anote || '')}" placeholder="${esc(t('d_note_for_ph'))}"></div>
      </div>
      <button class="btn primary block big" type="submit">${t('n_submit')}</button>
    </form>
  </div>`, { staff: true, nav: 'board' });
}
function staffOptions(team, sel) {
  const techs = (team || []).filter(s => s.active && s.role === 'technician');
  const opt = s => `<option value="${esc(s.id)}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}${s.team === 'hm' && (s.sites || []).length ? ' · ' + esc((s.sites || []).map(bLabel).join('، ')) : ''}</option>`;
  const grp = (k, a) => (a.length ? `<optgroup label="${esc(t(k))}">${a.map(opt).join('')}</optgroup>` : '');
  return `<option value="">${esc(t('n_assign_later'))}</option>` + grp('e_hm_group', techs.filter(s => s.team === 'hm')) + grp('e_ops_group', techs.filter(s => s.team !== 'hm'));
}
function unitOptions(code, sel) {
  return (S.units || []).filter(u => u.building_code === code && u.active).sort((a, b) => a.sort - b.sort)
    .map(u => `<option value="${esc(u.id)}" ${u.id === sel ? 'selected' : ''}>${esc(LANG === 'ar' ? u.label_ar : u.label_en)}</option>`).join('');
}
function deskDone(res, phone) {
  const url = APP_URL + '#/t/' + res.id + '/' + res.code;
  const text = t('n_wa_text', { no: res.no, o: org() || t('app'), u: url });
  const digits = String(phone || '').replace(/\D/g, '');
  const wa = 'https://wa.me/' + (digits.length === 8 ? '968' + digits : digits) + '?text=' + encodeURIComponent(text);
  modal(`<div class="success">${ICON.check}<div><b>${esc(t('n_done', { no: res.no }))}</b><p>${t('n_share')}</p></div></div>
    <p class="mono" dir="ltr">${esc(url)}</p>
    <div class="row">${EMB ? '' : `<a class="btn primary" href="${esc(wa)}" target="_blank" rel="noopener">${ICON.send}${t('n_wa')}</a>`}<button class="btn" type="button" data-act="copy" data-v="${esc(url)}">${ICON.copy}${t('q_copy')}</button><a class="btn ghost" href="#/r/${esc(res.id)}" data-act="modal-close-go">${t('n_open')}</a></div>`);
}

/* ============================================================ visits (legs) and measures */
// Every request is one or more visits: the handyman's, then the operations room's, or a replaced technician's.
function legsOf(r) {
  const tg = targetsFor(r);
  const out = (r.legs || []).map(l => ({
    staff_id: l.staff_id, name: l.name, team: l.team || 'ops', queued_at: l.queued_at || null, offered_at: l.offered_at || r.created_at, accepted_at: l.accepted_at, accept_method: l.accept_method,
    assigned_by_name: l.assigned_by_name || null, assign_note: l.assign_note || null,
    arrived_at: l.arrived_at, arrival_method: l.arrival_method, ended_at: l.ended_at, outcome: l.outcome, note: l.note, t_dispatch: l.target_dispatch || tg.dispatch, t_pickup: l.target_pickup || tg.pickup,
    t_arrive: l.target_arrive, t_work: l.target_work, origin: l.origin, pa: secs(l.paused_arrive), pw: secs(l.paused_work), current: false, finished: false, r
  }));
  if (r.technician_id) out.push({
    staff_id: r.technician_id, name: r.technician, team: r.stage || 'ops', queued_at: r.queued_at || null, offered_at: r.offered_at || r.created_at, accepted_at: r.accepted_at, accept_method: r.accept_method,
    assigned_by_name: r.assigned_by_name || null, assign_note: r.assign_note || null,
    arrived_at: r.arrived_at, arrival_method: r.arrival_method, ended_at: r.finished_at || r.closed_at || r.cancelled_at || null,
    outcome: r.finished_at ? 'finished' : r.status === 'cancelled' ? 'cancelled' : r.status === 'closed' ? 'closed' : 'open',
    t_dispatch: r.target_dispatch || tg.dispatch, t_pickup: r.target_pickup || tg.pickup,
    t_arrive: r.target_arrive, t_work: r.target_work, origin: r.origin, pa: secs(r.paused_arrive), pw: secs(r.paused_work), current: true, finished: !!r.finished_at, r
  });
  out.forEach(l => {
    l.visit = !!l.accepted_at;
    l.dispatch = l.queued_at && l.offered_at ? Math.max(0, D(l.offered_at) - D(l.queued_at)) : null;
    l.dispOk = l.dispatch == null ? null : l.dispatch <= l.t_dispatch * 60000;
    l.pickup = l.accepted_at ? D(l.accepted_at) - D(l.offered_at) : null;
    l.arrive = l.accepted_at && l.arrived_at ? Math.max(0, D(l.arrived_at) - D(l.accepted_at) - l.pa) : null;
    l.work = l.finished && l.arrived_at ? Math.max(0, D(r.finished_at) - D(l.arrived_at) - l.pw) : null;
    l.arrOk = l.arrive == null ? null : l.arrive <= l.t_arrive * 60000;
    l.workOk = l.work == null ? null : l.work <= l.t_work * 60000;
    l.rating = l.finished ? r.rating || null : null;
  });
  return out;
}
function metricsL(legs, repeatOf, reqs) {
  const arr = legs.filter(l => l.arrive != null), fin = legs.filter(l => l.work != null), acc = legs.filter(l => l.pickup != null);
  const rated = legs.filter(l => l.rating);
  const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const rs = reqs || Array.from(new Set(legs.map(l => l.r)));
  const arrOn = arr.filter(l => l.arrOk).length, fixOn = fin.filter(l => l.workOk).length;
  const disp = legs.filter(l => l.dispatch != null), dispOn = disp.filter(l => l.dispOk).length;
  const m = {
    n: rs.length, visits: legs.filter(l => l.visit).length, closed: rs.filter(r => r.status === 'closed').length, open: rs.filter(r => !['closed', 'cancelled'].includes(r.status)).length,
    dispN: disp.length, dispOn, dispRate: disp.length ? dispOn / disp.length : null, dispatch: avg(disp.map(l => l.dispatch)), declines: legs.filter(l => l.outcome === 'declined').length,
    arrN: arr.length, arrOn, arrRate: arr.length ? arrOn / arr.length : null,
    fixN: fin.length, fixOn, fixRate: fin.length ? fixOn / fin.length : null,
    ratedN: rated.length, rating: avg(rated.map(l => l.rating)),
    pickup: avg(acc.map(l => l.pickup)), arrive: avg(arr.map(l => l.arrive)), work: avg(fin.map(l => l.work)),
    manualArr: arr.filter(l => l.arrival_method === 'manual').length, onsite: legs.filter(l => l.finished && l.r.signoff_method === 'onsite').length,
    manualClose: legs.filter(l => l.current && l.r.close_method === 'manual').length, repeats: legs.filter(l => l.finished && repeatOf.has(l.r.id)).length,
    paused: legs.reduce((s, l) => s + l.pa + l.pw, 0), handed: legs.filter(l => l.outcome === 'escalated').length, selfFixed: legs.filter(l => l.finished).length
  };
  const parts = [[0.4, m.arrRate], [0.3, m.fixRate], [0.3, m.rating != null ? m.rating / 5 : null]].filter(x => x[1] != null);
  const w = parts.reduce((s, x) => s + x[0], 0);
  m.score = w ? Math.round((100 * parts.reduce((s, x) => s + x[0] * x[1], 0)) / w) : null;
  return m;
}
function repeatsIn(real, list, st) {
  const rep = (st.repeatDays || 30) * 864e5, out = new Set();
  real.forEach(r => {
    if (!r.closed_at) return;
    const c = D(r.closed_at).getTime();
    if (list.some(x => x.id !== r.id && x.status !== 'cancelled' && x.unit_id === r.unit_id && x.issue_type === r.issue_type && D(x.created_at) > c && D(x.created_at) - c <= rep)) out.add(r.id);
  });
  return out;
}
function evaluate(list, from, to, st) {
  const month = list.filter(r => D(r.created_at) >= from && D(r.created_at) < to);
  const real = month.filter(r => r.status !== 'cancelled');
  const repeatOf = repeatsIn(real, list, st);
  const legs = [];
  real.forEach(r => legsOf(r).forEach(l => legs.push(l)));
  const groups = {};
  legs.forEach(l => { if (!l.staff_id) return; const g = groups[l.staff_id] || (groups[l.staff_id] = { id: l.staff_id, name: l.name, team: l.team, legs: [], b: {} }); g.legs.push(l); if (l.current) g.team = l.team; g.b[l.r.building_code] = (g.b[l.r.building_code] || 0) + 1; });
  const techs = Object.values(groups).map(g => Object.assign({ id: g.id, name: g.name, team: g.team, bld: Object.keys(g.b).sort((x, y) => g.b[y] - g.b[x])[0] }, metricsL(g.legs, repeatOf)))
    .sort((a, b) => (b.score == null ? -1 : b.score) - (a.score == null ? -1 : a.score) || b.visits - a.visits);
  const late = legs.filter(l => l.arrOk === false || l.workOk === false);
  const byTeam = k => legs.filter(l => (l.team === 'hm') === (k === 'hm'));
  // the supervisor's side: how quickly requests were given out, by whom
  const disp = {};
  legs.filter(l => l.dispatch != null).forEach(l => { const k = l.assigned_by_name || '—'; (disp[k] || (disp[k] = [])).push(l); });
  const dispatchers = Object.keys(disp).map(k => Object.assign({ name: k }, metricsL(disp[k], repeatOf))).sort((a, b) => b.dispN - a.dispN);
  return {
    month, real, repeatOf, legs, techs, late, dispatchers, cancelled: month.length - real.length, all: metricsL(legs, repeatOf, real),
    team: { hm: metricsL(byTeam('hm'), repeatOf), ops: metricsL(byTeam('ops'), repeatOf) },
    pri: { urgent: metricsL(legs.filter(l => l.r.priority === 'urgent'), repeatOf, real.filter(r => r.priority === 'urgent')), normal: metricsL(legs.filter(l => l.r.priority === 'normal'), repeatOf, real.filter(r => r.priority === 'normal')) }
  };
}
function lateRow(l) {
  const part = (v, tg, k) => (v == null ? '' : `<span class="${v > tg * 60000 ? 'bad' : ''}">${t(k)} ${fDur(v)} <small>/ ${tg} ${t('min')}</small></span>`);
  return `<a class="late-row" href="#/r/${esc(l.r.id)}"><b class="num">#${l.r.no}</b><span class="lr-w">${esc(uName(l.r))} · ${esc(l.name || '—')}<small>${esc(issueLabel(l.r.issue_type))} · ${esc(bName(l.r))} · ${fDay(l.r.created_at)}</small></span><span class="lr-t">${part(l.arrive, l.t_arrive, 'tm_way')}${part(l.work, l.t_work, 'tm_work')}</span></a>`;
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
    ${m.paused ? k(fDur(m.paused), t('e_paused')) : ''}
  </div>`;
}
function flagsOf(m) {
  const f = [];
  if (m.declines) f.push(t('e_declines', { n: m.declines }));
  if (m.manualArr) f.push(t('e_manual_arr', { n: m.manualArr }));
  if (m.onsite) f.push(t('e_onsite', { n: m.onsite }));
  if (m.manualClose) f.push(t('e_manual_close', { n: m.manualClose }));
  if (m.repeats) f.push(t('e_repeat', { n: m.repeats }));
  return f.length ? `<div class="flags">${f.map(x => `<span class="flag">${ICON.alert}${esc(x)}</span>`).join('')}</div>` : '';
}
function techCard(m) {
  const who = m.team === 'hm' ? t('team_hm') + (m.bld ? ' · ' + bLabel(m.bld) : '') : t('team_ops');
  return `<article class="tech-card">
    <header><div><b>${esc(m.name || '—')}</b><small class="muted">${esc(who)}</small></div><span class="score ${scoreCls(m.score)}">${m.score == null ? '—' : m.score}</span></header>
    <div class="meter"><i style="width:${m.score || 0}%"></i></div>
    <dl><div><dt>${t('e_visits')}</dt><dd>${m.visits}</dd></div><div><dt>${t('e_rating')}</dt><dd>${m.rating == null ? '—' : m.rating.toFixed(1)}</dd></div>
      <div><dt>${t('e_arr_on')}</dt><dd>${pct(m.arrRate)}</dd></div><div><dt>${t('e_fix_on')}</dt><dd>${pct(m.fixRate)}</dd></div>
      <div><dt>${t('e_avg_arrive')}</dt><dd>${fDur(m.arrive)}</dd></div><div><dt>${t('e_avg_work')}</dt><dd>${fDur(m.work)}</dd></div>
      ${m.team === 'hm' ? `<div><dt>${t('e_self_fixed')}</dt><dd>${m.selfFixed} / ${m.selfFixed + m.handed}</dd></div>` : ''}
      ${m.paused ? `<div><dt>${t('e_paused')}</dt><dd>${fDur(m.paused)}</dd></div>` : ''}</dl>
    ${flagsOf(m)}</article>`;
}
async function vEval(ym, alive) {
  ym = /^\d{4}-\d{2}$/.test(ym || '') ? ym : defaultEvalYm();
  page(loadingBox(), { staff: true, nav: 'eval' });
  const st = await settings();
  const [from, to] = ymRange(ym);
  const until = new Date(to.getTime() + (st.repeatDays || 30) * 864e5);
  const list = await srpc('report_requests', { p_from: from.toISOString(), p_to: until.toISOString() });
  if (!alive()) return;
  const ev = evaluate(list, from, to, st);
  S.evalData = { ym, ev, st };
  const cname = (st.contractor && (st.contractor[LANG] || st.contractor.ar)) || '';
  const prow = (label, m, extra) => `<tr><th>${label}</th><td>${m.visits}</td><td>${pct(m.arrRate)}</td><td>${pct(m.fixRate)}</td><td>${fDur(m.arrive)}</td><td>${fDur(m.work)}</td><td>${m.rating == null ? '—' : m.rating.toFixed(1)}</td>${extra != null ? `<td>${extra}</td>` : ''}</tr>`;
  const hmT = ev.techs.filter(x => x.team === 'hm'), opsT = ev.techs.filter(x => x.team !== 'hm');
  page(`<div class="wrap wide">
    <div class="eval-h">
      <div><h1>${t('e_title')}</h1>${cname ? `<p class="muted">${esc(t('e_contractor', { n: cname }))}</p>` : ''}</div>
      <div class="month-pick no-print"><a class="icon-btn" href="#/eval/${ymShift(ym, -1)}" aria-label="-1">${ICON.prev}</a><b>${ymLabel(ym)}</b><a class="icon-btn" href="#/eval/${ymShift(ym, 1)}" aria-label="+1">${ICON.next}</a></div>
      <p class="print-only"><b>${ymLabel(ym)}</b></p>
    </div>
    ${!ev.real.length ? `<p class="empty-line">${t('e_none')}</p>` : `
    <section class="score-card"><div class="score-big"><small>${t('e_score')}</small><b>${ev.all.score == null ? '—' : ev.all.score}</b><small>${t('of100')}</small></div>${kpiGrid(ev.all)}</section>
    ${EMB ? '' : `<section class="card export no-print"><h3>${ICON.download}${t('x_export_title', { m: ymLabel(ym) })}</h3><div class="x-grid">
      <button class="x-btn" type="button" data-act="x-excel"><b>Excel</b><span>${t('x_excel_d')}</span></button>
      <button class="x-btn" type="button" data-act="x-pdf"><b>PDF</b><span>${t('x_pdf_d')}</span></button>
      <button class="x-btn" type="button" data-act="x-pptx"><b>PowerPoint</b><span>${t('x_pptx_d')}</span></button></div></section>`}
    <section class="card"><h3>${t('e_by_team')}</h3><div class="ptable-wrap"><table class="ptable"><thead><tr><th></th><th>${t('e_visits')}</th><th>${t('e_arr_on')}</th><th>${t('e_fix_on')}</th><th>${t('e_avg_arrive')}</th><th>${t('e_avg_work')}</th><th>${t('e_rating')}</th><th>${t('e_paused')}</th></tr></thead><tbody>
      ${prow(t('e_hm_group'), ev.team.hm, fDur(ev.team.hm.paused))}${prow(t('e_ops_group'), ev.team.ops, fDur(ev.team.ops.paused))}</tbody></table></div>
      ${ev.team.hm.visits ? `<p class="muted small">${esc(t('r_hm_fixed'))}: <b>${ev.team.hm.selfFixed}</b> · ${esc(t('r_hm_handed'))}: <b>${ev.team.hm.handed}</b></p>` : ''}</section>
    <section class="card"><h3>${t('e_by_priority')}</h3><div class="ptable-wrap"><table class="ptable"><thead><tr><th></th><th>${t('e_visits')}</th><th>${t('e_arr_on')}</th><th>${t('e_fix_on')}</th><th>${t('e_avg_arrive')}</th><th>${t('e_avg_work')}</th><th>${t('e_rating')}</th></tr></thead><tbody>${prow(t('pr_urgent'), ev.pri.urgent)}${prow(t('pr_normal'), ev.pri.normal)}</tbody></table></div>
      ${flagsOf(ev.all)}${ev.cancelled ? `<p class="muted small">${t('e_cancelled', { n: ev.cancelled })}</p>` : ''}</section>
    ${ev.all.dispN ? `<section class="card"><h3>${ICON.send}${t('e_sup_title')}</h3><div class="kpis">
      <div class="kpi"><span class="v">${ev.all.dispN}</span><span class="l">${t('e_dispatches')}</span></div>
      <div class="kpi"><span class="v">${fDur(ev.all.dispatch)}</span><span class="l">${t('e_avg_dispatch')}</span></div>
      <div class="kpi ${ev.all.dispRate != null && ev.all.dispRate < 0.8 ? 'attn warn' : ''}"><span class="v">${pct(ev.all.dispRate)}</span><span class="l">${t('e_dispatch_on')}</span><span class="s">${ev.all.dispOn} / ${ev.all.dispN}</span></div>
      <div class="kpi"><span class="v">${ev.all.declines}</span><span class="l">${t('leg_declined')}</span></div></div>
      ${ev.dispatchers.length > 1 ? `<div class="ptable-wrap"><table class="ptable"><thead><tr><th></th><th>${t('e_dispatches')}</th><th>${t('e_avg_dispatch')}</th><th>${t('e_dispatch_on')}</th></tr></thead><tbody>${ev.dispatchers.map(x => `<tr><th>${esc(x.name)}</th><td>${x.dispN}</td><td>${fDur(x.dispatch)}</td><td>${pct(x.dispRate)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <p class="muted small">${t('e_sup_note')}</p></section>` : ''}
    ${hmT.length ? `<h2 class="sec">${t('e_hm_group')}<span class="count">${hmT.length}</span></h2><div class="tech-grid">${hmT.map(techCard).join('')}</div>` : ''}
    ${opsT.length ? `<h2 class="sec">${t('e_ops_group')}<span class="count">${opsT.length}</span></h2><div class="tech-grid">${opsT.map(techCard).join('')}</div>` : ''}
    ${ev.late.length ? `<section class="card"><h3>${ICON.alert}${t('e_late_list')}<span class="count">${ev.late.length}</span></h3><div class="late-list">${ev.late.slice().sort((a, b) => D(b.r.created_at) - D(a.r.created_at)).map(lateRow).join('')}</div></section>` : ''}
    <p class="muted small">${t('e_formula', { d: st.repeatDays || 30 })}</p>
    ${EMB ? `<div class="row no-print"><button class="btn" type="button" data-act="csv">${ICON.copy}${t('e_csv_copy')}</button></div>` : ''}`}
  </div>`, { staff: true, nav: 'eval' });
}
function evalCsv() {
  const { ev, ym } = S.evalData;
  const head = ['no', 'date', 'building', 'unit', 'issue', 'priority', 'tech', 'status', 'pickup', 'arrive', 'arrive_t', 'arrive_ok', 'work', 'work_t', 'work_ok', 'total', 'qr', 'rating', 'close'].map(k => t('col_' + k));
  const rows = ev.month.slice().sort((a, b) => a.no - b.no).map(r => {
    const x = reqRow(r, ev.repeatOf);
    return [r.no, fmt(r.created_at, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }), bName(r), uName(r), issueLabel(r.issue_type), t('pr_' + r.priority), x.by, statusText(r),
      x.pickup == null ? '' : x.pickup, x.arr == null ? '' : x.arr, x.arrT || '', x.arrOk == null ? '' : x.arrOk ? 1 : 0, x.work == null ? '' : x.work, x.workT || '', x.workOk == null ? '' : x.workOk ? 1 : 0,
      x.total == null ? '' : x.total, r.arrival_method ? (r.arrival_method === 'qr' ? 1 : 0) : '', r.rating || '', closedBy(r)];
  });
  const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return { name: 'rasd-' + ym + '.csv', text: [head].concat(rows).map(r => r.map(cell).join(',')).join('\r\n') };
}
// one row per request for tables and exports: the visit that fixed it, net of paused time
function reqRow(r, repeatOf) {
  const legs = legsOf(r), last = legs[legs.length - 1] || null, fin = legs.find(l => l.finished) || null, hm = legs.find(l => l.team === 'hm' && l.visit) || null;
  const firstAcc = legs.find(l => l.visit) || null;
  return {
    r, legs, last, fin, hm, handed: legs.some(l => l.outcome === 'escalated'),
    by: (fin || last || {}).name || '', team: (fin || last || {}).team || r.stage || 'ops',
    assignedBy: (fin || last || {}).assigned_by_name || '', declines: legs.filter(l => l.outcome === 'declined').length,
    dispatch: legs.length && legs[0].dispatch != null ? minsOf(legs[0].dispatch) : null, dispOk: legs.length ? legs[0].dispOk : null,
    pickup: firstAcc ? minsOf(firstAcc.pickup) : null,
    arr: last ? minsOf(last.arrive) : null, arrT: last ? last.t_arrive : r.target_arrive, arrOk: last ? last.arrOk : null,
    work: fin ? minsOf(fin.work) : null, workT: r.target_work, workOk: fin ? fin.workOk : null,
    pa: minsOf(legs.reduce((s, l) => s + l.pa, 0)), pw: minsOf(legs.reduce((s, l) => s + l.pw, 0)),
    total: minsOf(ms(r.created_at, r.closed_at || r.cancelled_at)), repeat: repeatOf ? repeatOf.has(r.id) : false
  };
}
const statusText = r => (r.hold_kind && ['accepted', 'onsite'].includes(r.status) ? (r.hold_kind === 'busy' ? t('st_queued') : t('st_hold') + ': ' + holdLabel(r)) : t('st_' + r.status) + (r.status === 'assigned' && r.technician ? ': ' + r.technician : ''));
const partsText = p => (p || []).map(x => x.n + (+x.q !== 1 ? ' ×' + x.q : '')).join('، ');

/* ============================================================ views: reports (day, week, month) */
function keyMs(k) { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d || 1) - OFFSET; }
const addDays = (k, n) => dayKey(keyMs(k) + n * 864e5 + 6 * 3600e3);
function weekOf(k) { const dow = new Date(keyMs(k) + OFFSET).getUTCDay(); return addDays(k, -dow); }
function rPeriod(mode, key) {
  const today = dayKey(Date.now());
  if (mode === 'month') {
    const ym = /^\d{4}-\d{2}$/.test(key || '') ? key : today.slice(0, 7), [from, to] = ymRange(ym);
    return { mode, key: ym, from, to, label: ymLabel(ym), prev: ymShift(ym, -1), next: ymShift(ym, 1), unit: 'month', trendFrom: ymRange(ymShift(ym, -5))[0], buckets: [5, 4, 3, 2, 1, 0].map(i => ymShift(ym, -i) + '-01'), cur: ym + '-01', prevBucket: ymShift(ym, -1) + '-01', isNow: ym === today.slice(0, 7) };
  }
  if (mode === 'week') {
    const k = weekOf(/^\d{4}-\d{2}-\d{2}$/.test(key || '') ? key : today), from = new Date(keyMs(k)), to = new Date(keyMs(addDays(k, 7)));
    return { mode, key: k, from, to, label: t('r_week_of', { a: fmt(from, { day: 'numeric', month: 'short' }), b: fmt(to.getTime() - 3600e3, { day: 'numeric', month: 'short', year: 'numeric' }) }), prev: addDays(k, -7), next: addDays(k, 7), unit: 'week', trendFrom: new Date(keyMs(addDays(k, -49))), buckets: [7, 6, 5, 4, 3, 2, 1, 0].map(i => addDays(k, -7 * i)), cur: k, prevBucket: addDays(k, -7), isNow: k === weekOf(today) };
  }
  const k = /^\d{4}-\d{2}-\d{2}$/.test(key || '') ? key : today, from = new Date(keyMs(k)), to = new Date(keyMs(addDays(k, 1)));
  return { mode: 'day', key: k, from, to, label: fmt(from, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), prev: addDays(k, -1), next: addDays(k, 1), unit: 'day', trendFrom: new Date(keyMs(addDays(k, -13))), buckets: Array.from({ length: 14 }, (x, i) => addDays(k, i - 13)), cur: k, prevBucket: addDays(k, -1), isNow: k === today };
}
const bucketLabel = (P, k) => (P.unit === 'month' ? fmt(keyMs(k) + 15 * 864e5, { month: 'short' }) : P.unit === 'week' ? fmt(keyMs(k) + 6 * 3600e3, { day: 'numeric', month: 'short' }) : fmt(keyMs(k) + 6 * 3600e3, { day: 'numeric' }));
function rGroup(r) { return r.status === 'cancelled' ? 'cancel' : ['finished', 'closed'].includes(r.status) ? 'done' : isHeld(r) ? 'hold' : 'progress'; }
async function vReports(mode, key, alive) {
  mode = ['day', 'week', 'month'].includes(mode) ? mode : 'day';
  const P = rPeriod(mode, key);
  page(loadingBox(), { staff: true, nav: 'reports' });
  const st = await settings();
  const [list, counts] = await Promise.all([
    srpc('report_requests', { p_from: P.from.toISOString(), p_to: P.to.toISOString() }),
    srpc('report_counts', { p_from: P.trendFrom.toISOString(), p_to: P.to.toISOString(), p_unit: P.unit, p_building: S.rf.b || null })
  ]);
  if (!alive()) return;
  S.repData = { P, list, counts, st };
  page(`<div class="wrap wide" id="rep">${reportBody()}</div>`, { staff: true, nav: 'reports' });
}
function repModel() {
  const { P, list, counts, st } = S.repData, f = S.rf;
  const scoped = list.filter(r => (!f.b || r.building_code === f.b) && (!f.p || r.priority === f.p));
  const inP = scoped.filter(r => D(r.created_at) >= P.from);
  const carried = scoped.filter(r => D(r.created_at) < P.from);
  const groups = { done: 0, progress: 0, hold: 0, cancel: 0 };
  inP.forEach(r => groups[rGroup(r)]++);
  const shown = (f.st ? inP.concat(carried).filter(r => rGroup(r) === f.st || (f.st === 'progress' && r.status === 'new')) : inP).slice().sort((a, b) => D(a.created_at) - D(b.created_at));
  const legs = [];
  inP.filter(r => r.status !== 'cancelled').forEach(r => legsOf(r).forEach(l => legs.push(l)));
  const m = metricsL(legs, new Set(), inP.filter(r => r.status !== 'cancelled'));
  const visits = r => legsOf(r).filter(l => l.visit);
  const hmReqs = inP.filter(r => { const L2 = visits(r); return L2.length && L2[0].team === 'hm'; });
  const hmFixed = hmReqs.filter(r => legsOf(r).some(l => l.finished && l.team === 'hm')).length, hmHanded = hmReqs.filter(r => legsOf(r).some(l => l.outcome === 'escalated')).length;
  const cmap = {}; (counts || []).forEach(c => { cmap[c.d] = c; });
  const trend = P.buckets.map(k => Object.assign({ d: k, n: 0, urgent: 0, done: 0, cancelled: 0 }, cmap[k] || {}));
  const curN = (cmap[P.cur] || {}).n || 0, prevN = (cmap[P.prevBucket] || {}).n || 0;
  // distribution by priority and type
  const types = {};
  inP.forEach(r => { const k = r.issue_type, x = types[k] || (types[k] = { k, p: r.priority, n: 0, open: 0, done: 0, work: [], urgent: 0 }); x.n++; if (r.priority === 'urgent') x.urgent++; if (['finished', 'closed'].includes(r.status)) x.done++; else if (r.status !== 'cancelled') x.open++; const fin = legsOf(r).find(l => l.finished); if (fin && fin.work != null) x.work.push(fin.work); });
  const blds = {};
  inP.forEach(r => { const k = r.building_code, x = blds[k] || (blds[k] = { k, name: bName(r), n: 0, done: 0, hold: 0, open: 0, arr: [] }); x.n++; const g = rGroup(r); if (g === 'done') x.done++; else if (g === 'hold') x.hold++; else if (g === 'progress') x.open++; legsOf(r).forEach(l => { if (l.arrive != null) x.arr.push(l.arrive); }); });
  const team = { hmFixed, hmHanded, opsDirect: inP.filter(r => { const L2 = visits(r); return r.status !== 'cancelled' && (L2.length ? L2[0].team !== 'hm' : r.stage === 'ops'); }).length, opsFixed: inP.filter(r => legsOf(r).some(l => l.finished && l.team !== 'hm')).length };
  const holds = scoped.filter(isHeld).sort((a, b) => D(a.hold_at) - D(b.hold_at));
  return { P, st, scoped, inP, carried, groups, shown, m, trend, curN, prevN, types: Object.values(types), blds: Object.values(blds), team, holds, firstLine: hmFixed + hmHanded ? hmFixed / (hmFixed + hmHanded) : null };
}
function trendChart(M) {
  const P = M.P, data = M.trend, max = Math.max(1, ...data.map(x => x.n));
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : Math.ceil(max / 50) * 10, top = Math.ceil(max / step) * step;
  const ticks = []; for (let v = step; v <= top; v += step) ticks.push(v);
  const cols = data.map(x => {
    const cur = x.d === P.cur, show = cur || x.d === P.prevBucket || (x.n === max && x.n > 0);
    const label = `${bucketLabel(P, x.d)}: ${x.n} · ${t('pr_urgent')} ${x.urgent} · ${t('r_done')} ${x.done}`;
    return `<div class="tc-col ${cur ? 'cur' : ''}" tabindex="0" role="img" aria-label="${esc(label)}" title="${esc(label)}"><div class="tc-bar"><i style="height:${((x.n / top) * 100).toFixed(1)}%">${show ? `<span class="tc-v">${x.n}</span>` : ''}</i></div><span class="tc-l">${esc(bucketLabel(P, x.d))}</span></div>`;
  }).join('');
  return `<div class="tchart"><div class="tc-plot">${ticks.map(v => `<span class="tc-g" style="bottom:${((v / top) * 100).toFixed(1)}%"><em>${v}</em></span>`).join('')}<div class="tc-cols">${cols}</div></div></div>
    <details class="tbl-view"><summary>${t('r_table')}</summary><div class="ptable-wrap"><table class="ptable"><thead><tr><th></th><th>${t('r_total')}</th><th>${t('pr_urgent')}</th><th>${t('r_done')}</th><th>${t('r_cancel')}</th></tr></thead><tbody>${data.map(x => `<tr><th>${esc(bucketLabel(P, x.d))}</th><td>${x.n}</td><td>${x.urgent}</td><td>${x.done}</td><td>${x.cancelled}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function deltaText(M) {
  const d = M.curN - M.prevN, P = M.P, ref = t('r_prev_' + P.unit);
  if (!d) return t('r_same', { p: ref.replace(/^(عن|vs) /, '') });
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}</span> ${esc(ref)}`;
}
function reportBody() {
  const M = repModel(), P = M.P, f = S.rf;
  const nav = k => `#/reports/${P.mode}/${k}`;
  const now = P.mode === 'month' ? dayKey(Date.now()).slice(0, 7) : dayKey(Date.now());
  const k = (v, l, s, cls) => `<div class="kpi ${cls || ''}"><span class="v">${v}</span><span class="l">${l}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
  const tsel = (name, opts, cur) => `<select data-rf="${name}" aria-label="${esc(t('r_f_' + (name === 'b' ? 'building' : name === 'p' ? 'priority' : 'status')))}">${opts.map(o => `<option value="${esc(o[0])}" ${o[0] === cur ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  const pType = p => M.types.filter(x => x.p === p).sort((a, b) => b.n - a.n);
  const typeRows = p => pType(p).map(x => `<tr><th>${esc(issueLabel(x.k))}</th><td>${x.n}<span class="share"><i style="width:${Math.round((x.n / Math.max(1, M.inP.length)) * 100)}%"></i></span></td><td>${x.done}</td><td>${x.open}</td><td>${x.work.length ? fDur(x.work.reduce((s, v) => s + v, 0) / x.work.length) : '—'}</td></tr>`).join('');
  const sumP = p => M.inP.filter(r => r.priority === p).length;
  return `
    <div class="eval-h"><div><h1>${t('r_title')}</h1><p class="muted">${esc(org())}</p></div>
      ${repTabs(P.mode)}</div>
    <div class="rep-bar no-print">
      <div class="month-pick"><a class="icon-btn" href="${nav(P.prev)}" aria-label="-1">${ICON.prev}</a><b>${esc(P.label)}</b><a class="icon-btn" href="${nav(P.next)}" aria-label="+1">${ICON.next}</a>${P.isNow ? '' : `<a class="btn sm ghost" href="#/reports/${P.mode}">${t(P.mode === 'day' ? 'r_today' : P.mode === 'week' ? 'r_this_week' : 'r_this_month')}</a>`}</div>
      <div class="filters">${tsel('b', [['', t('b_all_buildings')]].concat(bCodes().map(c => [c, bLabel(c)])), f.b)}${tsel('p', [['', t('r_f_priority') + ': ' + t('r_all')], ['urgent', t('pr_urgent')], ['normal', t('pr_normal')]], f.p)}${tsel('st', [['', t('r_f_status') + ': ' + t('r_all')], ['done', t('r_s_done')], ['progress', t('r_s_open')], ['hold', t('r_s_hold')], ['cancel', t('r_s_cancel')]], f.st)}</div>
    </div>
    <div class="kpis rep-kpis">
      ${k(M.inP.length, t('r_total'), deltaText(M), 'lead')}${k(M.groups.done, t('r_done'))}${k(M.groups.progress, t('r_progress'))}${k(M.groups.hold, t('r_hold'), '', M.groups.hold ? 'attn warn' : '')}${k(M.groups.cancel, t('r_cancel'))}
      ${k(M.carried.filter(isOpen).length, t('r_carried'), t('r_carried_s'))}${k(pct(M.m.arrRate), t('r_arr_on'), M.m.arrN ? M.m.arrOn + ' / ' + M.m.arrN : '')}${k(pct(M.m.fixRate), t('r_fix_on'), M.m.fixN ? M.m.fixOn + ' / ' + M.m.fixN : '')}${M.firstLine != null ? k(pct(M.firstLine), t('r_first_line'), M.team.hmFixed + ' / ' + (M.team.hmFixed + M.team.hmHanded)) : ''}
      ${M.m.dispN ? k(fDur(M.m.dispatch), t('e_avg_dispatch'), t('e_dispatch_on') + ' ' + pct(M.m.dispRate)) : ''}
    </div>
    ${EMB ? '' : `<section class="card export no-print"><h3>${ICON.download}${esc(t('r_export', { p: P.label }))}</h3><div class="x-grid">
      <button class="x-btn" type="button" data-act="r-excel"><b>Excel</b><span>${t('x_period_excel_d')}</span></button>
      <button class="x-btn" type="button" data-act="r-pdf"><b>PDF</b><span>${t('x_period_pdf_d')}</span></button></div></section>`}
    <section class="card"><h3>${ICON.chart}${t('r_trend_' + P.unit)}</h3>${trendChart(M)}</section>
    <div class="rep-grid">
      <section class="card"><h3>${t('r_by_type')}</h3>${M.inP.length ? `<div class="ptable-wrap"><table class="ptable dist"><thead><tr><th>${t('r_col_type')}</th><th>${t('col_count')}</th><th>${t('r_done')}</th><th>${t('r_col_open')}</th><th>${t('r_col_avg_fix')}</th></tr></thead>
        ${['urgent', 'normal'].map(p => pType(p).length ? `<tbody><tr class="grp"><th colspan="5">${prBadge(p)} <b class="num">${sumP(p)}</b></th></tr>${typeRows(p)}</tbody>` : '').join('')}</table></div>` : `<p class="muted">—</p>`}</section>
      <section class="card"><h3>${t('r_by_building')}</h3>${M.blds.length ? `<div class="ptable-wrap"><table class="ptable"><thead><tr><th>${t('col_building')}</th><th>${t('col_count')}</th><th>${t('r_done')}</th><th>${t('r_hold')}</th><th>${t('r_col_avg_arr')}</th></tr></thead><tbody>
        ${M.blds.sort((a, b) => b.n - a.n).map(x => `<tr><th>${esc(x.name)}</th><td>${x.n}</td><td>${x.done}</td><td>${x.hold}</td><td>${x.arr.length ? fDur(x.arr.reduce((s, v) => s + v, 0) / x.arr.length) : '—'}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">—</p>`}
        <h3 class="sub">${t('r_by_team')}</h3>
        <ul class="team-dist"><li><span>${t('r_hm_fixed')}</span><b>${M.team.hmFixed}</b></li><li><span>${t('r_hm_handed')}</span><b>${M.team.hmHanded}</b></li><li><span>${t('r_ops_direct')}</span><b>${M.team.opsDirect}</b></li><li><span>${t('r_ops_fixed')}</span><b>${M.team.opsFixed}</b></li></ul></section>
    </div>
    ${M.holds.length ? `<section class="card"><h3>${ICON.pause}${t('r_holds')}<span class="count">${M.holds.length}</span></h3><div class="late-list">${M.holds.map(r => `<a class="late-row" href="#/r/${esc(r.id)}"><b class="num">#${r.no}</b><span class="lr-w">${esc(uName(r))} · ${esc(bName(r))}<small>${esc(holdLabel(r))}${r.hold_note ? ' · ' + esc(r.hold_note) : ''}${r.hold_parts && r.hold_parts.length && r.hold_kind === 'parts' ? ' · ' + esc(partsText(r.hold_parts)) : ''}</small></span><span class="lr-t"><span>${esc(t('d_held_since', { d: fDur(Date.now() - D(r.hold_at)) }))}</span>${r.hold_eta ? `<span>${esc(t('d_held_eta', { d: fmt(r.hold_eta, { day: 'numeric', month: 'short' }) }))}</span>` : ''}</span></a>`).join('')}</div></section>` : ''}
    <section class="card"><h3>${ICON.list}${t('r_list')}<span class="count">${M.shown.length}</span></h3>
      ${M.shown.length ? `<div class="rep-list">${M.shown.map(r => repRow(r, P.mode)).join('')}</div>` : `<p class="empty-line">${t('r_none')}</p>`}</section>`;
}
function repRow(r, mode) {
  const x = reqRow(r);
  const times = [x.arr != null ? `${t('tm_way')} <b class="${x.arrOk === false ? 'bad' : ''}">${fDur(x.arr * 60000)}</b>` : '', x.work != null ? `${t('tm_work')} <b class="${x.workOk === false ? 'bad' : ''}">${fDur(x.work * 60000)}</b>` : ''].filter(Boolean).join(' · ');
  return `<a class="rep-row" href="#/r/${esc(r.id)}">
    <span class="rr-no num">#${r.no}<small>${mode && mode !== 'day' ? fmt(r.created_at, { day: 'numeric', month: 'short' }) + ' · ' : ''}${fTime(r.created_at)}</small></span>
    <span class="rr-m"><span class="rr-t"><b>${esc(issueLabel(r.issue_type))}</b>${r.priority === 'urgent' ? prBadge('urgent') : ''}</span><small>${esc(uName(r))} · ${esc(bName(r))}${x.by ? ' · ' + esc(x.by) : ''}${x.handed ? ' · ' + ICON.handover : ''}</small>${r.tech_note ? `<small class="rr-note">${esc(r.tech_note)}</small>` : ''}${r.parts && r.parts.length ? `<small class="rr-note">${ICON.box}${esc(partsText(r.parts))}</small>` : ''}</span>
    <span class="rr-s">${statusChip(r)}${times ? `<small>${times}</small>` : ''}</span></a>`;
}

/* ============================================================ views: flats and locations, month by month and year on year */
const monthName = (y, i, short) => fmt(new Date(Date.UTC(y, i, 15)), { month: short ? 'short' : 'long' });
const heatLv = (n, max) => (n ? Math.min(4, Math.ceil((n / Math.max(1, max)) * 4)) : 0);
function repTabs(mode) {
  return `<div class="seg" role="tablist">${['day', 'week', 'month', 'units'].map(x => `<a role="tab" class="${mode === x ? 'on' : ''}" href="#/reports/${x}">${t('r_' + x)}</a>`).join('')}</div>`;
}
async function vUnitsReport(key, alive) {
  const thisYear = +dayKey(Date.now()).slice(0, 4), y = /^\d{4}$/.test(key || '') ? +key : thisYear;
  page(loadingBox(), { staff: true, nav: 'reports' });
  await settings();
  const units = await srpc('report_units', { p_from: new Date(Date.UTC(y - 1, 0, 1) - OFFSET).toISOString(), p_to: new Date(Date.UTC(y + 1, 0, 1) - OFFSET).toISOString() });
  if (!alive()) return;
  S.unitData = { y, units, thisYear };
  page(`<div class="wrap wide" id="rep">${unitsBody()}</div>`, { staff: true, nav: 'reports' });
  heatToNow();
}
// bring the current month into view in tables wider than the screen
function heatToNow() {
  const m = +dayKey(Date.now()).slice(5, 7);
  $$('.heat-wrap').forEach(w => {
    const th = $$('thead th.mo', w)[m - 1];
    if (!th || w.scrollWidth <= w.clientWidth + 2) return;
    const wr = w.getBoundingClientRect(), cr = th.getBoundingClientRect();
    w.scrollLeft += (cr.left + cr.width / 2) - (wr.left + wr.width / 2);
  });
}
// one row per location: requests per month of the year, last year's total, and the problem types
function unitsModel() {
  const { y, units, thisYear } = S.unitData, f = S.uf, ys = String(y), ps = String(y - 1);
  const upto = y < thisYear ? 12 : y === thisYear ? +dayKey(Date.now()).slice(5, 7) : 0;
  const scope = units.filter(u => !f.b || u.building_code === f.b);
  const tYear = {}, tPrev = {}, tMonths = {};
  const rows = scope.map(u => {
    const months = Array(12).fill(0), types = {}, mt = {};
    let n = 0, prev = 0;
    u.cells.forEach(c => {
      const yy = c.m.slice(0, 4), mi = +c.m.slice(5, 7) - 1;
      if (yy === ys) { tYear[c.k] = (tYear[c.k] || 0) + c.n; (tMonths[c.k] || (tMonths[c.k] = Array(12).fill(0)))[mi] += c.n; }
      else if (yy === ps) tPrev[c.k] = (tPrev[c.k] || 0) + c.n;
      if (f.k && c.k !== f.k) return;
      if (yy === ys) { months[mi] += c.n; n += c.n; types[c.k] = (types[c.k] || 0) + c.n; (mt[mi] || (mt[mi] = {}))[c.k] = (mt[mi][c.k] || 0) + c.n; }
      else if (yy === ps) prev += c.n;
    });
    return { u, months, n, prev, mt, types: Object.entries(types).sort((a, b) => b[1] - a[1]) };
  });
  const order = (a, b) => b.n - a.n || b.prev - a.prev || a.u.building_code.localeCompare(b.u.building_code) || a.u.sort - b.u.sort;
  const shown = rows.filter(x => x.n > 0).sort(order), all = rows.slice().sort(order);
  const types = Object.keys(Object.assign({}, tPrev, tYear)).map(k => ({ k, n: tYear[k] || 0, prev: tPrev[k] || 0, months: tMonths[k] || Array(12).fill(0) })).sort((a, b) => b.n - a.n || b.prev - a.prev);
  return {
    y, upto, thisYear, rows: shown, all, quiet: rows.length - shown.length, places: scope.length, types,
    max: Math.max(1, ...shown.map(x => Math.max(...x.months))), tmax: Math.max(1, ...types.map(x => Math.max(...x.months))),
    col: Array.from({ length: 12 }, (_, i) => shown.reduce((s2, x) => s2 + x.months[i], 0)),
    total: shown.reduce((s2, x) => s2 + x.n, 0), prevTotal: rows.reduce((s2, x) => s2 + x.prev, 0),
    top: shown[0] || null, topType: types[0] && types[0].n ? types[0] : null
  };
}
function unitsBody() {
  const M = unitsModel(), y = M.y, f = S.uf;
  const k = (v, l, s2, cls) => `<div class="kpi ${cls || ''}"><span class="v">${v}</span><span class="l">${l}</span>${s2 ? `<span class="s">${s2}</span>` : ''}</div>`;
  const d = M.total - M.prevTotal;
  const delta = d ? `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}</span> ${esc(t('u_vs', { y: y - 1 }))}` : esc(t('r_same', { p: String(y - 1) }));
  const sel = (name, opts, cur, label) => `<select data-uf="${name}" aria-label="${esc(label)}">${opts.map(o => `<option value="${esc(o[0])}" ${o[0] === cur ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  const mh = i => `<th scope="col" class="mo"><span class="m-l">${esc(monthName(y, i, true))}</span><span class="m-s num">${i + 1}</span></th>`;
  const cell = (n, i, tip, max) => (i >= M.upto ? `<td aria-hidden="true"><span class="hc fut"></span></td>` : `<td title="${esc(tip)}"><span class="hc h${heatLv(n, max)}">${n || ''}</span></td>`);
  const tipOf = (x, i, n) => `${uName(x.u)} · ${monthName(y, i)} ${y}: ${n}` + (n && x.mt[i] ? ' (' + Object.entries(x.mt[i]).sort((a, b) => b[1] - a[1]).map(([kk, v]) => issueLabel(kk) + ' ' + v).join('، ') + ')' : '');
  const chg = (n, p) => (n === p ? '' : ` <i class="dl ${n > p ? 'up' : 'down'}" aria-label="${n > p ? '+' : '-'}${Math.abs(n - p)}">${n > p ? '▲' : '▼'}</i>`);
  const row = x => `<tr data-act="go" data-to="/reports/unit/${esc(x.u.unit_id)}"><th scope="row"><a href="#/reports/unit/${esc(x.u.unit_id)}"><b>${esc(uName(x.u))}</b><small>${esc(bName(x.u))}</small></a></th>
    ${x.months.map((n, i) => cell(n, i, tipOf(x, i, n), M.max)).join('')}<td class="tot num">${x.n}</td><td class="prev num">${x.prev}${chg(x.n, x.prev)}</td>
    <td class="tt">${x.types.slice(0, 3).map(([kk, v]) => `<span class="tchip">${esc(issueLabel(kk))} <b class="num">${v}</b></span>`).join('')}</td></tr>`;
  const trow = x => `<tr class="${f.k === x.k ? 'on' : ''}" data-act="uf-type" data-v="${esc(x.k)}"><th scope="row"><b>${esc(issueLabel(x.k))}</b></th>
    ${x.months.map((n, i) => cell(n, i, `${issueLabel(x.k)} · ${monthName(y, i)} ${y}: ${n}`, M.tmax)).join('')}<td class="tot num">${x.n}</td><td class="prev num">${x.prev}${chg(x.n, x.prev)}</td></tr>`;
  const thead = (first, extra) => `<thead><tr><th scope="col" class="pl">${first}</th>${Array.from({ length: 12 }, (_, i) => mh(i)).join('')}<th scope="col">${t('u_total')} <span class="num">${y}</span></th><th scope="col" class="num">${y - 1}</th>${extra || ''}</tr></thead>`;
  const next = y < M.thisYear ? `<a class="icon-btn" href="#/reports/units/${y + 1}" aria-label="+1">${ICON.next}</a>` : `<span class="icon-btn off" aria-hidden="true">${ICON.next}</span>`;
  return `
    <div class="eval-h"><div><h1>${t('u_title')}</h1><p class="muted">${t('u_sub')}</p></div>${repTabs('units')}</div>
    <div class="rep-bar no-print">
      <div class="month-pick"><a class="icon-btn" href="#/reports/units/${y - 1}" aria-label="-1">${ICON.prev}</a><b class="num">${y}</b>${next}${y !== M.thisYear ? `<a class="btn sm ghost" href="#/reports/units">${t('r_this_year')}</a>` : ''}</div>
      <div class="filters">${sel('b', [['', t('b_all_buildings')]].concat(bCodes().map(c => [c, bLabel(c)])), f.b, t('r_f_building'))}${sel('k', [['', t('u_all_types')]].concat(issueList().map(i => [i.k, i[LANG] || i.ar])), f.k, t('r_col_type'))}</div>
    </div>
    <div class="kpis rep-kpis">
      ${k(M.total, esc(t('u_year_total', { y })), delta, 'lead')}${k(M.rows.length, t('u_places'), esc(t('u_of', { n: M.places })))}
      ${k(M.top ? M.top.n : '—', t('u_top_place'), M.top ? esc(uName(M.top.u) + ' · ' + bName(M.top.u)) : '')}${k(M.topType ? M.topType.n : '—', t('u_top_type'), M.topType ? esc(issueLabel(M.topType.k)) : '')}
    </div>
    ${EMB ? '' : `<section class="card export no-print"><h3>${ICON.download}${esc(t('u_export', { y }))}</h3><div class="x-grid">
      <button class="x-btn" type="button" data-act="u-excel"><b>Excel</b><span>${t('x_units_d')}</span></button>
      <button class="x-btn" type="button" data-act="u-pdf"><b>PDF</b><span>${t('x_period_pdf_d')}</span></button></div></section>`}
    <section class="card"><h3>${ICON.building}${t('u_matrix')}${f.k ? ` · <span class="tchip on">${esc(issueLabel(f.k))}</span>` : ''}</h3>
      ${M.rows.length ? `<div class="heat-wrap"><table class="heat">${thead(t('u_place'), `<th scope="col" class="tt">${t('u_types_col')}</th>`)}<tbody>${M.rows.map(row).join('')}</tbody>
        <tfoot><tr><th scope="row">${t('u_total')}</th>${M.col.map((n, i) => (i >= M.upto ? '<td class="fut"></td>' : `<td class="num">${n}</td>`)).join('')}<td class="tot num">${M.total}</td><td class="prev num">${M.prevTotal}</td><td></td></tr></tfoot></table></div>
        <div class="heat-legend"><span>${t('u_less')}</span>${[1, 2, 3, 4].map(i => `<i class="hc h${i}"></i>`).join('')}<span>${t('u_more')}</span><span class="muted">· ${t('u_open_hint')}</span></div>` : `<p class="empty-line">${esc(t('u_none', { y }))}</p>`}
      ${M.quiet && M.rows.length ? `<p class="muted small">${esc(t('u_quiet', { n: M.quiet, y }))}</p>` : ''}</section>
    ${M.types.length ? `<section class="card"><h3>${ICON.list}${t('u_by_type')}</h3><div class="heat-wrap"><table class="heat types">${thead(t('r_col_type'))}<tbody>${M.types.map(trow).join('')}</tbody></table></div>
      <p class="muted small">${t('u_type_hint')}</p></section>` : ''}`;
}
async function vUnitHistory(id, alive) {
  page(loadingBox(), { staff: true, nav: 'reports' });
  const st = await settings();
  const h = await srpc('unit_history', { p_unit: id });
  if (!alive()) return;
  S.unitHist = { h, st };
  page(`<div class="wrap wide">${unitHistoryBody()}</div>`, { staff: true, nav: 'reports' });
  heatToNow();
}
function unitHistoryModel() {
  const { h, st } = S.unitHist, u = h.unit, real = h.requests.filter(r => r.status !== 'cancelled');
  const thisYear = +dayKey(Date.now()).slice(0, 4), upNow = +dayKey(Date.now()).slice(5, 7);
  const years = { [thisYear]: Array(12).fill(0) }, types = {};
  real.forEach(r => {
    const kd = dayKey(r.created_at), yy = +kd.slice(0, 4), mi = +kd.slice(5, 7) - 1;
    (years[yy] || (years[yy] = Array(12).fill(0)))[mi]++;
    const x = types[r.issue_type] || (types[r.issue_type] = { k: r.issue_type, n: 0, by: {} }); x.n++; x.by[yy] = (x.by[yy] || 0) + 1;
  });
  const ylist = Object.keys(years).map(Number).sort((a, b) => b - a);
  const sum = a => (a || []).reduce((s2, v) => s2 + v, 0);
  const rated = real.filter(r => r.rating);
  return {
    u, st, real, all: h.requests, thisYear, upNow, years, ylist, sum,
    types: Object.values(types).sort((a, b) => b.n - a.n), repeatOf: repeatsIn(real, real, st),
    rating: rated.length ? rated.reduce((s2, r) => s2 + r.rating, 0) / rated.length : null, ratedN: rated.length,
    max: Math.max(1, ...ylist.map(yy => Math.max(...years[yy]))), first: real.length ? real[real.length - 1].created_at : null
  };
}
function unitHistoryBody() {
  const M = unitHistoryModel(), u = M.u, ty = M.thisYear;
  const k = (v, l, s2, cls) => `<div class="kpi ${cls || ''}"><span class="v">${v}</span><span class="l">${l}</span>${s2 ? `<span class="s">${s2}</span>` : ''}</div>`;
  const nThis = M.sum(M.years[ty]), nPrev = M.sum(M.years[ty - 1]), d = nThis - nPrev;
  const mh = i => `<th scope="col" class="mo"><span class="m-l">${esc(monthName(ty, i, true))}</span><span class="m-s num">${i + 1}</span></th>`;
  const yrow = yy => `<tr><th scope="row" class="num">${yy}</th>${M.years[yy].map((n, i) => (yy === ty && i >= M.upNow ? `<td aria-hidden="true"><span class="hc fut"></span></td>` : `<td title="${esc(monthName(yy, i) + ' ' + yy + ': ' + n)}"><span class="hc h${heatLv(n, M.max)}">${n || ''}</span></td>`)).join('')}<td class="tot num">${M.sum(M.years[yy])}</td></tr>`;
  const top = M.types[0];
  return `
    <a class="back no-print" href="#/reports/units">${ICON.back}${t('u_back')}</a>
    <div class="eval-h"><div><small class="muted">${t('u_history')}</small><h1>${esc(uName(u))} · ${esc(bName(u))}</h1>${M.first ? `<p class="muted">${esc(t('u_since', { d: fmt(M.first, { month: 'long', year: 'numeric' }) }))}</p>` : ''}</div></div>
    <div class="kpis rep-kpis">
      ${k(M.real.length, t('u_all_time'), '', 'lead')}
      ${k(nThis, esc(t('u_year_total', { y: ty })), d ? `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}</span> ${esc(t('u_vs', { y: ty - 1 }))}` : esc(t('r_same', { p: String(ty - 1) })))}
      ${k(top ? top.n : '—', t('u_top_type'), top ? esc(issueLabel(top.k)) : '')}
      ${k(M.repeatOf.size, t('u_repeat'), esc(t('u_repeat_s', { d: M.st.repeatDays || 30 })), M.repeatOf.size ? 'attn warn' : '')}
      ${k(M.rating == null ? '—' : M.rating.toFixed(1), t('e_rating'), M.ratedN ? t('e_rated', { n: M.ratedN }) : '')}
    </div>
    ${EMB || !M.real.length ? '' : `<section class="card export no-print"><h3>${ICON.download}${t('u_export_one')}</h3><div class="x-grid"><button class="x-btn" type="button" data-act="uh-excel"><b>Excel</b><span>${t('x_unit_d')}</span></button></div></section>`}
    <section class="card"><h3>${ICON.chart}${t('u_by_year')}</h3><div class="heat-wrap"><table class="heat years"><thead><tr><th scope="col" class="pl"></th>${Array.from({ length: 12 }, (_, i) => mh(i)).join('')}<th scope="col">${t('u_total')}</th></tr></thead><tbody>${M.ylist.map(yrow).join('')}</tbody></table></div></section>
    ${M.types.length ? `<section class="card"><h3>${ICON.list}${t('u_by_type')}</h3><div class="ptable-wrap"><table class="ptable dist"><thead><tr><th>${t('r_col_type')}</th>${M.ylist.map(yy => `<th class="num">${yy}</th>`).join('')}<th>${t('u_total')}</th></tr></thead><tbody>
      ${M.types.map(x => `<tr><th>${esc(issueLabel(x.k))}</th>${M.ylist.map(yy => `<td>${x.by[yy] || '—'}</td>`).join('')}<td><b>${x.n}</b></td></tr>`).join('')}</tbody></table></div></section>` : ''}
    <section class="card"><h3>${ICON.list}${t('u_list')}<span class="count">${M.all.length}</span></h3>
      ${M.all.length ? `<div class="rep-list">${M.all.map(r => repRow(r, 'month')).join('')}</div>` : `<p class="empty-line">${t('r_none')}</p>`}</section>`;
}
function xlKit() {
  const rtl = LANG === 'ar';
  const C = { gold: 'FF8B7E49', ink: 'FF262521', muted: 'FF8A8576', line: 'FFE3DBC9', soft: 'FFF6F3EC', ok: 'FF2E7D4F', warn: 'FF9A6200', bad: 'FFB3261E', white: 'FFFFFFFF', h: [null, 'FFF2EEE2', 'FFE3DAC0', 'FFC9BC93', 'FF6F6436'] };
  const font = o => Object.assign({ name: 'Arial', size: 11, color: { argb: C.ink } }, o || {});
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const edge = { style: 'thin', color: { argb: C.line } }, box = { top: edge, bottom: edge, left: edge, right: edge };
  const align = o => Object.assign({ vertical: 'middle', horizontal: rtl ? 'right' : 'left', readingOrder: rtl ? 'rtl' : 'ltr', wrapText: true }, o || {});
  const head = (row, cells) => { cells.forEach((v, i) => { const c = row.getCell(i + 1); c.value = v; c.font = font({ bold: true, color: { argb: C.white } }); c.fill = fill(C.gold); c.alignment = align({ horizontal: 'center' }); c.border = box; }); row.height = 30; };
  const heatCell = (c, n, max) => { const lv = heatLv(n, max); c.value = n || null; c.border = box; c.alignment = align({ horizontal: 'center' }); if (lv) c.fill = fill(C.h[lv]); c.font = font({ size: 10, bold: lv >= 3, color: { argb: lv === 4 ? C.white : C.ink } }); };
  const titleRows = (ws, title, sub, span) => {
    ws.mergeCells(1, 1, 1, span); ws.getCell(1, 1).value = title; ws.getCell(1, 1).font = font({ size: 16, bold: true }); ws.getCell(1, 1).alignment = align(); ws.getRow(1).height = 30;
    ws.mergeCells(2, 1, 2, span); ws.getCell(2, 1).value = sub; ws.getCell(2, 1).font = font({ color: { argb: C.muted } }); ws.getCell(2, 1).alignment = align();
  };
  return { rtl, C, font, fill, box, align, head, heatCell, titleRows, stamp: fmt(new Date(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) };
}
async function exportUnitsExcel() {
  await loadScript(VENDOR.exceljs);
  const M = unitsModel(), y = M.y, X = xlKit(), { font, fill, box, align, head, heatCell, titleRows, C } = X, f = S.uf;
  const wb = new window.ExcelJS.Workbook(); wb.creator = t('app'); wb.created = new Date();
  const sub = [org(), f.b ? bLabel(f.b) : t('b_all_buildings'), f.k ? issueLabel(f.k) : t('u_all_types'), t('x_generated', { d: X.stamp })].filter(Boolean).join(' · ');
  const months = Array.from({ length: 12 }, (_, i) => monthName(y, i, true));
  // 1. every location, month by month, with last year and the most frequent problems
  const s1 = wb.addWorksheet(t('x_units_sheet'), { views: [{ rightToLeft: X.rtl, state: 'frozen', xSplit: 2, ySplit: 3 }] });
  const h1 = [t('col_building'), t('u_place')].concat(months, [t('u_total') + ' ' + y, String(y - 1), t('u_change'), t('u_types_col')]);
  s1.columns = h1.map((x, i) => ({ width: i < 2 ? 22 : i < 14 ? 8 : i < 17 ? 11 : 40 }));
  titleRows(s1, t('u_title') + ' · ' + y, sub, h1.length); head(s1.getRow(3), h1);
  M.all.forEach((x, i) => {
    const row = s1.getRow(i + 4);
    row.getCell(1).value = bName(x.u); row.getCell(2).value = uName(x.u);
    [1, 2].forEach(j => { const c = row.getCell(j); c.border = box; c.alignment = align(); c.font = font({ size: 10, bold: j === 2 }); });
    x.months.forEach((n, mi) => heatCell(row.getCell(3 + mi), mi < M.upto ? n : null, M.max));
    const tail = [x.n, x.prev, x.n - x.prev, x.types.map(([kk, v]) => issueLabel(kk) + ' ' + v).join('، ')];
    tail.forEach((v, j) => { const c = row.getCell(15 + j); c.value = v === 0 && j < 3 ? 0 : v || null; c.border = box; c.alignment = align(j < 3 ? { horizontal: 'center' } : {}); c.font = font({ size: 10, bold: j === 0, color: { argb: j === 2 && v > 0 ? C.bad : j === 2 && v < 0 ? C.ok : C.ink } }); });
    row.height = 20;
  });
  const tr = s1.getRow(M.all.length + 4);
  tr.getCell(2).value = t('u_total'); M.col.forEach((n, mi) => { tr.getCell(3 + mi).value = mi < M.upto ? n : null; });
  tr.getCell(15).value = M.total; tr.getCell(16).value = M.prevTotal; tr.getCell(17).value = M.total - M.prevTotal;
  for (let j = 1; j <= h1.length; j++) { const c = tr.getCell(j); c.font = font({ bold: true }); c.fill = fill(C.soft); c.border = box; c.alignment = align(j > 2 ? { horizontal: 'center' } : {}); }
  s1.autoFilter = { from: { row: 3, column: 1 }, to: { row: M.all.length + 3, column: h1.length } };
  // 2. every location by problem type, for the year
  const tk = M.types.filter(x => x.n).map(x => x.k);
  const s2 = wb.addWorksheet(t('x_unit_types_sheet'), { views: [{ rightToLeft: X.rtl, state: 'frozen', xSplit: 2, ySplit: 3 }] });
  const h2 = [t('col_building'), t('u_place')].concat(tk.map(issueLabel), [t('u_total')]);
  s2.columns = h2.map((x, i) => ({ width: i < 2 ? 22 : 14 }));
  titleRows(s2, t('u_by_type') + ' · ' + y, sub, h2.length); head(s2.getRow(3), h2);
  const tmax = Math.max(1, ...M.rows.map(x => Math.max(0, ...x.types.map(e => e[1]))));
  M.rows.forEach((x, i) => {
    const row = s2.getRow(i + 4), by = Object.fromEntries(x.types);
    row.getCell(1).value = bName(x.u); row.getCell(2).value = uName(x.u);
    [1, 2].forEach(j => { const c = row.getCell(j); c.border = box; c.alignment = align(); c.font = font({ size: 10, bold: j === 2 }); });
    tk.forEach((kk, j) => heatCell(row.getCell(3 + j), by[kk] || 0, tmax));
    const c = row.getCell(3 + tk.length); c.value = x.n; c.border = box; c.font = font({ bold: true }); c.alignment = align({ horizontal: 'center' });
  });
  // 3. each problem type, month by month
  const s3 = wb.addWorksheet(t('x_types_sheet'), { views: [{ rightToLeft: X.rtl, state: 'frozen', xSplit: 1, ySplit: 3 }] });
  const h3 = [t('r_col_type')].concat(months, [t('u_total') + ' ' + y, String(y - 1)]);
  s3.columns = h3.map((x, i) => ({ width: i ? 9 : 28 }));
  titleRows(s3, t('u_by_type') + ' · ' + y, sub, h3.length); head(s3.getRow(3), h3);
  M.types.forEach((x, i) => {
    const row = s3.getRow(i + 4);
    row.getCell(1).value = issueLabel(x.k); row.getCell(1).border = box; row.getCell(1).font = font({ size: 10, bold: true }); row.getCell(1).alignment = align();
    x.months.forEach((n, mi) => heatCell(row.getCell(2 + mi), mi < M.upto ? n : null, M.tmax));
    [x.n, x.prev].forEach((v, j) => { const c = row.getCell(14 + j); c.value = v; c.border = box; c.font = font({ bold: !j }); c.alignment = align({ horizontal: 'center' }); });
  });
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `rasd-flats-${y}.xlsx`);
}
function exportUnitsPdf() {
  const M = unitsModel(), y = M.y, f = S.uf;
  const kp = (v, l, s2) => `<div class="rp-k"><b>${v}</b><span>${l}</span>${s2 ? `<small>${s2}</small>` : ''}</div>`;
  const mth = Array.from({ length: 12 }, (_, i) => `<th>${esc(monthName(y, i, true))}</th>`).join('');
  const cells = (arr, max) => arr.map((n, i) => (i >= M.upto ? '<td></td>' : `<td class="ph${heatLv(n, max)}">${n || ''}</td>`)).join('');
  const html = `<div class="rp" dir="${LANG === 'ar' ? 'rtl' : 'ltr'}" lang="${LANG}">
    <header class="rp-h"><div class="rp-brand">${MARK}<div><b>${t('app')}</b><span>${esc(org() || t('tagline'))}</span></div></div>
      <div class="rp-t"><h1>${t('u_title')} · ${y}</h1><p>${esc([f.b ? bLabel(f.b) : t('b_all_buildings'), f.k ? issueLabel(f.k) : t('u_all_types')].join(' · '))}</p><small>${esc(t('x_generated', { d: xlKit().stamp }))}</small></div></header>
    <div class="rp-ks">${kp(M.total, esc(t('u_year_total', { y })), (M.total - M.prevTotal > 0 ? '+' : '') + (M.total - M.prevTotal) + ' ' + esc(t('u_vs', { y: y - 1 })))}${kp(M.rows.length, t('u_places'), esc(t('u_of', { n: M.places })))}${kp(M.top ? M.top.n : '—', t('u_top_place'), M.top ? esc(uName(M.top.u) + ' · ' + bName(M.top.u)) : '')}${kp(M.topType ? M.topType.n : '—', t('u_top_type'), M.topType ? esc(issueLabel(M.topType.k)) : '')}</div>
    <h2>${t('u_matrix')}</h2>
    <table class="rp-tb rp-heat"><thead><tr><th>${t('u_place')}</th>${mth}<th>${y}</th><th>${y - 1}</th></tr></thead><tbody>
      ${M.rows.map(x => `<tr><td><b>${esc(uName(x.u))}</b> <small>${esc(bName(x.u))}</small></td>${cells(x.months, M.max)}<td><b>${x.n}</b></td><td>${x.prev}</td></tr>`).join('')}
      <tr class="rp-sum-row"><td><b>${t('u_total')}</b></td>${M.col.map((n, i) => `<td><b>${i >= M.upto ? '' : n}</b></td>`).join('')}<td><b>${M.total}</b></td><td><b>${M.prevTotal}</b></td></tr></tbody></table>
    ${M.quiet ? `<p class="rp-note">${esc(t('u_quiet', { n: M.quiet, y }))}</p>` : ''}
    <h2>${t('u_by_type')}</h2>
    <table class="rp-tb rp-heat"><thead><tr><th>${t('r_col_type')}</th>${mth}<th>${y}</th><th>${y - 1}</th></tr></thead><tbody>
      ${M.types.map(x => `<tr><td><b>${esc(issueLabel(x.k))}</b></td>${cells(x.months, M.tmax)}<td><b>${x.n}</b></td><td>${x.prev}</td></tr>`).join('')}</tbody></table>
  </div>`;
  printHtml(html, `rasd-flats-${y}`);
}
async function exportUnitExcel() {
  await loadScript(VENDOR.exceljs);
  const M = unitHistoryModel(), u = M.u, X = xlKit(), { font, box, align, head, heatCell, titleRows } = X;
  const wb = new window.ExcelJS.Workbook(); wb.creator = t('app'); wb.created = new Date();
  const s1 = wb.addWorksheet(t('u_by_year'), { views: [{ rightToLeft: X.rtl, showGridLines: false }] });
  const h1 = [''].concat(Array.from({ length: 12 }, (_, i) => monthName(M.thisYear, i, true)), [t('u_total')]);
  s1.columns = h1.map((x, i) => ({ width: i ? 9 : 14 }));
  titleRows(s1, t('u_history') + ' · ' + uName(u) + ' · ' + bName(u), [org(), t('x_generated', { d: X.stamp })].filter(Boolean).join(' · '), h1.length);
  head(s1.getRow(3), h1);
  M.ylist.forEach((yy, i) => {
    const row = s1.getRow(i + 4); row.getCell(1).value = yy; row.getCell(1).font = font({ bold: true }); row.getCell(1).border = box; row.getCell(1).alignment = align({ horizontal: 'center' });
    M.years[yy].forEach((n, mi) => heatCell(row.getCell(2 + mi), yy === M.thisYear && mi >= M.upNow ? null : n, M.max));
    const c = row.getCell(14); c.value = M.sum(M.years[yy]); c.font = font({ bold: true }); c.border = box; c.alignment = align({ horizontal: 'center' });
  });
  let r = M.ylist.length + 5;
  head(s1.getRow(r++), [t('r_col_type')].concat(M.ylist.map(String), [t('u_total')]));
  M.types.forEach(x => {
    const row = s1.getRow(r++);
    [issueLabel(x.k)].concat(M.ylist.map(yy => x.by[yy] || null), [x.n]).forEach((v, j) => { const c = row.getCell(j + 1); c.value = v; c.border = box; c.font = font({ bold: !j || j === M.ylist.length + 1 }); c.alignment = align(j ? { horizontal: 'center' } : {}); });
  });
  requestsSheet(wb, M.all.slice().sort((a, b) => a.no - b.no).map(x => reqRow(x, M.repeatOf)), X, t('x_requests'));
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `rasd-${String(u.building_code).toLowerCase()}-${String(u.label_en || 'unit').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.xlsx`);
}

/* ============================================================ views: team */
async function vTeam(alive) {
  page(loadingBox(), { staff: true, nav: 'team' });
  const [team] = await Promise.all([srpc('team_list'), settings()]);
  if (!alive()) return;
  S.team = team;
  const admin = isAdmin();
  const member = s => `<div class="member ${s.active ? '' : 'off'}"><div class="av">${initials(s.name)}</div><div class="mi"><b>${esc(s.name)}</b><small>${esc(teamLine(s))} · <span dir="ltr" class="num">${esc(fPhone(s.phone))}</span>${s.active ? '' : ' · ' + t('tm_inactive')}${s.locked ? ' · ' + t('tm_locked') : ''}</small></div>${LIVE ? `<span class="bell ${s.push ? 'on' : ''}" title="${s.push ? t('pu_on') : t('pu_off')}">${ICON.bell}<span class="vh">${s.push ? t('pu_on') : t('pu_off')}</span></span>` : ''}${admin ? `<button class="btn sm ghost" type="button" data-act="staff-edit" data-id="${esc(s.id)}">${t('tm_edit')}</button>` : ''}</div>`;
  const groups = [
    [t('e_hm_group'), team.filter(s => s.role === 'technician' && s.team === 'hm')],
    [t('e_ops_group'), team.filter(s => s.role === 'technician' && s.team !== 'hm')],
    [t('dm_sup') + ' · ' + t('role_admin'), team.filter(s => s.role !== 'technician')]
  ].filter(g => g[1].length);
  page(`<div class="wrap">
    <div class="sec-h"><h1>${t('tm_title')}</h1>${admin ? `<button class="btn primary" type="button" data-act="staff-edit" data-id="">${ICON.plus}${t('tm_add')}</button>` : ''}</div>
    <p class="callout">${ICON.shield}<span>${t(admin ? 'tm_only_you' : 'tm_readonly')}</span></p>
    ${groups.map(g => `<h2 class="sec">${esc(g[0])}<span class="count">${g[1].length}</span></h2><section class="card list">${g[1].map(member).join('')}</section>`).join('')}
    <section class="card"><h3>${t('tm_share')}</h3><p class="mono" dir="ltr">${esc(APP_URL)}</p><div class="row"><button class="btn sm" type="button" data-act="copy" data-v="${esc(APP_URL)}">${ICON.copy}${t('q_copy')}</button></div></section>
  </div>`, { staff: true, nav: 'team' });
}
const genPin = () => { let p = ''; const a = new Uint32Array(6); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((x, i) => (a[i] = Math.random() * 1e9)); a.forEach(x => (p += x % 10)); return p; };
function staffModal(s) {
  const kind = s ? (s.role === 'technician' ? (s.team === 'hm' ? 'hm' : 'ops') : s.role) : 'hm';
  const sites = (s && s.sites) || [];
  const res = bCodes().filter(c => (bMeta(c).type || 'res') === 'res');
  const self = !!(s && S.session && s.id === S.session.me.id);
  modal(`<form class="form" data-form="staff" novalidate><input type="hidden" name="id" value="${s ? esc(s.id) : ''}">
    <h3>${s ? t('tm_edit') : t('tm_add')}</h3>
    <div class="field"><label for="st-n">${t('tm_name')}</label><input id="st-n" name="name" maxlength="80" value="${s ? esc(s.name) : ''}"></div>
    <div class="field"><label for="st-p">${t('tm_phone')}</label><input id="st-p" name="phone" type="tel" inputmode="tel" dir="ltr" value="${s ? esc(fPhone(s.phone)) : ''}"></div>
    ${self ? `<input type="hidden" name="kind" value="admin"><p class="muted small">${ICON.shield} ${t('tm_self_role')}</p>` : `<div class="field"><label for="st-r">${t('tm_role')}</label><select id="st-r" name="kind">
      <option value="hm" ${kind === 'hm' ? 'selected' : ''}>${t('team_hm')}</option>
      <option value="ops" ${kind === 'ops' ? 'selected' : ''}>${t('tech_ops')}</option>
      <option value="supervisor" ${kind === 'supervisor' ? 'selected' : ''}>${t('dm_sup')}</option></select></div>`}
    <fieldset class="field sites" ${kind === 'hm' ? '' : 'hidden'}><legend>${t('tm_sites')}</legend><p class="hint">${t('tm_hm_hint')}</p>
      <div class="chips">${res.map(c => `<label class="chip-check"><input type="checkbox" name="site" value="${esc(c)}" ${sites.includes(c) ? 'checked' : ''}><span>${esc(bLabel(c))}</span></label>`).join('')}</div></fieldset>
    ${s && !self ? `<label class="check"><input type="checkbox" name="active" ${s.active ? 'checked' : ''}> ${t('tm_active')}</label>` : ''}
    <div class="field"><label for="st-pin">${s ? t('tm_pin_new') : t('tm_pin')}</label><div class="row"><input id="st-pin" name="pin" inputmode="numeric" maxlength="6" dir="ltr" value="${s ? '' : genPin()}"><button type="button" class="btn sm" data-act="gen-pin">${t('tm_gen')}</button></div></div>
    <p class="err" data-err="form"></p>
    <div class="row end">${s && !self ? `<button type="button" class="btn ghost danger push-start" data-act="staff-del" data-id="${esc(s.id)}">${ICON.trash}${t('tm_delete')}</button>` : ''}<button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button class="btn primary" type="submit">${t('save')}</button></div>
  </form>`);
}

/* ============================================================ views: settings */
async function vSettings(alive) {
  page(loadingBox(), { staff: true, nav: 'settings' });
  const [st, units] = await Promise.all([settings(true), srpc('admin_units')]);
  if (!alive()) return;
  const codes = bCodes();
  units.forEach(u => { if (!codes.includes(u.building_code)) codes.push(u.building_code); });
  const tg = st.targets || {};
  const val = v => (v == null ? '' : esc(v));
  page(`<form class="wrap" data-form="settings" novalidate>
    <div class="sec-h"><h1>${t('se_title')}</h1><button class="btn primary" type="submit">${t('save')}</button></div>
    <p class="muted small">${ICON.shield} ${t('se_only_you')}</p>
    <section class="card"><h3>${t('se_contractor')}</h3><div class="grid2"><div class="field"><label for="c-ar">${t('se_label_ar')}</label><input id="c-ar" name="c_ar" value="${val(st.contractor && st.contractor.ar)}"></div><div class="field"><label for="c-en">${t('se_label_en')}</label><input id="c-en" name="c_en" dir="ltr" value="${val(st.contractor && st.contractor.en)}"></div></div></section>
    <section class="card"><h3>${ICON.clock}${t('se_targets')}</h3>
      <div class="ptable-wrap"><table class="tgt"><thead><tr><th></th><th>${t('se_dispatch')}</th><th>${t('se_pickup')}</th><th>${t('se_arrive')}</th><th>${t('se_work')}</th></tr></thead><tbody>
      ${['urgent', 'normal'].map(p => `<tr><th>${t('pr_' + p)}</th>${['dispatch', 'pickup', 'arrive', 'work'].map(k => `<td><input type="number" min="1" max="10080" inputmode="numeric" name="tg_${p}_${k}" id="tg-${p}-${k}" aria-label="${t('pr_' + p)} ${t('se_' + k)}" value="${val((tg[p] || {})[k])}"></td>`).join('')}</tr>`).join('')}
      </tbody></table></div><p class="hint">${t('se_hm_note')}</p><p class="hint">${t('se_note')}</p></section>
    <section class="card"><h3>${ICON.building}${t('se_buildings')}</h3><p class="hint">${t('se_b_hint')}</p>
      ${codes.map(c => { const b = bMeta(c), u = units.find(x => x.building_code === c) || {}; const name = (LANG === 'ar' ? b.ar || u.building_ar : b.en || u.building_en) || c; return `<div class="bld" data-code="${esc(c)}"><b>${esc(name)} <span class="muted mono">${esc(c)}</span></b>
        <div class="grid2"><div class="field"><label for="b-${c}-t">${t('se_b_type')}</label><select id="b-${c}-t" name="b_${c}_type"><option value="res" ${(b.type || 'res') === 'res' ? 'selected' : ''}>${t('type_res')}</option><option value="com" ${b.type === 'com' ? 'selected' : ''}>${t('type_com')}</option></select></div>
        <div class="field"><label for="b-${c}-o">${t('se_b_ops')}</label><input type="number" min="5" max="1440" inputmode="numeric" id="b-${c}-o" name="b_${c}_ops" value="${val(b.ops)}"></div></div>
        <div class="field"><span class="lbl">${t('se_b_loc')}</span><div class="row"><input name="b_${c}_lat" id="b-${c}-lat" aria-label="${t('se_lat')}" placeholder="${t('se_lat')}" dir="ltr" value="${val(b.lat)}"><input name="b_${c}_lng" id="b-${c}-lng" aria-label="${t('se_lng')}" placeholder="${t('se_lng')}" dir="ltr" value="${val(b.lng)}">${EMB ? '' : `<button type="button" class="btn sm" data-act="here" data-code="${esc(c)}">${ICON.pin}${t('se_b_here')}</button>`}</div></div></div>`; }).join('')}
    </section>
    <section class="card"><div class="sec-h"><h3>${t('se_issues')}</h3><button type="button" class="btn sm" data-act="issue-add">${ICON.plus}${t('se_add_issue')}</button></div><div id="issues">${(st.issueTypes || []).map(issueRow).join('')}</div></section>
    ${LIVE ? `<section class="card"><h3>${ICON.bell}${t('pu_sys')}</h3><div id="push-admin"><div class="spin"></div></div></section>` : ''}
    <section class="card"><div class="field"><label for="se-rep">${t('se_repeat')}</label><input id="se-rep" type="number" name="repeat" min="1" max="365" value="${val(st.repeatDays || 30)}"></div></section>
    <p class="err" data-err="form"></p>
    <button class="btn primary big" type="submit">${t('save')}</button>
  </form>`, { staff: true, nav: 'settings' });
  S.unitsForSettings = units;
  fillPushAdmin();
}
let ISSUE_SEQ = 0;
function issueRow(i) {
  const n = ++ISSUE_SEQ;
  return `<div class="issue-row" data-k="${esc(i.k || '')}"><input name="ia" id="ia-${n}" aria-label="${t('se_label_ar')}" placeholder="${t('se_label_ar')}" value="${esc(i.ar || '')}"><input name="ie" id="ie-${n}" aria-label="${t('se_label_en')}" placeholder="${t('se_label_en')}" dir="ltr" value="${esc(i.en || '')}"><select name="ip" id="ip-${n}" aria-label="${t('d_priority')}"><option value="urgent" ${i.p === 'urgent' ? 'selected' : ''}>${t('pr_urgent')}</option><option value="normal" ${i.p !== 'urgent' ? 'selected' : ''}>${t('pr_normal')}</option></select><button type="button" class="btn sm ghost danger" data-act="issue-del">${t('se_remove')}</button></div>`;
}

/* ============================================================ views: QR */
async function vQr(alive) {
  page(loadingBox(), { staff: true, nav: 'qr' });
  const [units] = await Promise.all([srpc('admin_units'), settings()]);
  await loadScript(VENDOR.qrcode).catch(() => {});
  if (!alive()) return;
  S.units = units;
  const order = bCodes();
  const groups = [];
  units.forEach(u => { let g = groups.find(x => x.code === u.building_code); if (!g) groups.push((g = { code: u.building_code, ar: u.building_ar, en: u.building_en, units: [] })); g.units.push(u); });
  groups.sort((a, b) => ((order.indexOf(a.code) + 1 || 99) - (order.indexOf(b.code) + 1 || 99)));
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
  const codes = bCodes().map(c => ({ code: c, ar: bMeta(c).ar, en: bMeta(c).en }));
  (S.units || []).forEach(u => { if (!codes.find(c => c.code === u.building_code)) codes.push({ code: u.building_code, ar: u.building_ar, en: u.building_en }); });
  modal(`<form class="form" data-form="unit-add" novalidate><h3>${t('q_add')}</h3>
    <div class="field"><label for="ua-b">${t('q_building')}</label><select id="ua-b" name="b">${codes.map(c => `<option value="${esc(c.code)}">${esc((LANG === 'ar' ? c.ar : c.en) || c.code)}</option>`).join('')}<option value="__new">${t('q_new_building')}</option></select></div>
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
  S.settings = S.settings || db.settings;
  const hm = db.staff.filter(s => s.role === 'technician' && s.team === 'hm' && s.active);
  const ops = db.staff.filter(s => s.role === 'technician' && s.team !== 'hm' && s.active);
  const units = db.units.filter(u => u.active);
  const order = bCodes();
  units.sort((a, b) => ((order.indexOf(a.building_code) + 1 || 99) - (order.indexOf(b.building_code) + 1 || 99)) || a.sort - b.sort);
  page(`<div class="wrap wide">
    <div class="demo-hero"><h1>${t('dm_title')}</h1><p class="lead">${t('dm_lead')}</p></div>
    <ol class="flow">${['dm_s1', 'dm_s2', 'dm_s3', 'dm_s4'].map(k => `<li>${t(k)}</li>`).join('')}</ol>
    <p class="muted">${t('dm_body')}</p>
    <div class="demo-grid">
      <article class="demo-role"><span class="step-n num">1</span><div class="ic-b">${ICON.door}</div><h3>${t('dm_tenant')}</h3><p>${t('dm_tenant_body')}</p>
        <div class="field"><label class="vh" for="dm-unit">${t('q_building')}</label><select id="dm-unit">${order.map(c => { const us = units.filter(u => u.building_code === c); return us.length ? `<optgroup label="${esc(bLabel(c))}">${us.map(u => `<option value="${esc(u.token)}" ${myRequests().some(m => m.token === u.token) ? 'selected' : ''}>${esc(LANG === 'ar' ? u.label_ar : u.label_en)} · ${esc(LANG === 'ar' ? u.building_ar : u.building_en)}</option>`).join('')}</optgroup>` : ''; }).join('')}</select></div>
        <button class="btn primary" type="button" data-act="dm-unit">${t('dm_open_unit')}</button></article>
      <article class="demo-role"><span class="step-n num">2</span><div class="ic-b">${ICON.list}</div><h3>${t('dm_sup')}</h3><p>${t('dm_sup_body')}</p><button class="btn primary" type="button" data-act="dm-login" data-id="s-sup">${t('dm_enter')}</button></article>
      <article class="demo-role"><span class="step-n num">3</span><div class="ic-b">${ICON.wrench}</div><h3>${t('dm_team')}</h3><p>${t('dm_team_body')}</p>
        <p class="grp">${t('e_hm_group')}</p><div class="row">${hm.map(s => `<button class="btn" type="button" data-act="dm-login" data-id="${esc(s.id)}">${esc(s.full_name)}<small class="muted">${esc((s.sites || []).map(bLabel).join('، '))}</small></button>`).join('')}</div>
        <p class="grp">${t('e_ops_group')}</p><div class="row">${ops.map(s => `<button class="btn" type="button" data-act="dm-login" data-id="${esc(s.id)}">${esc(s.full_name)}</button>`).join('')}</div></article>
      <article class="demo-role"><span class="step-n num">4</span><div class="ic-b">${ICON.chartbig}</div><h3>${t('dm_admin')}</h3><p>${t('dm_admin_body')}</p><button class="btn primary" type="button" data-act="dm-login" data-id="s-admin">${t('dm_enter')}</button></article>
    </div>
    <div class="row"><button class="btn ghost" type="button" data-act="dm-reset">${t('dm_reset')}</button></div>
  </div>`, { staff: !!S.session });
}

/* ============================================================ exports: Excel, PDF, PowerPoint */
function exportModel() {
  const { ym, ev, st } = S.evalData;
  const cname = (st.contractor && (st.contractor[LANG] || st.contractor.ar)) || '';
  const buildings = Array.from(new Set(ev.real.map(r => bName(r)))).join('، ');
  const rows = ev.month.slice().sort((a, b) => a.no - b.no).map(r => reqRow(r, ev.repeatOf));
  const ratio = x => Math.max(x.arr != null && x.arrT ? x.arr / x.arrT : 0, x.work != null && x.workT ? x.work / x.workT : 0);
  const late = ev.late.map(l => ({ r: l.r, name: l.name, team: l.team, arr: minsOf(l.arrive), arrT: l.t_arrive, arrOk: l.arrOk, work: minsOf(l.work), workT: l.t_work, workOk: l.workOk }))
    .sort((a, b) => ratio(b) - ratio(a));
  return { ym, ev, st, cname, buildings, rows, late, month: ymLabel(ym), stamp: fmt(new Date(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) };
}
const closedBy = r => (r.close_method === 'manual' ? t('cm_manual') : r.signoff_method ? t('cm_' + r.signoff_method) : '');
function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function weakest(k) {
  const c = [['e_arr_on', k.arrRate, pct(k.arrRate)], ['e_fix_on', k.fixRate, pct(k.fixRate)], ['e_rating', k.rating != null ? k.rating / 5 : null, k.rating != null ? k.rating.toFixed(1) + ' / 5' : '']].filter(x => x[1] != null);
  return c.length ? c.sort((a, b) => a[1] - b[1])[0] : null;
}

/* ----- Excel */
async function exportExcel() {
  await loadScript(VENDOR.exceljs);
  const m = exportModel(), ev = m.ev, k = ev.all, rtl = LANG === 'ar';
  const C = { gold: 'FF8B7E49', ink: 'FF262521', muted: 'FF8A8576', line: 'FFE3DBC9', soft: 'FFF6F3EC', ok: 'FF2E7D4F', okSoft: 'FFE3F1E8', warn: 'FF9A6200', warnSoft: 'FFFDF1D8', bad: 'FFB3261E', badSoft: 'FFFBE8E6', white: 'FFFFFFFF' };
  const font = o => Object.assign({ name: 'Arial', size: 11, color: { argb: C.ink } }, o || {});
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const edge = { style: 'thin', color: { argb: C.line } };
  const box = { top: edge, bottom: edge, left: edge, right: edge };
  const align = o => Object.assign({ vertical: 'middle', horizontal: rtl ? 'right' : 'left', readingOrder: rtl ? 'rtl' : 'ltr', wrapText: true }, o || {});
  const scoreFill = s => (s == null ? null : s >= 85 ? [C.okSoft, C.ok] : s >= 70 ? [C.warnSoft, C.warn] : [C.badSoft, C.bad]);
  const head = (row, cells) => {
    cells.forEach((v, i) => { const c = row.getCell(i + 1); c.value = v; c.font = font({ bold: true, color: { argb: C.white } }); c.fill = fill(C.gold); c.alignment = align({ horizontal: 'center' }); c.border = box; });
    row.height = 30;
  };
  const wb = new window.ExcelJS.Workbook();
  wb.creator = t('app'); wb.created = new Date();

  // summary sheet
  const s = wb.addWorksheet(t('x_summary'), { views: [{ rightToLeft: rtl, showGridLines: false }], properties: { defaultRowHeight: 20 } });
  s.columns = [{ width: 30 }, { width: 18 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 11 }];
  s.mergeCells('A1:I1'); s.getCell('A1').value = t('e_title') + ' · ' + m.month; s.getCell('A1').font = font({ size: 18, bold: true }); s.getCell('A1').alignment = align(); s.getRow(1).height = 34;
  s.mergeCells('A2:I2'); s.getCell('A2').value = [m.cname ? t('e_contractor', { n: m.cname }) : '', m.buildings, t('x_generated', { d: m.stamp })].filter(Boolean).join(' · ');
  s.getCell('A2').font = font({ color: { argb: C.muted } }); s.getCell('A2').alignment = align();
  let r = 4;
  const kpi = (label, value, numFmt, note, color) => {
    const row = s.getRow(r++);
    row.getCell(1).value = label; row.getCell(1).font = font({ bold: true }); row.getCell(1).alignment = align();
    const v = row.getCell(2); v.value = value == null ? '—' : value; if (numFmt && value != null) v.numFmt = numFmt;
    v.font = font({ bold: true, size: 13, color: { argb: color || C.ink } }); v.alignment = align({ horizontal: 'center' });
    s.mergeCells(`C${row.number}:I${row.number}`); row.getCell(3).value = note || ''; row.getCell(3).font = font({ color: { argb: C.muted } }); row.getCell(3).alignment = align();
    [1, 2, 3].forEach(i => { row.getCell(i).fill = fill(C.soft); row.getCell(i).border = box; });
    row.height = 24;
  };
  const sc = scoreFill(k.score);
  kpi(t('e_score'), k.score, '0', t('of100'), sc && sc[1]);
  kpi(t('e_requests'), k.n, '0', t('e_closed_open', { c: k.closed, o: k.open }) + (ev.cancelled ? ' · ' + t('e_cancelled', { n: ev.cancelled }) : ''));
  kpi(t('e_arr_on'), k.arrRate, '0%', k.arrN ? k.arrOn + ' / ' + k.arrN : '');
  kpi(t('e_fix_on'), k.fixRate, '0%', k.fixN ? k.fixOn + ' / ' + k.fixN : '');
  kpi(t('e_rating'), k.rating == null ? null : +k.rating.toFixed(2), '0.0', k.ratedN ? t('e_rated', { n: k.ratedN }) : '');
  if (k.dispN) {
    kpi(t('e_avg_dispatch'), minsOf(k.dispatch), '0', t('x_minutes') + ' · ' + t('e_sup_note'));
    kpi(t('e_dispatch_on'), k.dispRate, '0%', k.dispOn + ' / ' + k.dispN, k.dispRate != null && k.dispRate < 0.8 ? C.warn : C.ok);
  }
  kpi(t('e_avg_pickup'), minsOf(k.pickup), '0', t('x_minutes'));
  kpi(t('e_avg_arrive'), minsOf(k.arrive), '0', t('x_minutes'));
  kpi(t('e_avg_work'), minsOf(k.work), '0', t('x_minutes'));
  kpi(t('e_paused'), minsOf(k.paused), '0', t('x_minutes'));
  kpi(t('x_f_manual'), k.manualArr, '0', t('x_f_manual_d'), k.manualArr ? C.bad : C.ok);
  kpi(t('x_f_onsite'), k.onsite, '0', t('x_f_onsite_d'), k.onsite ? C.warn : C.ok);
  kpi(t('x_f_close'), k.manualClose, '0', t('x_f_close_d'), k.manualClose ? C.warn : C.ok);
  kpi(t('x_f_repeat'), k.repeats, '0', t('x_f_repeat_d', { d: m.st.repeatDays || 30 }), k.repeats ? C.bad : C.ok);
  r++;
  s.getRow(r).getCell(1).value = t('e_techs'); s.getRow(r).getCell(1).font = font({ bold: true, size: 13 }); r++;
  head(s.getRow(r++), [t('dm_tech'), t('col_team'), t('e_visits'), t('e_arr_on'), t('e_fix_on'), t('e_rating'), t('x_avg_arr_min'), t('x_avg_work_min'), t('e_score')]);
  ev.techs.forEach(x => {
    const row = s.getRow(r++);
    [x.name || '—', x.team === 'hm' ? t('team_hm') : t('team_ops'), x.visits, x.arrRate, x.fixRate, x.rating == null ? null : +x.rating.toFixed(2), minsOf(x.arrive), minsOf(x.work), x.score].forEach((v, i) => {
      const c = row.getCell(i + 1); c.value = v == null ? '—' : v; c.border = box; c.font = font({ bold: i === 0 || i === 8 });
      c.alignment = align(i > 1 ? { horizontal: 'center' } : {});
      if (v != null && (i === 3 || i === 4)) c.numFmt = '0%';
      if (v != null && i === 5) c.numFmt = '0.0';
    });
    const f = scoreFill(x.score); if (f) { row.getCell(9).fill = fill(f[0]); row.getCell(9).font = font({ bold: true, color: { argb: f[1] } }); }
    row.height = 22;
  });
  r++;
  s.getRow(r).getCell(1).value = t('e_by_team'); s.getRow(r).getCell(1).font = font({ bold: true, size: 13 }); r++;
  head(s.getRow(r++), [t('col_team'), t('e_visits'), t('e_arr_on'), t('e_fix_on'), t('e_rating'), t('x_avg_arr_min'), t('x_avg_work_min'), t('e_paused'), '']);
  [['hm', t('e_hm_group')], ['ops', t('e_ops_group')]].forEach(([key, label]) => {
    const x = ev.team[key], row = s.getRow(r++);
    [label, x.visits, x.arrRate, x.fixRate, x.rating == null ? null : +x.rating.toFixed(2), minsOf(x.arrive), minsOf(x.work), minsOf(x.paused)].forEach((v, i) => {
      const c = row.getCell(i + 1); c.value = v == null ? '—' : v; c.border = box; c.font = font({ bold: i === 0 }); c.alignment = align(i ? { horizontal: 'center' } : {});
      if (v != null && (i === 2 || i === 3)) c.numFmt = '0%';
      if (v != null && i === 4) c.numFmt = '0.0';
    });
    row.height = 22;
  });
  r++;
  s.getRow(r).getCell(1).value = t('e_by_priority'); s.getRow(r).getCell(1).font = font({ bold: true, size: 13 }); r++;
  head(s.getRow(r++), [t('d_priority'), t('e_col_count'), t('e_arr_on'), t('e_fix_on'), t('e_rating'), t('x_avg_arr_min'), t('x_avg_work_min'), '']);
  ['urgent', 'normal'].forEach(p => {
    const x = ev.pri[p], row = s.getRow(r++);
    [t('pr_' + p), x.n, x.arrRate, x.fixRate, x.rating == null ? null : +x.rating.toFixed(2), minsOf(x.arrive), minsOf(x.work)].forEach((v, i) => {
      const c = row.getCell(i + 1); c.value = v == null ? '—' : v; c.border = box; c.font = font({ bold: i === 0 }); c.alignment = align(i ? { horizontal: 'center' } : {});
      if (v != null && (i === 2 || i === 3)) c.numFmt = '0%';
      if (v != null && i === 4) c.numFmt = '0.0';
    });
    row.height = 22;
  });
  r++;
  s.mergeCells(`A${r}:I${r}`); s.getCell(`A${r}`).value = t('e_formula', { d: m.st.repeatDays || 30 }); s.getCell(`A${r}`).font = font({ size: 10, color: { argb: C.muted } }); s.getCell(`A${r}`).alignment = align(); s.getRow(r).height = 34;

  requestsSheet(wb, m.rows, { font, fill, box, align, head, C });
  visitsSheet(wb, m.ev.legs, { font, fill, box, align, head, C });
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `rasd-${m.ym}.xlsx`);
}

const xlDate = x => (x ? new Date(D(x).getTime() + OFFSET) : null);
function requestsSheet(wb, rows, X, name) {
  const { font, fill, box, align, head, C } = X, rtl = LANG === 'ar';
  const q = wb.addWorksheet(name || t('x_requests'), { views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }] });
  const cols = [['col_no', 10], ['col_date', 17], ['col_building', 16], ['col_unit', 14], ['col_source', 12], ['col_issue', 26], ['col_priority', 10], ['col_status', 22],
    ['col_assigned_by', 16], ['col_dispatch', 11], ['col_by', 18], ['col_team', 14], ['col_handed', 12], ['col_hm', 16], ['col_declines', 10], ['col_pickup', 11], ['col_arrive', 11], ['col_arrive_t', 11], ['col_arrive_ok', 11], ['col_paused_a', 13],
    ['col_work', 11], ['col_work_t', 11], ['col_work_ok', 11], ['col_paused_w', 13], ['col_total', 11], ['col_method', 13], ['col_report', 44], ['col_parts', 32],
    ['col_rating', 9], ['col_comment', 26], ['col_close', 20], ['col_repeat', 11], ['col_desc', 44]];
  const ix = k => cols.findIndex(c => c[0] === k) + 1;
  q.columns = cols.map(c => ({ width: c[1] }));
  head(q.getRow(1), cols.map(c => t(c[0])));
  const yn = v => (v == null ? '' : v ? t('yes') : t('no'));
  const wide = new Set(['col_issue', 'col_status', 'col_report', 'col_parts', 'col_comment', 'col_desc'].map(k => ix(k) - 1));
  const bad = { size: 10, bold: true, color: { argb: C.bad } };
  rows.forEach((x, i) => {
    const rr = x.r, row = q.getRow(i + 2);
    const vals = [rr.no, xlDate(rr.created_at), bName(rr), uName(rr), t('src_' + (rr.source || 'qr')), issueLabel(rr.issue_type), t('pr_' + rr.priority), statusText(rr),
      x.assignedBy, x.dispatch, x.by, x.team === 'hm' ? t('team_hm') : t('team_ops'), x.handed ? t('yes') : '', x.hm ? x.hm.name || '' : '', x.declines || null, x.pickup, x.arr, x.arrT, yn(x.arrOk), x.pa || null,
      x.work, x.workT, yn(x.workOk), x.pw || null, x.total, rr.arrival_method ? t(rr.arrival_method === 'qr' ? 'm_qr' : 'm_manual') : '', rr.tech_note || '', partsText(rr.parts),
      rr.rating || null, rr.rating_comment || '', closedBy(rr), x.repeat ? t('yes') : '', rr.description || ''];
    vals.forEach((v, j) => {
      const c = row.getCell(j + 1); c.value = v == null ? null : v; c.border = box; c.font = font({ size: 10 });
      c.alignment = align(wide.has(j) ? {} : { horizontal: 'center' });
      if (v instanceof Date) c.numFmt = 'yyyy-mm-dd hh:mm';
    });
    if (x.dispOk === false) row.getCell(ix('col_dispatch')).font = font(bad);
    if (x.arrOk === false) ['col_arrive', 'col_arrive_ok'].forEach(k => (row.getCell(ix(k)).font = font(bad)));
    if (x.workOk === false) ['col_work', 'col_work_ok'].forEach(k => (row.getCell(ix(k)).font = font(bad)));
    if (rr.arrival_method === 'manual') row.getCell(ix('col_method')).font = font({ size: 10, bold: true, color: { argb: C.warn } });
    if (isHeld(rr)) row.getCell(ix('col_status')).font = font({ size: 10, bold: true, color: { argb: C.warn } });
    if (rr.status === 'cancelled') for (let j = 1; j <= cols.length; j++) row.getCell(j).font = font({ size: 10, color: { argb: C.muted } });
    if (i % 2) for (let j = 1; j <= cols.length; j++) row.getCell(j).fill = fill(C.soft);
  });
  q.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: cols.length } };
  return q;
}
function visitsSheet(wb, legs, X) {
  const { font, fill, box, align, head, C } = X, rtl = LANG === 'ar';
  const q = wb.addWorksheet(t('x_visits'), { views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }] });
  const cols = [['col_no', 10], ['col_date', 17], ['col_building', 16], ['col_unit', 14], ['col_tech', 18], ['col_team', 14], ['col_outcome', 22], ['col_assigned_by', 16], ['col_dispatch', 11], ['col_pickup', 11],
    ['col_arrive', 11], ['col_arrive_t', 11], ['col_arrive_ok', 11], ['col_paused_a', 13], ['col_work', 11], ['col_work_t', 11], ['col_work_ok', 11], ['col_paused_w', 13], ['col_method', 13], ['col_note', 40]];
  const ix = k => cols.findIndex(c => c[0] === k) + 1;
  q.columns = cols.map(c => ({ width: c[1] }));
  head(q.getRow(1), cols.map(c => t(c[0])));
  const yn = v => (v == null ? '' : v ? t('yes') : t('no'));
  const bad = { size: 10, bold: true, color: { argb: C.bad } };
  legs.slice().sort((a, b) => a.r.no - b.r.no || D(a.offered_at) - D(b.offered_at)).forEach((l, i) => {
    const row = q.getRow(i + 2);
    const vals = [l.r.no, xlDate(l.accepted_at || l.offered_at), bName(l.r), uName(l.r), l.name || '', l.team === 'hm' ? t('team_hm') : t('team_ops'), t(l.current && l.r.status === 'assigned' ? 'leg_waiting' : 'leg_' + l.outcome),
      l.assigned_by_name || '', minsOf(l.dispatch), minsOf(l.pickup),
      minsOf(l.arrive), l.t_arrive, yn(l.arrOk), minsOf(l.pa) || null, minsOf(l.work), l.work != null ? l.t_work : null, yn(l.workOk), minsOf(l.pw) || null,
      l.arrival_method ? t(l.arrival_method === 'qr' ? 'm_qr' : 'm_manual') : '', ['escalated', 'declined'].includes(l.outcome) ? l.note || '' : l.assign_note || ''];
    vals.forEach((v, j) => {
      const c = row.getCell(j + 1); c.value = v == null ? null : v; c.border = box; c.font = font({ size: 10 });
      c.alignment = align(j === ix('col_note') - 1 || j === ix('col_outcome') - 1 ? {} : { horizontal: 'center' });
      if (v instanceof Date) c.numFmt = 'yyyy-mm-dd hh:mm';
    });
    if (l.dispOk === false) row.getCell(ix('col_dispatch')).font = font(bad);
    if (l.arrOk === false) row.getCell(ix('col_arrive')).font = font(bad);
    if (l.workOk === false) row.getCell(ix('col_work')).font = font(bad);
    if (i % 2) for (let j = 1; j <= cols.length; j++) row.getCell(j).fill = fill(C.soft);
  });
  q.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, legs.length + 1), column: cols.length } };
}

/* ----- PDF (the browser's own "Save as PDF" keeps Arabic text sharp and searchable) */
function reportHtml(m) {
  const ev = m.ev, k = ev.all;
  const num = v => (v == null ? '—' : v);
  const kp = (v, l, s2, cls) => `<div class="rp-k ${cls || ''}"><b>${v}</b><span>${l}</span>${s2 ? `<small>${s2}</small>` : ''}</div>`;
  const tr = cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
  const th = cells => `<thead><tr>${cells.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  const flag = (n, l) => `<span class="${n ? 'on' : ''}">${l}: <b>${n}</b></span>`;
  const cls = s => (s == null ? '' : s >= 85 ? 'good' : s >= 70 ? 'mid' : 'low');
  const lateCell = (v, tg, ok) => (v == null ? '—' : `<span class="${ok === false ? 'bad' : ''}">${v}</span> / ${tg}`);
  const teamRow = (label, x) => tr([label, x.visits, pct(x.arrRate), pct(x.fixRate), x.rating == null ? '—' : x.rating.toFixed(1), fDur(x.arrive), fDur(x.work), fDur(x.paused)]);
  return `<div class="rp" dir="${LANG === 'ar' ? 'rtl' : 'ltr'}" lang="${LANG}">
    <header class="rp-h"><div class="rp-brand">${MARK}<div><b>${t('app')}</b><span>${esc(org() || t('tagline'))}</span></div></div>
      <div class="rp-t"><h1>${t('e_title')} · ${esc(m.month)}</h1><p>${esc([m.cname ? t('e_contractor', { n: m.cname }) : '', m.buildings].filter(Boolean).join(' · '))}</p><small>${esc(t('x_generated', { d: m.stamp }))}</small></div></header>
    <section class="rp-sum"><div class="rp-score ${cls(k.score)}"><span>${t('e_score')}</span><b>${num(k.score)}</b><small>${t('of100')}</small></div>
      <div class="rp-ks">${kp(k.n, t('e_requests'), t('e_closed_open', { c: k.closed, o: k.open }))}${kp(pct(k.arrRate), t('e_arr_on'), k.arrN ? k.arrOn + ' / ' + k.arrN : '')}${kp(pct(k.fixRate), t('e_fix_on'), k.fixN ? k.fixOn + ' / ' + k.fixN : '')}${kp(k.rating == null ? '—' : k.rating.toFixed(1), t('e_rating'), k.ratedN ? t('e_rated', { n: k.ratedN }) : '')}
        ${k.dispN ? kp(fDur(k.dispatch), t('e_avg_dispatch'), t('e_dispatch_on') + ' ' + pct(k.dispRate)) : ''}${kp(fDur(k.pickup), t('e_avg_pickup'))}${kp(fDur(k.arrive), t('e_avg_arrive'))}${kp(fDur(k.work), t('e_avg_work'))}${kp(ev.cancelled, t('st_cancelled'))}</div></section>
    <div class="rp-flags">${flag(k.manualArr, t('x_f_manual'))}${flag(k.onsite, t('x_f_onsite'))}${flag(k.manualClose, t('x_f_close'))}${flag(k.repeats, t('x_f_repeat'))}</div>
    <h2>${t('e_techs')}</h2>
    <table class="rp-tb">${th([t('dm_tech'), t('col_team'), t('e_visits'), t('e_arr_on'), t('e_fix_on'), t('e_rating'), t('e_avg_arrive'), t('e_avg_work'), t('e_score')])}<tbody>
      ${ev.techs.map(x => tr([esc(x.name || '—'), x.team === 'hm' ? t('team_hm') : t('team_ops'), x.visits, pct(x.arrRate), pct(x.fixRate), x.rating == null ? '—' : x.rating.toFixed(1), fDur(x.arrive), fDur(x.work), `<b class="rp-sc ${cls(x.score)}">${num(x.score)}</b>`])).join('')}</tbody></table>
    <h2>${t('e_by_team')}</h2>
    <table class="rp-tb">${th([t('col_team'), t('e_visits'), t('e_arr_on'), t('e_fix_on'), t('e_rating'), t('e_avg_arrive'), t('e_avg_work'), t('e_paused')])}<tbody>${teamRow(t('e_hm_group'), ev.team.hm)}${teamRow(t('e_ops_group'), ev.team.ops)}</tbody></table>
    <h2>${t('e_by_priority')}</h2>
    <table class="rp-tb">${th([t('d_priority'), t('e_col_count'), t('e_arr_on'), t('e_fix_on'), t('e_rating'), t('e_avg_arrive'), t('e_avg_work')])}<tbody>
      ${['urgent', 'normal'].map(p => { const x = ev.pri[p]; return tr([t('pr_' + p), x.n, pct(x.arrRate), pct(x.fixRate), x.rating == null ? '—' : x.rating.toFixed(1), fDur(x.arrive), fDur(x.work)]); }).join('')}</tbody></table>
    ${m.late.length ? `<h2>${t('e_late_list')} (${m.late.length})</h2>
    <table class="rp-tb">${th([t('col_no'), t('col_date'), t('col_unit'), t('col_issue'), t('col_tech'), t('x_arr_vs'), t('x_work_vs')])}<tbody>
      ${m.late.map(x => tr(['#' + x.r.no, fmt(x.r.created_at, { day: 'numeric', month: 'short' }), esc(uName(x.r)), esc(issueLabel(x.r.issue_type)), esc(x.name || '—'), lateCell(x.arr, x.arrT, x.arrOk), lateCell(x.work, x.workT, x.workOk)])).join('')}</tbody></table>` : ''}
    <h2 class="rp-break">${t('x_log')} (${m.rows.length})</h2>
    <table class="rp-tb rp-all">${th([t('col_no'), t('col_date'), t('col_unit'), t('col_issue'), t('col_priority'), t('col_tech'), t('col_status'), t('x_arr_vs'), t('x_work_vs'), t('col_rating'), t('col_close')])}<tbody>
      ${m.rows.map(x => tr(['#' + x.r.no, fmt(x.r.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }), esc(uName(x.r)), esc(issueLabel(x.r.issue_type)), t('pr_' + x.r.priority), esc(x.by || '—'), esc(statusText(x.r)), lateCell(x.arr, x.arrT, x.arrOk), lateCell(x.work, x.workT, x.workOk), x.r.rating || '—', esc(closedBy(x.r))])).join('')}</tbody></table>
    <p class="rp-note">${esc(t('e_formula', { d: m.st.repeatDays || 30 }))} ${esc(t('x_minutes_note'))}</p>
  </div>`;
}
function exportPdf() {
  const m = exportModel();
  printHtml(reportHtml(m), `${t('app')} · ${t('e_title')} · ${m.month}`);
}

/* ----- the period report (Reports page): Excel and PDF */
async function exportPeriodExcel() {
  await loadScript(VENDOR.exceljs);
  const M = repModel(), P = M.P, rtl = LANG === 'ar';
  const C = { gold: 'FF8B7E49', ink: 'FF262521', muted: 'FF8A8576', line: 'FFE3DBC9', soft: 'FFF6F3EC', ok: 'FF2E7D4F', warn: 'FF9A6200', bad: 'FFB3261E', white: 'FFFFFFFF' };
  const font = o => Object.assign({ name: 'Arial', size: 11, color: { argb: C.ink } }, o || {});
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const edge = { style: 'thin', color: { argb: C.line } }, box = { top: edge, bottom: edge, left: edge, right: edge };
  const align = o => Object.assign({ vertical: 'middle', horizontal: rtl ? 'right' : 'left', readingOrder: rtl ? 'rtl' : 'ltr', wrapText: true }, o || {});
  const head = (row, cells) => { cells.forEach((v, i) => { const c = row.getCell(i + 1); c.value = v; c.font = font({ bold: true, color: { argb: C.white } }); c.fill = fill(C.gold); c.alignment = align({ horizontal: 'center' }); c.border = box; }); row.height = 30; };
  const X = { font, fill, box, align, head, C };
  const wb = new window.ExcelJS.Workbook();
  wb.creator = t('app'); wb.created = new Date();
  const stamp = fmt(new Date(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const filt = [S.rf.b ? bLabel(S.rf.b) : t('b_all_buildings'), S.rf.p ? t('pr_' + S.rf.p) : '', S.rf.st ? t('r_s_' + S.rf.st) : ''].filter(Boolean).join(' · ');

  // summary
  const s = wb.addWorksheet(t('x_summary'), { views: [{ rightToLeft: rtl, showGridLines: false }], properties: { defaultRowHeight: 20 } });
  s.columns = [{ width: 34 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 16 }, { width: 16 }];
  s.mergeCells('A1:F1'); s.getCell('A1').value = t('r_title') + ' · ' + P.label; s.getCell('A1').font = font({ size: 18, bold: true }); s.getCell('A1').alignment = align(); s.getRow(1).height = 34;
  s.mergeCells('A2:F2'); s.getCell('A2').value = [org(), filt, t('x_generated', { d: stamp })].filter(Boolean).join(' · '); s.getCell('A2').font = font({ color: { argb: C.muted } }); s.getCell('A2').alignment = align();
  let r = 4;
  const kpi = (label, value, numFmt, note) => {
    const row = s.getRow(r++);
    row.getCell(1).value = label; row.getCell(1).font = font({ bold: true }); row.getCell(1).alignment = align();
    const v = row.getCell(2); v.value = value == null ? '—' : value; if (numFmt && value != null) v.numFmt = numFmt; v.font = font({ bold: true, size: 13 }); v.alignment = align({ horizontal: 'center' });
    s.mergeCells(`C${row.number}:F${row.number}`); row.getCell(3).value = note || ''; row.getCell(3).font = font({ color: { argb: C.muted } }); row.getCell(3).alignment = align();
    [1, 2, 3].forEach(i => { row.getCell(i).fill = fill(C.soft); row.getCell(i).border = box; });
    row.height = 24;
  };
  const d = M.curN - M.prevN;
  kpi(t('r_total'), M.inP.length, '0', (d > 0 ? '+' : '') + d + ' ' + t('r_prev_' + P.unit));
  kpi(t('r_done'), M.groups.done, '0'); kpi(t('r_progress'), M.groups.progress, '0'); kpi(t('r_hold'), M.groups.hold, '0'); kpi(t('r_cancel'), M.groups.cancel, '0');
  kpi(t('r_carried'), M.carried.filter(isOpen).length, '0', t('r_carried_s'));
  kpi(t('r_arr_on'), M.m.arrRate, '0%', M.m.arrN ? M.m.arrOn + ' / ' + M.m.arrN : '');
  kpi(t('r_fix_on'), M.m.fixRate, '0%', M.m.fixN ? M.m.fixOn + ' / ' + M.m.fixN : '');
  if (M.firstLine != null) kpi(t('r_first_line'), M.firstLine, '0%', M.team.hmFixed + ' / ' + (M.team.hmFixed + M.team.hmHanded));
  kpi(t('e_avg_arrive'), minsOf(M.m.arrive), '0', t('x_minutes')); kpi(t('e_avg_work'), minsOf(M.m.work), '0', t('x_minutes'));
  r++;
  s.getRow(r).getCell(1).value = t('r_by_type'); s.getRow(r).getCell(1).font = font({ bold: true, size: 13 }); r++;
  head(s.getRow(r++), [t('r_col_type'), t('col_priority'), t('col_count'), t('r_done'), t('r_col_open'), t('x_avg_work_min')]);
  ['urgent', 'normal'].forEach(p => M.types.filter(x => x.p === p).sort((a, b) => b.n - a.n).forEach(x => {
    const row = s.getRow(r++);
    [issueLabel(x.k), t('pr_' + p), x.n, x.done, x.open, x.work.length ? Math.round(x.work.reduce((a, b) => a + b, 0) / x.work.length / 60000) : null].forEach((v, i) => {
      const c = row.getCell(i + 1); c.value = v == null ? '—' : v; c.border = box; c.font = font({ bold: i === 0, color: { argb: i === 1 && p === 'urgent' ? C.bad : C.ink } }); c.alignment = align(i ? { horizontal: 'center' } : {});
    });
  }));
  r++;
  s.getRow(r).getCell(1).value = t('r_by_building'); s.getRow(r).getCell(1).font = font({ bold: true, size: 13 }); r++;
  head(s.getRow(r++), [t('col_building'), t('col_count'), t('r_done'), t('r_hold'), t('r_col_open'), t('x_avg_arr_min')]);
  M.blds.slice().sort((a, b) => b.n - a.n).forEach(x => {
    const row = s.getRow(r++);
    [x.name, x.n, x.done, x.hold, x.open, x.arr.length ? Math.round(x.arr.reduce((a, b) => a + b, 0) / x.arr.length / 60000) : null].forEach((v, i) => { const c = row.getCell(i + 1); c.value = v == null ? '—' : v; c.border = box; c.font = font({ bold: i === 0 }); c.alignment = align(i ? { horizontal: 'center' } : {}); });
  });
  r++;
  s.getRow(r).getCell(1).value = t('r_by_team'); s.getRow(r).getCell(1).font = font({ bold: true, size: 13 }); r++;
  [[t('r_hm_fixed'), M.team.hmFixed], [t('r_hm_handed'), M.team.hmHanded], [t('r_ops_direct'), M.team.opsDirect], [t('r_ops_fixed'), M.team.opsFixed]].forEach(([l, v]) => {
    const row = s.getRow(r++); row.getCell(1).value = l; row.getCell(2).value = v; [1, 2].forEach(i => { row.getCell(i).border = box; row.getCell(i).alignment = align(i === 2 ? { horizontal: 'center' } : {}); });
  });
  r++;
  s.mergeCells(`A${r}:F${r}`); s.getCell(`A${r}`).value = t('e_formula', { d: M.st.repeatDays || 30 }); s.getCell(`A${r}`).font = font({ size: 10, color: { argb: C.muted } }); s.getCell(`A${r}`).alignment = align(); s.getRow(r).height = 46;

  // every request, then the earlier ones still open, the parts, the paused ones and the counts
  requestsSheet(wb, M.shown.map(x => reqRow(x)), X);
  const carried = M.carried.filter(isOpen);
  if (carried.length && !S.rf.st) requestsSheet(wb, carried.map(x => reqRow(x)), X, t('r_carried').slice(0, 31));
  const p = wb.addWorksheet(t('x_parts_sheet'), { views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }] });
  p.columns = [{ width: 10 }, { width: 17 }, { width: 16 }, { width: 14 }, { width: 26 }, { width: 18 }, { width: 34 }, { width: 9 }];
  head(p.getRow(1), [t('col_no'), t('col_date'), t('col_building'), t('col_unit'), t('col_issue'), t('col_by'), t('col_part'), t('col_qty')]);
  let pr = 2;
  M.inP.filter(x => x.parts && x.parts.length).forEach(x => x.parts.forEach(pt => {
    const row = p.getRow(pr++), by = reqRow(x).by;
    [x.no, xlDate(x.finished_at || x.created_at), bName(x), uName(x), issueLabel(x.issue_type), by, pt.n, +pt.q].forEach((v, i) => { const c = row.getCell(i + 1); c.value = v; c.border = box; c.font = font({ size: 10 }); c.alignment = align(i === 6 || i === 4 ? {} : { horizontal: 'center' }); if (v instanceof Date) c.numFmt = 'yyyy-mm-dd hh:mm'; });
  }));
  const h = wb.addWorksheet(t('x_holds_sheet'), { views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }] });
  h.columns = [{ width: 10 }, { width: 16 }, { width: 14 }, { width: 26 }, { width: 20 }, { width: 17 }, { width: 12 }, { width: 15 }, { width: 32 }, { width: 32 }, { width: 18 }];
  head(h.getRow(1), [t('col_no'), t('col_building'), t('col_unit'), t('col_issue'), t('col_hold'), t('col_hold_since'), t('col_total'), t('col_eta'), t('col_parts_wait'), t('col_note'), t('col_tech')]);
  M.holds.forEach((x, i) => {
    const row = h.getRow(i + 2);
    [x.no, bName(x), uName(x), issueLabel(x.issue_type), holdLabel(x), xlDate(x.hold_at), minsOf(Date.now() - D(x.hold_at)), xlDate(x.hold_eta), x.hold_kind === 'parts' ? partsText(x.hold_parts) : '', x.hold_note || '', x.technician || ''].forEach((v, j) => { const c = row.getCell(j + 1); c.value = v == null ? null : v; c.border = box; c.font = font({ size: 10 }); c.alignment = align(j === 8 || j === 9 || j === 3 ? {} : { horizontal: 'center' }); if (v instanceof Date) c.numFmt = j === 7 ? 'yyyy-mm-dd' : 'yyyy-mm-dd hh:mm'; });
  });
  const cs = wb.addWorksheet(t('x_counts_sheet'), { views: [{ rightToLeft: rtl, state: 'frozen', ySplit: 1 }] });
  cs.columns = [{ width: 16 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }];
  head(cs.getRow(1), [t('col_period'), t('col_count'), t('col_urgent'), t('col_normal'), t('r_done'), t('r_cancel')]);
  M.trend.forEach((x, i) => { const row = cs.getRow(i + 2); [P.unit === 'month' ? ymLabel(x.d.slice(0, 7)) : x.d, x.n, x.urgent, x.n - x.urgent, x.done, x.cancelled].forEach((v, j) => { const c = row.getCell(j + 1); c.value = v; c.border = box; c.font = font({ size: 10, bold: x.d === P.cur }); c.alignment = align({ horizontal: 'center' }); }); });
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `rasd-${P.mode}-${P.key}.xlsx`);
}
function exportPeriodPdf() {
  const M = repModel(), P = M.P;
  const tr = cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`, th = cells => `<thead><tr>${cells.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
  const kp = (v, l, s2) => `<div class="rp-k"><b>${v}</b><span>${l}</span>${s2 ? `<small>${s2}</small>` : ''}</div>`;
  const stamp = fmt(new Date(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const d = M.curN - M.prevN;
  const html = `<div class="rp" dir="${LANG === 'ar' ? 'rtl' : 'ltr'}" lang="${LANG}">
    <header class="rp-h"><div class="rp-brand">${MARK}<div><b>${t('app')}</b><span>${esc(org() || t('tagline'))}</span></div></div>
      <div class="rp-t"><h1>${t('r_title')} · ${esc(P.label)}</h1><p>${esc([S.rf.b ? bLabel(S.rf.b) : t('b_all_buildings'), S.rf.p ? t('pr_' + S.rf.p) : '', S.rf.st ? t('r_s_' + S.rf.st) : ''].filter(Boolean).join(' · '))}</p><small>${esc(t('x_generated', { d: stamp }))}</small></div></header>
    <div class="rp-ks rp-ks5">${kp(M.inP.length, t('r_total'), (d > 0 ? '+' : '') + d + ' ' + esc(t('r_prev_' + P.unit)))}${kp(M.groups.done, t('r_done'))}${kp(M.groups.progress, t('r_progress'))}${kp(M.groups.hold, t('r_hold'))}${kp(M.groups.cancel, t('r_cancel'))}
      ${kp(M.carried.filter(isOpen).length, t('r_carried'))}${kp(pct(M.m.arrRate), t('r_arr_on'))}${kp(pct(M.m.fixRate), t('r_fix_on'))}${kp(M.firstLine == null ? '—' : pct(M.firstLine), t('r_first_line'))}${kp(M.m.dispN ? fDur(M.m.dispatch) : '—', t('e_avg_dispatch'), M.m.dispN ? t('e_dispatch_on') + ' ' + pct(M.m.dispRate) : '')}</div>
    <h2>${t('r_by_type')}</h2>
    <table class="rp-tb">${th([t('r_col_type'), t('col_priority'), t('col_count'), t('r_done'), t('r_col_open'), t('r_col_avg_fix')])}<tbody>
      ${['urgent', 'normal'].map(p => M.types.filter(x => x.p === p).sort((a, b) => b.n - a.n).map(x => tr([esc(issueLabel(x.k)), `<span class="${p === 'urgent' ? 'bad' : ''}">${t('pr_' + p)}</span>`, x.n, x.done, x.open, x.work.length ? fDur(x.work.reduce((a, b) => a + b, 0) / x.work.length) : '—'])).join('')).join('')}</tbody></table>
    <h2>${t('r_by_building')}</h2>
    <table class="rp-tb">${th([t('col_building'), t('col_count'), t('r_done'), t('r_hold'), t('r_col_open'), t('r_col_avg_arr')])}<tbody>
      ${M.blds.slice().sort((a, b) => b.n - a.n).map(x => tr([esc(x.name), x.n, x.done, x.hold, x.open, x.arr.length ? fDur(x.arr.reduce((a, b) => a + b, 0) / x.arr.length) : '—'])).join('')}</tbody></table>
    <div class="rp-flags"><span>${t('r_hm_fixed')}: <b>${M.team.hmFixed}</b></span><span>${t('r_hm_handed')}: <b>${M.team.hmHanded}</b></span><span>${t('r_ops_direct')}: <b>${M.team.opsDirect}</b></span><span>${t('r_ops_fixed')}: <b>${M.team.opsFixed}</b></span></div>
    ${M.holds.length ? `<h2>${t('r_holds')} (${M.holds.length})</h2><table class="rp-tb">${th([t('col_no'), t('col_unit'), t('col_hold'), t('col_hold_since'), t('col_eta'), t('col_parts_wait')])}<tbody>
      ${M.holds.map(x => tr(['#' + x.no, esc(uName(x) + ' · ' + bName(x)), esc(holdLabel(x)), fDur(Date.now() - D(x.hold_at)), x.hold_eta ? fmt(x.hold_eta, { day: 'numeric', month: 'short' }) : '—', esc(x.hold_kind === 'parts' ? partsText(x.hold_parts) : x.hold_note || '')])).join('')}</tbody></table>` : ''}
    <h2 class="rp-break">${t('r_list')} (${M.shown.length})</h2>
    <table class="rp-tb rp-all">${th([t('col_no'), t('col_time'), t('col_unit'), t('col_issue'), t('col_status'), t('col_by'), t('x_arr_vs'), t('x_work_vs'), t('col_report')])}<tbody>
      ${M.shown.map(x0 => { const x = reqRow(x0); return tr(['#' + x0.no, fmt(x0.created_at, P.mode === 'day' ? { hour: '2-digit', minute: '2-digit', hour12: false } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }), esc(uName(x0) + ' · ' + bName(x0)), esc(issueLabel(x0.issue_type)) + (x0.priority === 'urgent' ? ` <b class="bad">${t('pr_urgent')}</b>` : ''), esc(statusText(x0)), esc(x.by || '—'), x.arr == null ? '—' : `<span class="${x.arrOk === false ? 'bad' : ''}">${x.arr}</span> / ${x.arrT}`, x.work == null ? '—' : `<span class="${x.workOk === false ? 'bad' : ''}">${x.work}</span> / ${x.workT}`, esc([x0.tech_note || '', partsText(x0.parts)].filter(Boolean).join(' · '))]); }).join('')}</tbody></table>
    <p class="rp-note">${esc(t('e_formula', { d: M.st.repeatDays || 30 }))} ${esc(t('x_minutes_note'))}</p>
  </div>`;
  printHtml(html, `${t('app')} · ${t('r_title')} · ${P.label}`);
}
function printHtml(html, title) {
  let root = $('#print-root');
  if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
  root.innerHTML = html;
  document.body.classList.add('print-report');
  const old = document.title;
  document.title = title;
  const done = () => { document.title = old; document.body.classList.remove('print-report'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  toast(t('x_pdf_hint'));
  setTimeout(() => { try { window.print(); } catch (e) { done(); } }, 250);
}

/* ----- PowerPoint: native, editable slides with transitions and entrance animations */
function svgPng(svg, size) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(img, 0, 0, size, size); resolve(c.toDataURL('image/png')); };
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg class="mark"', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"`));
  });
}
function animXml(groups, dur) {
  let n = 3, at = 0;
  const bld = [];
  const steps = groups.map(g => {
    const stepId = ++n;
    const eff = g.map((sp, i) => {
      const a = ++n, b = ++n, c = ++n;
      bld.push(sp);
      return `<p:par><p:cTn id="${a}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="${i ? 'withEffect' : 'afterEffect'}"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:set><p:cBhvr><p:cTn id="${b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set><p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${c}" dur="${dur}"/><p:tgtEl><p:spTgt spid="${sp}"/></p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>`;
    }).join('');
    const xml = `<p:par><p:cTn id="${stepId}" fill="hold"><p:stCondLst><p:cond delay="${at}"/></p:stCondLst><p:childTnLst>${eff}</p:childTnLst></p:cTn></p:par>`;
    at += dur;
    return xml;
  }).join('');
  return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst><p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>${steps}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>${bld.map(sp => `<p:bldP spid="${sp}" grpId="0" animBg="1"/>`).join('')}</p:bldLst></p:timing>`;
}
async function exportPptx() {
  await Promise.all([loadScript(VENDOR.pptx), loadScript(VENDOR.jszip)]);
  const m = exportModel(), ev = m.ev, k = ev.all, rtl = LANG === 'ar';
  const P = new window.PptxGenJS();
  P.layout = 'LAYOUT_WIDE';
  P.title = `${t('e_title')} · ${m.month}`;
  P.author = t('app');
  P.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' };
  const W = 13.333, H = 7.5, M = 0.6;
  const C = { ink: '262521', ink2: '57534A', gold: '8B7E49', goldLight: 'D9CC9C', card: 'F4F2EC', bar: 'E9E5DA', muted: '8A8576', light: 'D8D3C6', white: 'FFFFFF', ok: '2E7D4F', warn: 'B7791F', bad: 'B3261E' };
  const X = (x, w) => (rtl ? W - x - w : x);
  const T = o => Object.assign({ fontFace: 'Arial', color: C.ink, rtlMode: rtl, lang: rtl ? 'ar-OM' : 'en-US', align: rtl ? 'right' : 'left', valign: 'top', margin: 0, isTextBox: true }, o);
  const RT = (runs, o) => { const opts = T(o); runs.forEach(x => { x.options = Object.assign({ rtlMode: rtl, align: opts.align, lang: opts.lang, fontFace: 'Arial' }, x.options); }); return [runs, opts]; };
  const scoreColor = s => (s == null ? C.muted : s >= 85 ? C.ok : s >= 70 ? C.warn : C.bad);
  const rateColor = v => (v == null ? C.ink : v >= 0.85 ? C.ok : v >= 0.7 ? C.warn : C.bad);
  const footer = `${t('app')} · ${t('e_title')} · ${m.month}`;
  P.defineSlideMaster({ title: 'DARK', background: { color: C.ink }, objects: [] });
  P.defineSlideMaster({
    title: 'LIGHT', background: { color: C.white },
    objects: [{ text: { text: footer, options: T({ x: X(M, 8), y: H - 0.55, w: 8, h: 0.3, fontSize: 10, color: C.muted }) } }],
    slideNumber: { x: rtl ? M : W - M - 0.5, y: H - 0.55, w: 0.5, h: 0.3, fontFace: 'Arial', fontSize: 10, color: C.muted, align: rtl ? 'left' : 'right' }
  });
  const title = (sl, text, sub) => {
    sl.addText(text, T({ x: M, y: 0.45, w: W - 2 * M, h: 0.75, fontSize: 32, bold: true }));
    if (sub) sl.addText(sub, T({ x: M, y: 1.2, w: W - 2 * M, h: 0.4, fontSize: 15, color: C.ink2 }));
  };
  const mark = await svgPng(MARK, 256);

  // 1. cover
  let sl = P.addSlide({ masterName: 'DARK' });
  if (mark) sl.addImage({ data: mark.replace(/^data:/, ''), x: X(M, 0.8), y: 0.6, w: 0.8, h: 0.8, altText: t('app') });
  sl.addText(t('p_eyebrow'), T({ x: X(M + 1.05, 6), y: 0.78, w: 6, h: 0.45, fontSize: 16, bold: true, color: C.goldLight }));
  sl.addText(m.cname ? t('p_title', { c: m.cname }) : t('p_title_plain'), T({ x: X(M, 7.4), y: 2.15, w: 7.4, h: 1.1, fontSize: 44, bold: true, color: C.white, objectName: 'g1-title' }));
  sl.addText(m.month, T({ x: X(M, 7.4), y: 3.3, w: 7.4, h: 0.7, fontSize: 30, bold: true, color: C.goldLight, objectName: 'g2-month' }));
  sl.addText([m.buildings, t('x_count', { n: k.n })].filter(Boolean).join(' · '), T({ x: X(M, 7.4), y: 4.1, w: 7.4, h: 0.5, fontSize: 16, color: C.light, objectName: 'g2-sub' }));
  if (org()) sl.addText(org(), T({ x: X(M, 7.4), y: H - 0.95, w: 7.4, h: 0.4, fontSize: 13, color: C.muted }));
  sl.addText(...RT([
    { text: k.score == null ? '—' : String(k.score), options: { fontSize: 80, bold: true, color: C.white, breakLine: true } },
    { text: t('of100'), options: { fontSize: 16, color: C.goldLight, breakLine: true } },
    { text: t('p_score'), options: { fontSize: 14, color: C.light } }
  ], { shape: P.ShapeType.ellipse, x: rtl ? M + 0.5 : W - M - 0.5 - 3.6, y: 1.85, w: 3.6, h: 3.6, align: 'center', valign: 'middle', fill: { color: C.ink }, line: { color: C.gold, width: 6 }, objectName: 'g3-score' }));

  // 2. month at a glance
  sl = P.addSlide({ masterName: 'LIGHT' });
  const wk = weakest(k);
  title(sl, t('p_s2', { m: m.month }), wk ? t('p_weak', { k: t(wk[0]), v: wk[2] }) : '');
  const top = 1.9, hh = 4.6;
  sl.addText(...RT([
    { text: t('e_score'), options: { fontSize: 16, bold: true, color: C.goldLight, breakLine: true } },
    { text: k.score == null ? '—' : String(k.score), options: { fontSize: 88, bold: true, color: C.white, breakLine: true } },
    { text: t('of100'), options: { fontSize: 15, color: C.light, breakLine: true } },
    { text: t('p_weights'), options: { fontSize: 11, color: C.light } }
  ], { shape: P.ShapeType.roundRect, rectRadius: 0.12, x: X(M, 3.3), y: top, w: 3.3, h: hh, fill: { color: C.ink }, align: 'center', valign: 'middle', margin: 0.2, objectName: 'g1-score' }));
  const gx = M + 3.3 + 0.35, gw = W - M - gx, cw = (gw - 2 * 0.3) / 3, ch = (hh - 0.3) / 2;
  const cards = [
    [String(k.n), t('e_requests'), t('e_closed_open', { c: k.closed, o: k.open }), C.ink],
    [pct(k.arrRate), t('e_arr_on'), k.arrN ? k.arrOn + ' / ' + k.arrN : '', rateColor(k.arrRate)],
    [pct(k.fixRate), t('e_fix_on'), k.fixN ? k.fixOn + ' / ' + k.fixN : '', rateColor(k.fixRate)],
    [k.rating == null ? '—' : k.rating.toFixed(1), t('e_rating'), k.ratedN ? t('e_rated', { n: k.ratedN }) : '', rateColor(k.rating == null ? null : k.rating / 5)],
    [fDur(k.arrive), t('e_avg_arrive'), t('x_avg_pickup_note', { v: fDur(k.pickup) }), C.ink],
    [fDur(k.work), t('e_avg_work'), '', C.ink]
  ];
  cards.forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    sl.addText(...RT([
      { text: c[0], options: { fontSize: 32, bold: true, color: c[3], breakLine: true } },
      { text: c[1], options: { fontSize: 15, bold: true, color: C.ink2, breakLine: true } },
      { text: c[2] || ' ', options: { fontSize: 11, color: C.muted } }
    ], { shape: P.ShapeType.roundRect, rectRadius: 0.1, x: X(gx + col * (cw + 0.3), cw), y: top + row * (ch + 0.3), w: cw, h: ch, fill: { color: C.card }, valign: 'middle', margin: 0.25, objectName: `g${2 + i}-kpi` }));
  });

  // 3. technician ranking
  sl = P.addSlide({ masterName: 'LIGHT' });
  const techs = ev.techs.slice(0, 8), best = techs[0], worst = techs[techs.length - 1];
  title(sl, t('p_s3'), techs.length > 1 ? t('p_best', { a: best.name, x: best.score == null ? '—' : best.score, b: worst.name, y: worst.score == null ? '—' : worst.score }) : '');
  const rh = Math.min(0.95, 4.7 / Math.max(1, techs.length)), y0 = 1.95, barX = M + 4.6, barW = 6.2;
  techs.forEach((x, i) => {
    const y = y0 + i * rh, g = `g${i + 1}`;
    sl.addText(String(i + 1), T({ shape: P.ShapeType.ellipse, x: X(M, 0.42), y: y + (rh - 0.42) / 2, w: 0.42, h: 0.42, fill: { color: C.gold }, color: C.white, fontSize: 13, bold: true, align: 'center', valign: 'middle', objectName: g + '-n' }));
    sl.addText(...RT([
      { text: x.name || '—', options: { fontSize: 15, bold: true, color: C.ink, breakLine: true } },
      { text: (x.team === 'hm' ? t('team_hm') : t('team_ops')) + ' · ' + t('p_jobs_line', { n: x.visits, a: pct(x.arrRate), f: pct(x.fixRate), r: x.rating == null ? '—' : x.rating.toFixed(1) }), options: { fontSize: 10, color: C.muted } }
    ], { x: X(M + 0.6, 3.85), y: y + 0.02, w: 3.85, h: rh - 0.04, valign: 'middle', objectName: g + '-name' }));
    const bh = Math.min(0.36, rh * 0.45), by = y + (rh - bh) / 2, fw = Math.max(0.08, barW * (x.score || 0) / 100);
    sl.addShape(P.ShapeType.roundRect, { x: X(barX, barW), y: by, w: barW, h: bh, rectRadius: bh / 2, fill: { color: C.bar }, line: { color: C.bar, width: 0 }, objectName: g + '-bg' });
    sl.addShape(P.ShapeType.roundRect, { x: X(barX, fw), y: by, w: fw, h: bh, rectRadius: bh / 2, fill: { color: scoreColor(x.score) }, line: { color: scoreColor(x.score), width: 0 }, objectName: g + '-bar' });
    sl.addText(x.score == null ? '—' : String(x.score), T({ x: X(barX + barW + 0.15, 0.8), y: y, w: 0.8, h: rh, fontSize: 20, bold: true, color: scoreColor(x.score), valign: 'middle', objectName: g + '-v' }));
  });

  // 4. urgent and normal
  sl = P.addSlide({ masterName: 'LIGHT' });
  title(sl, t('p_s4'), t('p_s4_sub'));
  const pw = (W - 2 * M - 0.4) / 2;
  ['urgent', 'normal'].forEach((p, i) => {
    const x = ev.pri[p], px = X(M + i * (pw + 0.4), pw), g = `g${i + 1}`;
    sl.addShape(P.ShapeType.roundRect, { x: px, y: 1.9, w: pw, h: 4.6, rectRadius: 0.1, fill: { color: C.card }, line: { color: C.card, width: 0 }, objectName: g + '-bg' });
    sl.addText(t('pr_' + p), T({ shape: P.ShapeType.roundRect, rectRadius: 0.2, x: rtl ? px + pw - 0.35 - 1.3 : px + 0.35, y: 2.15, w: 1.3, h: 0.42, fill: { color: p === 'urgent' ? C.bad : C.gold }, color: C.white, fontSize: 14, bold: true, align: 'center', valign: 'middle', objectName: g + '-pill' }));
    sl.addText(t('x_count', { n: x.n }), T({ x: px + 0.35, y: 2.75, w: pw - 0.7, h: 0.7, fontSize: 28, bold: true, objectName: g + '-n' }));
    const lines = [[t('e_arr_on'), pct(x.arrRate), rateColor(x.arrRate)], [t('e_fix_on'), pct(x.fixRate), rateColor(x.fixRate)], [t('e_avg_arrive'), fDur(x.arrive), C.ink], [t('e_avg_work'), fDur(x.work), C.ink], [t('e_rating'), x.rating == null ? '—' : x.rating.toFixed(1), C.ink]];
    lines.forEach((ln, j) => {
      const ly = 3.6 + j * 0.55;
      sl.addText(ln[0], T({ x: rtl ? px + pw / 2 : px + 0.35, y: ly, w: pw / 2 - 0.35, h: 0.45, fontSize: 14, color: C.ink2, valign: 'middle', objectName: `${g}-l${j}` }));
      sl.addText(ln[1], T({ x: rtl ? px + 0.35 : px + pw / 2, y: ly, w: pw / 2 - 0.35, h: 0.45, fontSize: 16, bold: true, color: ln[2], align: rtl ? 'left' : 'right', valign: 'middle', objectName: `${g}-v${j}` }));
    });
  });

  // 5. handymen and the operations room
  sl = P.addSlide({ masterName: 'LIGHT' });
  title(sl, t('p_s8'), t('p_s8_sub'));
  [['hm', t('e_hm_group')], ['ops', t('e_ops_group')]].forEach(([key, label], i) => {
    const x = ev.team[key], px = X(M + i * (pw + 0.4), pw), g = `g${i + 1}`;
    sl.addShape(P.ShapeType.roundRect, { x: px, y: 1.9, w: pw, h: 4.6, rectRadius: 0.1, fill: { color: C.card }, line: { color: C.card, width: 0 }, objectName: g + '-bg' });
    sl.addText(label, T({ x: px + 0.35, y: 2.1, w: pw - 0.7, h: 0.5, fontSize: 18, bold: true, color: C.gold, objectName: g + '-pill' }));
    sl.addText(t('p_team_line', { n: x.visits, a: pct(x.arrRate), f: pct(x.fixRate) }), T({ x: px + 0.35, y: 2.65, w: pw - 0.7, h: 0.5, fontSize: 14, color: C.ink2, objectName: g + '-n' }));
    const lines = [[t('e_avg_arrive'), fDur(x.arrive), C.ink], [t('e_avg_work'), fDur(x.work), C.ink], [t('e_rating'), x.rating == null ? '—' : x.rating.toFixed(1), C.ink], [t('e_paused'), fDur(x.paused), C.ink2]];
    if (key === 'hm') lines.push([t('r_hm_handed'), String(x.handed), C.ink2]);
    lines.forEach((ln, j) => {
      const ly = 3.35 + j * 0.55;
      sl.addText(ln[0], T({ x: rtl ? px + pw / 2 : px + 0.35, y: ly, w: pw / 2 - 0.35, h: 0.45, fontSize: 14, color: C.ink2, valign: 'middle', objectName: `${g}-l${j}` }));
      sl.addText(ln[1], T({ x: rtl ? px + 0.35 : px + pw / 2, y: ly, w: pw / 2 - 0.35, h: 0.45, fontSize: 16, bold: true, color: ln[2], align: rtl ? 'left' : 'right', valign: 'middle', objectName: `${g}-v${j}` }));
    });
  });

  // 6. late requests
  sl = P.addSlide({ masterName: 'LIGHT' });
  title(sl, t('e_late_list'), m.late.length ? t('p_s5_sub', { n: m.late.length }) : '');
  if (m.late.length) {
    const hdr = [t('col_no'), t('col_date'), t('col_unit'), t('col_tech'), t('x_arr_vs'), t('x_work_vs')];
    const cell = (text, o) => ({ text: String(text), options: Object.assign({ fontFace: 'Arial', fontSize: 12, color: C.ink, align: rtl ? 'right' : 'left', valign: 'middle', rtlMode: rtl }, o || {}) });
    const vs = (v, tg, ok) => (v == null ? '—' : `${v} / ${tg}`);
    let rows = [hdr.map(h => cell(h, { bold: true, color: C.white, fill: { color: C.gold } }))];
    m.late.slice(0, 8).forEach((x, i) => {
      const bg = i % 2 ? { fill: { color: C.card } } : { fill: { color: C.white } };
      rows.push([cell('#' + x.r.no, bg), cell(fmt(x.r.created_at, { day: 'numeric', month: 'short' }), bg), cell(uName(x.r), bg), cell(x.name || '—', bg),
        cell(vs(x.arr, x.arrT), Object.assign({ bold: x.arrOk === false, color: x.arrOk === false ? C.bad : C.ink }, bg)),
        cell(vs(x.work, x.workT), Object.assign({ bold: x.workOk === false, color: x.workOk === false ? C.bad : C.ink }, bg))]);
    });
    if (rtl) rows = rows.map(rw => rw.slice().reverse());
    const cws = [1.2, 1.6, 2.0, 2.6, 2.3, 2.43];
    sl.addTable(rows, { x: M, y: 1.9, w: W - 2 * M, colW: rtl ? cws.slice().reverse() : cws, rowH: 0.42, border: { type: 'solid', pt: 0.75, color: 'E3DBC9' }, fontFace: 'Arial', autoPage: false });
    if (m.late.length > 8) sl.addText(t('p_more', { n: m.late.length - 8 }), T({ x: M, y: 1.95 + 0.42 * 9 + 0.15, w: W - 2 * M, h: 0.35, fontSize: 12, color: C.muted }));
  } else {
    sl.addText(t('p_none_late'), T({ shape: P.ShapeType.roundRect, rectRadius: 0.1, x: M, y: 2.4, w: W - 2 * M, h: 1.4, fill: { color: 'E3F1E8' }, color: C.ok, fontSize: 22, bold: true, align: 'center', valign: 'middle', objectName: 'g1-ok' }));
  }

  // 7. points to follow up
  sl = P.addSlide({ masterName: 'LIGHT' });
  title(sl, t('p_s6'), t('p_s6_sub'));
  const fl = [[k.manualArr, t('x_f_manual'), t('x_f_manual_d'), C.bad], [k.onsite, t('x_f_onsite'), t('x_f_onsite_d'), C.warn], [k.manualClose, t('x_f_close'), t('x_f_close_d'), C.warn], [k.repeats, t('x_f_repeat'), t('x_f_repeat_d', { d: m.st.repeatDays || 30 }), C.bad]];
  const fw2 = (W - 2 * M - 0.3) / 2, fh = 1.85;
  fl.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    sl.addText(...RT([
      { text: String(f[0]), options: { fontSize: 36, bold: true, color: f[0] ? f[3] : C.ok, breakLine: true } },
      { text: f[1], options: { fontSize: 16, bold: true, color: C.ink, breakLine: true } },
      { text: f[2], options: { fontSize: 12, color: C.muted } }
    ], { shape: P.ShapeType.roundRect, rectRadius: 0.1, x: X(M + col * (fw2 + 0.3), fw2), y: 1.9 + row * (fh + 0.3), w: fw2, h: fh, fill: { color: C.card }, valign: 'middle', margin: 0.3, objectName: `g${i + 1}-f` }));
  });
  sl.addText(t('e_formula', { d: m.st.repeatDays || 30 }), T({ x: M, y: 6.15, w: W - 2 * M, h: 0.55, fontSize: 11, color: C.muted, valign: 'middle' }));

  // 8. where the numbers come from
  sl = P.addSlide({ masterName: 'DARK' });
  sl.addText(t('p_s7'), T({ x: M, y: 0.6, w: W - 2 * M, h: 0.8, fontSize: 32, bold: true, color: C.white }));
  const sw = (W - 2 * M - 3 * 0.35) / 4;
  ['dm_s1', 'dm_s2', 'dm_s3', 'dm_s4'].forEach((key, i) => {
    const sx = X(M + i * (sw + 0.35), sw), g = `g${i + 1}`;
    sl.addText(String(i + 1), T({ shape: P.ShapeType.ellipse, x: rtl ? sx + sw - 0.7 : sx, y: 2.0, w: 0.7, h: 0.7, fill: { color: C.gold }, color: C.white, fontSize: 20, bold: true, align: 'center', valign: 'middle', objectName: g + '-n' }));
    sl.addText(t(key), T({ x: sx, y: 2.95, w: sw, h: 1.6, fontSize: 16, color: C.white, objectName: g + '-t' }));
  });
  sl.addText(t('p_s7_note'), T({ x: M, y: 4.75, w: W - 2 * M, h: 0.9, fontSize: 18, bold: true, color: C.goldLight, valign: 'middle', objectName: 'g5-note' }));

  // write, then add transitions and entrance animations
  const data = await P.write({ outputType: 'arraybuffer' });
  const zip = await window.JSZip.loadAsync(data);
  const slides = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  for (const f of slides) {
    const no = +f.match(/slide(\d+)\.xml$/)[1];
    let xml = await zip.file(f).async('string');
    const groups = {};
    xml.replace(/<p:cNvPr id="(\d+)" name="g(\d+)-[^"]*"/g, (s0, id, g) => { (groups[g] = groups[g] || []).push(id); return s0; });
    const order = Object.keys(groups).map(Number).sort((a, b) => a - b).map(g => groups[g]);
    const trans = no === 1 || no === slides.length ? '<p:transition spd="slow"><p:fade/></p:transition>' : '<p:transition spd="med"><p:push dir="' + (rtl ? 'r' : 'l') + '"/></p:transition>';
    const extra = trans + (order.length ? animXml(order, 400) : '');
    xml = xml.indexOf('</p:clrMapOvr>') > -1 ? xml.replace('</p:clrMapOvr>', '</p:clrMapOvr>' + extra) : xml.replace('</p:sld>', extra + '</p:sld>');
    zip.file(f, xml);
  }
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  saveBlob(blob, `rasd-${m.ym}.pptx`);
}
async function runExport(el, fn) {
  await busy(el, async () => {
    try { await fn(); } catch (e) { if (e && /^(network|generic)$/.test(e.message)) throw e; console.error(e); throw new Error('generic'); }
  });
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
  'accept-busy': el => busy(el, async () => { await loadList(true); busyModal('accept'); }),
  'pause-busy': el => busy(el, async () => { await loadList(true); busyModal('pause'); }),
  'pause-access': () => holdModal('access'),
  'hold-parts': () => holdModal('parts'),
  'hold-other': () => holdModal('other'),
  escalate: () => escalateModal(),
  'go-now': el => busy(el, async () => { await srpc('tech_resume', { p_id: S.req.id }); toast(t('d_go_ok')); S.list = null; render(); }),
  'resume-scan': () => openScanner(async token => {
    await srpc('tech_resume', { p_id: S.req.id, p_unit_token: token });
    toast(t('d_resumed_ok')); S.list = null; render();
  }, S.req && S.req._token),
  'unit-resume': el => busy(el, async () => {
    await rpc('tech_resume', { p_token: S.session.token, p_id: el.dataset.id, p_unit_token: S.unit.token });
    toast(t('d_resumed_ok')); S.list = null; go('/r/' + el.dataset.id);
  }),
  'part-add': el => { const box = $('#' + el.dataset.to); box.insertAdjacentHTML('beforeend', partRow({ n: '', q: 1 })); const rows = $$('.part-row', box); $('input', rows[rows.length - 1]).focus(); },
  'part-del': el => el.closest('.part-row').remove(),
  dispatch: el => busy(el, async () => {
    const [r, team] = await Promise.all([srpc('staff_request', { p_id: el.dataset.id }), S.team ? Promise.resolve(S.team) : srpc('team_list'), loadList()]);
    S.team = team; dispatchModal(r);
  }),
  move: el => busy(el, async () => {
    const [team] = await Promise.all([S.team ? Promise.resolve(S.team) : srpc('team_list'), loadList(true)]);
    S.team = team; dispatchModal(S.req);
  }),
  decline: () => reasonModal(t('d_decline_title'), async note => {
    await srpc('tech_decline', { p_id: S.req.id, p_note: note }); toast(t('d_declined_ok')); S.list = null; go('/jobs');
  }, true, { body: t('d_decline_body'), ph: t('d_decline_ph'), submit: t('d_decline_submit') }),
  src: el => { $$('[data-act="src"]', el.parentElement).forEach(b => b.classList.toggle('on', b === el)); if (S.draft.desk) S.draft.desk.src = el.dataset.v; },
  'modal-close-go': el => { closeModal(el.closest('.modal')); go(el.getAttribute('href').slice(1)); },
  'r-excel': el => runExport(el, exportPeriodExcel),
  'r-pdf': el => runExport(el, async () => exportPeriodPdf()),
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
  btab: el => { S.boardTab = el.dataset.v; $('#btabs').innerHTML = boardTabs(); refreshBoard(); },
  csv: () => {
    const f = evalCsv();
    if (EMB) { copyText(f.text, t('e_copied')); return; }
    const blob = new Blob([String.fromCharCode(0xFEFF) + f.text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  },
  'push-on': el => busy(el, async () => {
    const n = await enablePush();
    toast(n ? t('pu_done') : t('pu_test_none'));
    fillPushSlot(); fillPushAdmin();
  }),
  'push-test': el => busy(el, async () => { const n = await srpc('push_test'); toast(n ? t('pu_test_ok', { n }) : t('pu_test_none'), n ? '' : 'err'); }),
  'push-setup': el => busy(el, async () => {
    const k = await makeVapid();
    await srpc('admin_set_push', { p_public: k.publicKey, p_private: k.privateKey, p_subject: APP_URL, p_fn_url: String(CFG.supabaseUrl).replace(/\/+$/, '') + '/functions/v1/rasd-notify' });
    toast(t('pu_sys_ok'));
    await fillPushAdmin();
  }),
  'x-excel': el => runExport(el, exportExcel),
  'x-pdf': el => runExport(el, async () => exportPdf()),
  'x-pptx': el => runExport(el, exportPptx),
  'staff-edit': el => staffModal((S.team || []).find(s => s.id === el.dataset.id) || null),
  'staff-del': el => {
    const s = (S.team || []).find(x => x.id === el.dataset.id); if (!s) return;
    closeModal(el.closest('.modal'));
    const m = modal(`<div><h3>${esc(t('tm_delete_q', { n: s.name }))}</h3><p class="muted small">${t('tm_delete_body')}</p></div>
      <div class="row end"><button type="button" class="btn ghost" data-act="modal-close">${t('cancel')}</button><button type="button" class="btn danger solid" data-act="staff-del-go" data-id="${esc(s.id)}">${ICON.trash}${t('tm_delete_btn')}</button></div>`);
    m.dataset.name = s.name;
  },
  'staff-del-go': el => busy(el, async () => {
    const m = el.closest('.modal'), name = m ? m.dataset.name : '';
    await srpc('admin_remove_staff', { p_id: el.dataset.id });
    closeModal(m); toast(t('tm_deleted', { n: name })); render();
  }),
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
  guide: el => { if (el.dataset.role) setSession(Demo.loginAs(el.dataset.role)); S.list = null; S.team = null; go(el.dataset.to); },
  'dm-unit': () => { const v = $('#dm-unit').value; S.unit = null; go('/u/' + encodeURIComponent(v)); },
  'dm-login': el => { setSession(Demo.loginAs(el.dataset.id)); S.team = null; go('/'); },
  'dm-reset': () => { S.session = null; store.del(P + 'session'); store.del(P + 'mine'); store.del(P + 'contact'); Demo.reset(); S.list = null; S.settings = null; S.photos = {}; S.draft = {}; S.unit = null; S.rf = { b: '', st: '', p: '' }; S.uf = { b: '', k: '' }; S.bf = ''; toast(t('dm_reset_ok')); render(); },
  go: el => go(el.dataset.to),
  'uf-type': el => { S.uf.k = S.uf.k === el.dataset.v ? '' : el.dataset.v; const box = $('#rep'); if (box && S.unitData) { box.innerHTML = unitsBody(); heatToNow(); const tb = $('.heat'); if (tb) tb.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
  'u-excel': el => runExport(el, exportUnitsExcel),
  'u-pdf': el => runExport(el, async () => exportUnitsPdf()),
  'uh-excel': el => runExport(el, exportUnitExcel)
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
    const key = 'after:' + S.req.id, photo = S.photos[key], note = f.querySelector('[name="note"]').value.trim();
    let ok = true;
    if (!photo) ok = setErr(f, 'photo', t('d_need_after'));
    if (note.length < 5) ok = setErr(f, 'note', t('err_report_required'));
    if (!ok) return firstErr(f);
    await busy(f.querySelector('[type="submit"]'), async () => {
      await srpc('tech_finish', { p_id: S.req.id, p_photo: photo, p_note: note, p_parts: readParts(f) });
      delete S.photos[key]; toast(t('d_finished_ok')); S.list = null; render();
    });
  },
  busy: async f => {
    clearErrs(f);
    const mode = f.querySelector('[name="mode"]').value, ref = (f.querySelector('input[name="ref"]:checked') || {}).value || '', note = f.querySelector('[name="note"]').value.trim();
    if (!ref && note.length < 3) return setErr(f, 'note', t('d_reason_need'));
    await busy(f.querySelector('[type="submit"]'), async () => {
      if (mode === 'accept') await srpc('tech_accept', ref ? { p_id: S.req.id, p_busy: ref } : { p_id: S.req.id, p_note: note });
      else await srpc('tech_hold', ref ? { p_id: S.req.id, p_kind: 'busy', p_ref: ref } : { p_id: S.req.id, p_kind: 'busy', p_note: note });
      closeModal(f.closest('.modal')); toast(mode === 'accept' ? t('d_accept_ok').split('.')[0] + '.' : t('d_paused_ok')); S.list = null; render();
    });
  },
  hold: async f => {
    clearErrs(f);
    const kind = f.querySelector('[name="kind"]').value, note = f.querySelector('[name="note"]').value.trim(), eta = muscatIso(f.querySelector('[name="eta"]').value);
    const parts = kind === 'parts' ? readParts(f) : null;
    if (kind === 'parts' && !parts.length) return setErr(f, 'parts', t('d_need_parts'));
    if (kind !== 'parts' && note.length < 3) return setErr(f, 'note', t('d_reason_need'));
    await busy(f.querySelector('[type="submit"]'), async () => {
      await srpc('tech_hold', { p_id: S.req.id, p_kind: kind, p_note: note || null, p_eta: eta, p_parts: parts });
      closeModal(f.closest('.modal')); toast(t('d_paused_ok')); S.list = null; render();
    });
  },
  escalate: async f => {
    clearErrs(f);
    const note = f.querySelector('[name="note"]').value.trim();
    if (note.length < 3) return setErr(f, 'note', t('d_reason_need'));
    await busy(f.querySelector('[type="submit"]'), async () => {
      await srpc('tech_escalate', { p_id: S.req.id, p_note: note });
      closeModal(f.closest('.modal')); toast(t('d_escalated_ok')); S.list = null; go(isMgr() ? '/r/' + S.req.id : '/jobs');
    });
  },
  'resume-manual': async f => {
    clearErrs(f);
    const note = f.querySelector('[name="note"]').value.trim();
    if (note.length < 3) return setErr(f, 'note', t('d_reason_need'));
    await busy(f.querySelector('[type="submit"]'), async () => { await srpc('tech_resume', { p_id: S.req.id, p_note: note }); toast(t('d_resumed_ok')); S.list = null; render(); });
  },
  'desk-req': async f => {
    clearErrs(f);
    const d = S.draft.desk || {}, v = n => (f.querySelector(`[name="${n}"]`) || {}).value || '';
    const issue = (f.querySelector('input[name="issue"]:checked') || {}).value, desc = v('desc').trim(), unit = v('u');
    let ok = true;
    if (!unit) ok = setErr(f, 'u', t('err_invalid_unit'));
    if (!issue) ok = setErr(f, 'issue', t('t_need_issue'));
    if (desc.length < 3) ok = setErr(f, 'desc', t('t_need_desc'));
    if (!ok) return firstErr(f);
    await busy(f.querySelector('[type="submit"]'), async () => {
      const phone = v('cphone').trim();
      const res = await srpc('mgr_create_request', { p_unit: unit, p_issue: issue, p_description: desc, p_photo: S.photos['before:desk'] || null, p_name: v('cname').trim() || null, p_phone: phone || null, p_source: d.src || 'phone', p_lang: LANG, p_staff: v('staff') || null, p_assign_note: v('anote').trim() || null });
      delete S.draft.desk; delete S.photos['before:desk']; S.list = null;
      if (DEMO) addMine({ id: res.id, code: res.code, no: res.no, token: null, at: new Date().toISOString() });
      go('/board'); setTimeout(() => deskDone(res, phone), 350);
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
  dispatch: async f => {
    clearErrs(f);
    const staff = (f.querySelector('input[name="staff"]:checked') || {}).value, note = f.querySelector('[name="note"]').value.trim();
    if (!staff) return setErr(f, 'staff', t('d_pick_tech'));
    await busy(f.querySelector('[type="submit"]'), async () => {
      await srpc('mgr_assign', { p_id: f.dataset.id, p_staff: staff, p_note: note || null });
      const m = f.closest('.modal'); if (m) closeModal(m);
      toast(t('d_assigned_ok')); S.list = null; render();
    });
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
    const kind = v('kind'), role = kind === 'hm' || kind === 'ops' ? 'technician' : kind, sites = $$('input[name="site"]:checked', f).map(x => x.value);
    if (kind === 'hm' && !sites.length) return setErr(f, 'form', t('err_sites_required'));
    await busy(f.querySelector('[type="submit"]'), async () => {
      await srpc('admin_save_staff', { p_id: id, p_name: name, p_phone: v('phone'), p_role: role, p_active: id ? v('active') : true, p_pin: pin || null, p_team: kind === 'hm' ? 'hm' : 'ops', p_sites: kind === 'hm' ? sites : [] });
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
    ['urgent', 'normal'].forEach(p => { const dflt = (DEFAULTS.targets || {})[p] || {}; st.targets[p] = { dispatch: num(`tg_${p}_dispatch`, dflt.dispatch), pickup: num(`tg_${p}_pickup`, dflt.pickup), arrive: num(`tg_${p}_arrive`, dflt.arrive), work: num(`tg_${p}_work`, dflt.work) }; });
    st.v = 3;
    st.buildings = st.buildings || {};
    $$('.bld[data-code]', f).forEach(el => {
      const code = el.dataset.code, prev = st.buildings[code] || {}, u = (S.unitsForSettings || []).find(x => x.building_code === code) || {};
      const lat = parseFloat(v(`b_${code}_lat`)), lng = parseFloat(v(`b_${code}_lng`));
      const b = Object.assign({}, prev, { ar: prev.ar || u.building_ar || code, en: prev.en || u.building_en || code, type: v(`b_${code}_type`) === 'com' ? 'com' : 'res', ops: num(`b_${code}_ops`, prev.ops || 60), sort: prev.sort || 50, lat: isNaN(lat) ? null : lat, lng: isNaN(lng) ? null : lng });
      delete b.arrive;
      st.buildings[code] = b;
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
  if (EMB && a) { e.preventDefault(); const md = a.closest('.modal'); if (md) closeModal(md); S.route = a.getAttribute('href'); render(); return; }
  if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); S.list = null; render(); return; }
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
  if (el.matches('#b-bld')) { S.bf = el.value; refreshBoard(); }
  if (el.matches('#nr-b')) { if (S.draft.desk) { S.draft.desk.b = el.value; S.draft.desk.u = ''; } $('#nr-u').innerHTML = unitOptions(el.value, ''); }
  if (el.matches('#nr-u') && S.draft.desk) S.draft.desk.u = el.value;
  if (el.matches('#nr-s') && S.draft.desk) S.draft.desk.staff = el.value;
  if (el.matches('form[data-form="desk-req"] input[name="issue"]') && S.draft.desk) S.draft.desk.issue = el.value;
  if (el.matches('[data-uf]')) { S.uf[el.dataset.uf] = el.value; const box = $('#rep'); if (box && S.unitData) { box.innerHTML = unitsBody(); heatToNow(); } }
  if (el.matches('[data-rf]')) {
    S.rf[el.dataset.rf] = el.value;
    if (el.dataset.rf === 'b') render(); else { const box = $('#rep'); if (box && S.repData) box.innerHTML = reportBody(); }
  }
  if (el.matches('form[data-form="busy"] input[name="ref"]')) { const ow = $('.other-work', el.closest('form')); if (ow) { ow.hidden = !!el.value; if (!el.value) $('textarea', ow).focus(); } }
  if (el.matches('#st-r')) { const fs = $('.sites', el.closest('form')); if (fs) fs.hidden = el.value !== 'hm'; }
}
function onInput(e) {
  const el = e.target;
  if (el.dataset.input === 'q') { S.q = el.value; const b = $('#blist'); if (b) { b.innerHTML = boardList(S.list || []); tick(); } return; }
  const fd = el.closest('form[data-form="desk-req"]');
  if (fd && S.draft.desk && ['desc', 'cname', 'cphone', 'anote'].includes(el.name)) { S.draft.desk[el.name] = el.value; return; }
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
  const LIGHT = ['id', 'no', 'unit_id', 'building_code', 'building_ar', 'building_en', 'unit_ar', 'unit_en', 'unit_kind', 'issue_type', 'priority', 'target_pickup', 'target_arrive', 'target_work', 'description', 'lang', 'contact_name', 'contact_phone', 'status', 'created_at', 'technician_id', 'accepted_at', 'accept_method', 'arrived_at', 'arrival_method', 'finished_at', 'signed_at', 'signoff_method', 'rating', 'closed_at', 'close_method', 'cancelled_at', 'source', 'stage', 'offered_at', 'origin', 'hold_kind', 'hold_at', 'hold_ref', 'hold_eta', 'paused_arrive', 'paused_work', 'legs', 'queued_at', 'target_dispatch', 'assigned_by', 'assign_note'];
  const FULL = LIGHT.concat(['tech_note', 'parts', 'signer_name', 'rating_comment', 'close_note', 'cancel_note', 'hold_note', 'hold_parts']);
  const TIMES = ['created_at', 'queued_at', 'offered_at', 'accepted_at', 'arrived_at', 'finished_at', 'signed_at', 'closed_at', 'cancelled_at', 'hold_at', 'hold_eta'];
  function load() {
    if (!db) {
      db = store.get(KEY, null);
      if (!db || db.v !== 6 || !db.units || !db.units.length) { db = seed(); save(); }
      else if (Date.now() - (db.at || 0) > 3600e3) { shift(Date.now() - (db.at || Date.now())); save(); }
    }
    return db;
  }
  function shift(delta) {
    const add = x => (x ? new Date(D(x).getTime() + delta).toISOString() : x);
    db.requests.forEach(r => { TIMES.forEach(k => { r[k] = add(r[k]); }); (r.legs || []).forEach(l => ['queued_at', 'offered_at', 'accepted_at', 'arrived_at', 'ended_at'].forEach(k => { l[k] = add(l[k]); })); });
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
  const meOf = s => ({ id: s.id, name: s.full_name, role: s.role, phone: s.phone, team: s.team || 'ops', sites: s.sites || [] });
  function session(s) { const tok = uid() + uid(); db.sessions[tok] = s.id; return { token: tok, me: meOf(s) }; }
  function ev(rid, actor, e, note) { db.events.push({ id: ++db.seq.ev, request_id: rid, at: now(), actor: actor || null, ev: e, note: note ? String(note).trim().slice(0, 500) || null : null }); }
  const bset = code => ((db.settings.buildings || {})[code]) || {};
  function targets(p) { const tg = (db.settings.targets || {})[p] || {}; return [tg.pickup || (p === 'urgent' ? 10 : 30), tg.work || (p === 'urgent' ? 120 : 240), tg.dispatch || (p === 'urgent' ? 10 : 30)]; }
  function arriveTarget(code, p, team, origin) {
    if ((origin && origin === code) || (team === 'hm' && !origin)) return ((db.settings.targets || {})[p] || {}).arrive || (p === 'urgent' ? 15 : 60);
    return Math.max(+bset(code).ops || 60, origin ? +bset(origin).ops || 0 : 0);
  }
  const stageFor = code => ((bset(code).type || 'res') === 'res' && db.staff.some(s => s.active && s.role === 'technician' && s.team === 'hm' && (s.sites || []).includes(code)) ? 'hm' : 'ops');
  const sees = (me, r) => me.role !== 'technician' || r.technician_id === me.id || (r.legs || []).some(l => l.staff_id === me.id);
  function where(staffId) {
    const on = db.requests.filter(r => r.technician_id === staffId && r.status === 'onsite' && !r.hold_kind).sort((a, b) => D(b.arrived_at) - D(a.arrived_at))[0];
    if (on) return on.building_code;
    const fin = db.requests.filter(r => r.technician_id === staffId && r.finished_at && Date.now() - D(r.finished_at) < 90 * 60000).sort((a, b) => D(b.finished_at) - D(a.finished_at))[0];
    return fin ? fin.building_code : null;
  }
  function originOf(staffId, code) {
    const s = db.staff.find(x => x.id === staffId) || {}, sites = s.sites || [];
    return where(staffId) || (s.team === 'hm' && sites.length ? (sites.includes(code) ? code : sites[0]) : null);
  }
  const secsSince = x => Math.max(0, Math.floor((Date.now() - D(x)) / 1000));
  function cleanParts(p) {
    return (Array.isArray(p) ? p : []).slice(0, 30).filter(e => e && typeof e === 'object' && String(e.n || '').trim())
      .map(e => ({ n: String(e.n).trim().slice(0, 80), q: /^[0-9]{1,4}([.][0-9]{1,2})?$/.test(String(e.q == null ? '' : e.q)) && +e.q > 0 ? +e.q : 1 }));
  }
  const partsTxt = p => (p || []).map(x => x.n + (+x.q !== 1 ? ' ×' + x.q : '')).join(', ');
  function leg(r, outcome, note) {
    const held = r.hold_kind ? secsSince(r.hold_at) : 0;
    return { staff_id: r.technician_id, name: name(r.technician_id), team: r.stage, queued_at: r.queued_at || null, target_dispatch: r.target_dispatch || null, assigned_by: r.assigned_by || null, assigned_by_name: name(r.assigned_by), assign_note: r.assign_note || null, offered_at: r.offered_at || r.created_at, accepted_at: r.accepted_at, accept_method: r.accept_method, arrived_at: r.arrived_at, arrival_method: r.arrival_method, ended_at: now(), outcome, note: note || null, target_pickup: r.target_pickup, target_arrive: r.target_arrive, target_work: r.target_work, origin: r.origin || null, paused_arrive: (r.paused_arrive || 0) + (r.arrived_at ? 0 : held), paused_work: (r.paused_work || 0) + (r.arrived_at ? held : 0) };
  }
  const clearHold = r => Object.assign(r, { hold_kind: null, hold_at: null, hold_note: null, hold_ref: null, hold_eta: null });
  // end the current visit: back to the supervisor's list (queue) or straight to someone else (offer)
  function endVisit(r, outcome, note, queue, stage) {
    if (r.technician_id) r.legs = (r.legs || []).concat([leg(r, outcome, note)]);
    const st2 = stage || r.stage;
    Object.assign(r, { status: 'new', stage: st2, technician_id: null, queued_at: queue ? now() : null, offered_at: null, assigned_by: null, assign_note: null, accepted_at: null, accept_method: null, arrived_at: null, arrival_method: null, arrival_note: null, arrival_lat: null, arrival_lng: null, arrival_acc: null, origin: null, target_arrive: arriveTarget(r.building_code, r.priority, st2, null), paused_arrive: 0, paused_work: 0, escalated_at: null });
    clearHold(r);
  }
  function offer(r, staffId, by, note) {
    const s = db.staff.find(x => x.id === staffId), stage = s.team === 'hm' ? 'hm' : 'ops', origin = originOf(staffId, r.building_code);
    Object.assign(r, { status: 'assigned', technician_id: staffId, stage, offered_at: now(), assigned_by: by, assign_note: String(note || '').trim().slice(0, 300) || null, origin, target_arrive: arriveTarget(r.building_code, r.priority, stage, origin), escalated_at: null });
  }
  function release(ref, code) {
    const b = find(ref);
    db.requests.filter(q => q.hold_ref === ref && q.hold_kind === 'busy' && q.status === 'accepted').forEach(q => {
      q.paused_arrive = (q.paused_arrive || 0) + secsSince(q.hold_at);
      q.origin = code; q.target_arrive = arriveTarget(q.building_code, q.priority, q.stage, code);
      clearHold(q); ev(q.id, null, 'resumed_auto', '#' + (b ? b.no : ''));
    });
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
  const pick = (r, keys) => { const o = {}; keys.forEach(k => (o[k] = r[k] == null ? null : r[k])); return o; };
  function insertRequest(u, it, a, source, by) {
    const tg = targets(it.p), stage = stageFor(u.building_code), at = now();
    const r = { id: uid(), no: ++db.seq.no, unit_id: u.id, building_code: u.building_code, building_ar: u.building_ar, building_en: u.building_en, unit_ar: u.label_ar, unit_en: u.label_en, unit_kind: u.kind, issue_type: it.k, priority: it.p, target_pickup: tg[0], target_arrive: arriveTarget(u.building_code, it.p, stage, null), target_work: tg[1], target_dispatch: tg[2], description: String(a.p_description).trim().slice(0, 2000), photo_before: a.p_photo || null, lang: a.p_lang === 'en' ? 'en' : 'ar', contact_name: (a.p_name || '').trim() || null, contact_phone: (a.p_phone || '').trim() || null, tracking_code: uid() + uid(), status: 'new', created_at: at, queued_at: at, offered_at: null, source, created_by: by || null, stage, paused_arrive: 0, paused_work: 0, parts: [], legs: [] };
    db.requests.push(r); ev(r.id, by || null, by ? 'logged' : 'submitted', by ? source : null);
    return { id: r.id, no: r.no, code: r.tracking_code, created_at: r.created_at, stage: r.stage };
  }
  const techOf = id => db.staff.find(x => x.id === id && x.active && x.role === 'technician');
  const issueOf = k => db.settings.issueTypes.find(i => i.k === k);
  const H = {
    get_settings: () => db.settings,
    unit_info: a => { const u = db.units.find(x => x.token === a.p_token && x.active); return u ? { id: u.id, building_code: u.building_code, building_ar: u.building_ar, building_en: u.building_en, label_ar: u.label_ar, label_en: u.label_en, kind: u.kind, issues: db.settings.issueTypes } : null; },
    submit_request: a => {
      const u = db.units.find(x => x.token === a.p_token && x.active); if (!u) fail('invalid_unit');
      const it = issueOf(a.p_issue); if (!it) fail('issue_required');
      if (!a.p_description || a.p_description.trim().length < 3) fail('description_required');
      if (!isImg(a.p_photo)) fail('photo_required');
      if (db.requests.filter(r => r.unit_id === u.id && Date.now() - D(r.created_at) < 600000).length >= 3) fail('slow_down');
      return insertRequest(u, it, a, 'qr', null);
    },
    mgr_create_request: a => {
      const me = auth(a.p_token, ['supervisor', 'admin']);
      const u = db.units.find(x => x.id === a.p_unit && x.active); if (!u) fail('invalid_unit');
      const it = issueOf(a.p_issue); if (!it) fail('issue_required');
      if (!a.p_description || a.p_description.trim().length < 3) fail('description_required');
      if (a.p_photo && !isImg(a.p_photo)) fail('photo_required');
      const s2 = a.p_staff ? techOf(a.p_staff) : null; if (a.p_staff && !s2) fail('bad_technician');
      const res = insertRequest(u, it, a, ['phone', 'whatsapp', 'walkin', 'email'].includes(a.p_source) ? a.p_source : 'other', me.id);
      if (s2) { const r = find(res.id); offer(r, s2.id, me.id, a.p_assign_note); ev(r.id, me.id, 'assigned', [s2.full_name, r.assign_note].filter(Boolean).join(' · ')); }
      return res;
    },
    track_request: a => {
      const r = db.requests.find(x => x.id === a.p_id && x.tracking_code === a.p_code); if (!r) return null;
      const o = pick(r, ['id', 'no', 'status', 'issue_type', 'description', 'building_code', 'building_ar', 'building_en', 'unit_ar', 'unit_en', 'unit_kind', 'created_at', 'accepted_at', 'arrived_at', 'finished_at', 'closed_at', 'cancelled_at', 'signed_at', 'signoff_method', 'rating', 'tech_note', 'hold_kind', 'hold_eta', 'stage']);
      o.assigned_at = r.status !== 'new' ? r.offered_at || null : null;
      o.parts = ['finished', 'closed'].includes(r.status) ? r.parts || [] : null;
      o.escalated = (r.legs || []).some(l => l.outcome === 'escalated');
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
    staff_me: a => meOf(auth(a.p_token)),
    staff_requests: a => {
      const me = auth(a.p_token), F = a.p_from ? D(a.p_from).getTime() : -Infinity, T = a.p_to ? D(a.p_to).getTime() : Infinity;
      return db.requests.filter(r => sees(me, r) && (['new', 'assigned', 'accepted', 'onsite', 'finished'].includes(r.status) || (D(r.created_at) >= F && D(r.created_at) < T)))
        .sort((x, y) => D(y.created_at) - D(x.created_at))
        .map(r => { const o = pick(r, LIGHT); o.description = (r.description || '').slice(0, 280); o.technician = name(r.technician_id); o.assigned_by_name = name(r.assigned_by); o.legs = r.legs || []; o.hold_ref_no = r.hold_ref ? (find(r.hold_ref) || {}).no || null : null; return o; });
    },
    staff_request: a => {
      const me = auth(a.p_token), r = find(a.p_id); if (!r) fail('not_found');
      if (me.role === 'technician' && !sees(me, r)) fail('not_allowed');
      const o = clone(r); delete o.tracking_code;
      o.technician = name(r.technician_id); o.created_by_name = name(r.created_by); o.assigned_by_name = name(r.assigned_by);
      o.hold_ref_no = r.hold_ref ? (find(r.hold_ref) || {}).no || null : null;
      o.events = db.events.filter(e => e.request_id === r.id).sort((x, y) => D(x.at) - D(y.at) || x.id - y.id).map(e => ({ at: e.at, ev: e.ev, note: e.note, actor: name(e.actor) }));
      const u = db.units.find(x => x.id === r.unit_id); o._token = u ? u.token : null;
      return o;
    },
    report_requests: a => {
      auth(a.p_token, ['supervisor', 'admin']); const F = D(a.p_from).getTime(), T = D(a.p_to).getTime();
      return db.requests.filter(r => { const c = D(r.created_at).getTime(), end = r.closed_at || r.cancelled_at; return c < T && (c >= F || !end || D(end).getTime() >= F); })
        .sort((x, y) => D(x.created_at) - D(y.created_at))
        .map(r => { const o = pick(r, FULL); o.technician = name(r.technician_id); o.assigned_by_name = name(r.assigned_by); o.legs = r.legs || []; o.parts = r.parts || []; o.hold_ref_no = r.hold_ref ? (find(r.hold_ref) || {}).no || null : null; return o; });
    },
    report_counts: a => {
      auth(a.p_token, ['supervisor', 'admin']); const F = D(a.p_from).getTime(), T = D(a.p_to).getTime(), out = {};
      db.requests.filter(r => { const c = D(r.created_at).getTime(); return c >= F && c < T && (!a.p_building || r.building_code === a.p_building); }).forEach(r => {
        const k0 = dayKey(r.created_at), k = a.p_unit === 'month' ? k0.slice(0, 8) + '01' : a.p_unit === 'week' ? weekOf(k0) : k0;
        const x = out[k] || (out[k] = { d: k, n: 0, urgent: 0, done: 0, cancelled: 0 });
        x.n++; if (r.priority === 'urgent') x.urgent++; if (['finished', 'closed'].includes(r.status)) x.done++; if (r.status === 'cancelled') x.cancelled++;
      });
      return Object.values(out).sort((x, y) => (x.d < y.d ? -1 : 1));
    },
    report_units: a => {
      auth(a.p_token, ['supervisor', 'admin']); const F = D(a.p_from).getTime(), T = D(a.p_to).getTime(), by = {};
      db.requests.forEach(r => {
        const c = D(r.created_at).getTime(); if (r.status === 'cancelled' || c < F || c >= T) return;
        const k = r.unit_id + '|' + dayKey(r.created_at).slice(0, 7) + '|' + r.issue_type; by[k] = (by[k] || 0) + 1;
      });
      return db.units.filter(u => !a.p_building || u.building_code === a.p_building).sort((x, y) => x.building_code.localeCompare(y.building_code) || x.sort - y.sort)
        .map(u => ({ unit_id: u.id, building_code: u.building_code, building_ar: u.building_ar, building_en: u.building_en, label_ar: u.label_ar, label_en: u.label_en, kind: u.kind, active: u.active, sort: u.sort,
          cells: Object.keys(by).filter(k => k.indexOf(u.id + '|') === 0).sort().map(k => { const p = k.split('|'); return { m: p[1], k: p[2], n: by[k] }; }) }));
    },
    unit_history: a => {
      auth(a.p_token, ['supervisor', 'admin']); const u = db.units.find(x => x.id === a.p_unit); if (!u) fail('not_found');
      return { unit: { id: u.id, building_code: u.building_code, building_ar: u.building_ar, building_en: u.building_en, label_ar: u.label_ar, label_en: u.label_en, kind: u.kind, active: u.active },
        requests: db.requests.filter(r => r.unit_id === u.id).sort((x, y) => D(y.created_at) - D(x.created_at))
          .map(r => { const o = clone(r); delete o.tracking_code; delete o.photo_before; delete o.photo_after; delete o.signature; o.technician = name(r.technician_id); o.assigned_by_name = name(r.assigned_by); return o; }) };
    },
    tech_accept: a => {
      const me = auth(a.p_token), r = find(a.p_id); if (!r) fail('not_found');
      if (r.technician_id !== me.id) fail('not_assigned'); if (r.status !== 'assigned') fail('not_ready');
      let b = null; const note = String(a.p_note || '').trim().slice(0, 300);
      if (a.p_busy) { b = find(a.p_busy); if (!b || b.technician_id !== me.id || !['accepted', 'onsite'].includes(b.status)) fail('bad_busy'); }
      else if (a.p_note != null && note.length < 3) fail('reason_required');
      const busyNow = !!b || !!note, origin = b ? b.building_code : originOf(me.id, r.building_code);
      Object.assign(r, { status: 'accepted', accepted_at: now(), accept_method: 'self', origin, target_arrive: arriveTarget(r.building_code, r.priority, r.stage, origin), hold_kind: busyNow ? 'busy' : null, hold_at: busyNow ? now() : null, hold_ref: b ? b.id : null, hold_note: b ? null : note || null, escalated_at: null });
      ev(r.id, me.id, 'accepted');
      if (busyNow) ev(r.id, me.id, 'hold_busy', b ? '#' + b.no : note);
    },
    tech_decline: a => {
      const me = auth(a.p_token), note = String(a.p_note || '').trim().slice(0, 300); if (note.length < 3) fail('reason_required');
      const r = find(a.p_id); if (!r) fail('not_found'); if (r.technician_id !== me.id) fail('not_assigned'); if (r.status !== 'assigned') fail('not_ready');
      endVisit(r, 'declined', note, true); ev(r.id, me.id, 'declined', note);
    },
    tech_hold: a => {
      const me = auth(a.p_token), r = find(a.p_id); if (!r || !['accepted', 'onsite'].includes(r.status) || r.hold_kind) fail('not_ready');
      if (!own(r, me)) fail('not_assigned');
      const note = String(a.p_note || '').trim().slice(0, 500); let b = null, parts = null;
      if (a.p_kind === 'busy') {
        if (r.status !== 'accepted') fail('not_ready');
        if (a.p_ref) { b = find(a.p_ref); if (!b || b.id === r.id || b.technician_id !== r.technician_id || !['accepted', 'onsite'].includes(b.status)) fail('bad_busy'); }
        else if (note.length < 3) fail('reason_required');
      } else if (a.p_kind === 'access') { if (note.length < 3) fail('reason_required'); }
      else if (a.p_kind === 'parts') { if (r.status !== 'onsite') fail('not_ready'); parts = cleanParts(a.p_parts); if (!parts.length) fail('parts_required'); }
      else if (a.p_kind === 'other') { if (r.status !== 'onsite') fail('not_ready'); if (note.length < 3) fail('reason_required'); }
      else fail('bad_kind');
      Object.assign(r, { hold_kind: a.p_kind, hold_at: now(), hold_note: note || null, hold_ref: a.p_kind === 'busy' && b ? b.id : null, hold_eta: a.p_kind !== 'busy' ? a.p_eta || null : null });
      if (parts) r.hold_parts = parts;
      ev(r.id, me.id, 'hold_' + a.p_kind, [b ? '#' + b.no : '', note, parts ? partsTxt(parts) : ''].filter(Boolean).join(' · '));
      if (r.status === 'onsite') release(r.id, r.building_code);
    },
    tech_resume: a => {
      const me = auth(a.p_token), r = find(a.p_id); if (!r || !r.hold_kind || !['accepted', 'onsite'].includes(r.status)) fail('not_ready');
      if (!own(r, me)) fail('not_assigned');
      const s2 = secsSince(r.hold_at);
      if (r.status === 'accepted') {
        const origin = originOf(r.technician_id, r.building_code);
        r.paused_arrive = (r.paused_arrive || 0) + s2; r.origin = origin; r.target_arrive = arriveTarget(r.building_code, r.priority, r.stage, origin);
        clearHold(r); ev(r.id, me.id, 'resumed'); return 'go';
      }
      const u = db.units.find(x => x.id === r.unit_id), tk = String(a.p_unit_token || '').trim(); let m;
      if (tk) { if (tk !== u.token) fail('wrong_unit'); m = 'qr'; } else { if (!a.p_note || a.p_note.trim().length < 3) fail('reason_required'); m = 'manual'; }
      r.paused_work = (r.paused_work || 0) + s2; clearHold(r);
      ev(r.id, me.id, 'resumed_' + m, a.p_note); return m;
    },
    tech_arrive: a => {
      const me = auth(a.p_token), r = find(a.p_id); if (!r || r.status !== 'accepted') fail('not_ready');
      if (!own(r, me)) fail('not_assigned');
      if (r.hold_kind) fail('on_hold');
      const u = db.units.find(x => x.id === r.unit_id), tk = String(a.p_unit_token || '').trim(); let m;
      if (tk) { if (tk !== u.token) fail('wrong_unit'); m = 'qr'; } else { if (!a.p_note || a.p_note.trim().length < 3) fail('reason_required'); m = 'manual'; }
      Object.assign(r, { status: 'onsite', arrived_at: now(), arrival_method: m, arrival_note: (a.p_note || '').trim() || null, arrival_lat: a.p_lat == null ? null : a.p_lat, arrival_lng: a.p_lng == null ? null : a.p_lng, arrival_acc: a.p_acc == null ? null : a.p_acc });
      ev(r.id, me.id, 'arrived_' + m, a.p_note); return m;
    },
    tech_finish: a => {
      const me = auth(a.p_token); if (!isImg(a.p_photo)) fail('photo_required');
      if (!a.p_note || a.p_note.trim().length < 5) fail('report_required');
      const r = find(a.p_id); if (!r || r.status !== 'onsite' || r.hold_kind) fail('not_ready'); if (!own(r, me)) fail('not_assigned');
      Object.assign(r, { status: 'finished', finished_at: now(), photo_after: a.p_photo, tech_note: a.p_note.trim().slice(0, 1500), parts: cleanParts(a.p_parts) });
      ev(r.id, me.id, 'finished', a.p_note); release(r.id, r.building_code);
    },
    tech_escalate: a => {
      const me = auth(a.p_token); const note = String(a.p_note || '').trim().slice(0, 500); if (note.length < 3) fail('reason_required');
      const r = find(a.p_id); if (!r || r.status !== 'onsite' || r.stage !== 'hm') fail('not_ready'); if (!own(r, me)) fail('not_assigned');
      endVisit(r, 'escalated', note, true, 'ops'); ev(r.id, me.id, 'to_ops', note); release(r.id, r.building_code);
    },
    onsite_signoff: a => {
      const me = auth(a.p_token);
      if (!a.p_signer || a.p_signer.trim().length < 2) fail('signer_required'); if (!(a.p_rating >= 1 && a.p_rating <= 5)) fail('rating_required'); if (!isSig(a.p_signature)) fail('signature_required');
      const r = find(a.p_id); if (!r || r.status !== 'finished') fail('not_ready'); if (!own(r, me)) fail('not_assigned');
      Object.assign(r, { signature: a.p_signature, signer_name: a.p_signer.trim(), signoff_method: 'onsite', rating: a.p_rating, rating_comment: (a.p_comment || '').trim() || null, signed_at: now(), closed_at: now(), close_method: 'signed', status: 'closed' });
      ev(r.id, me.id, 'signed_onsite', a.p_signer);
    },
    mgr_assign: a => {
      const me = auth(a.p_token, ['supervisor', 'admin']), s = techOf(a.p_staff); if (!s) fail('bad_technician');
      const r = find(a.p_id); if (!r || !['new', 'assigned', 'accepted', 'onsite'].includes(r.status)) fail('not_ready');
      if (r.technician_id === s.id) return;
      const note = String(a.p_note || '').trim().slice(0, 300) || null, label = [s.full_name, note].filter(Boolean).join(' · ');
      if (r.status === 'new') { offer(r, s.id, me.id, note); ev(r.id, me.id, 'assigned', label); }
      else { endVisit(r, 'reassigned', s.full_name, false); offer(r, s.id, me.id, note); ev(r.id, me.id, 'reassigned', label); release(r.id, r.building_code); }
    },
    mgr_priority: a => {
      const me = auth(a.p_token, ['supervisor', 'admin']); if (['urgent', 'normal'].indexOf(a.p_priority) < 0) fail('bad_priority');
      const r = find(a.p_id); if (!r || ['closed', 'cancelled'].includes(r.status)) fail('not_ready'); if (r.priority === a.p_priority) return;
      const tg = targets(a.p_priority);
      Object.assign(r, { priority: a.p_priority, target_pickup: tg[0], target_work: tg[1], target_dispatch: tg[2], target_arrive: r.arrived_at ? r.target_arrive : arriveTarget(r.building_code, a.p_priority, r.stage, r.origin) });
      ev(r.id, me.id, 'priority_' + a.p_priority);
    },
    mgr_close: a => {
      const me = auth(a.p_token, ['supervisor', 'admin']); if (!a.p_note || a.p_note.trim().length < 3) fail('reason_required');
      const r = find(a.p_id); if (!r || !['accepted', 'onsite', 'finished'].includes(r.status)) fail('not_ready');
      if (r.hold_kind) { const s2 = secsSince(r.hold_at); if (r.arrived_at) r.paused_work = (r.paused_work || 0) + s2; else r.paused_arrive = (r.paused_arrive || 0) + s2; }
      Object.assign(r, { status: 'closed', closed_at: now(), close_method: 'manual', close_note: a.p_note.trim(), hold_kind: null, hold_at: null, hold_ref: null, hold_eta: null });
      ev(r.id, me.id, 'closed_manual', a.p_note); release(r.id, r.building_code);
    },
    mgr_cancel: a => {
      const me = auth(a.p_token, ['supervisor', 'admin']); if (!a.p_note || a.p_note.trim().length < 3) fail('reason_required');
      const r = find(a.p_id); if (!r || ['closed', 'cancelled'].includes(r.status)) fail('not_ready');
      Object.assign(r, { status: 'cancelled', cancelled_at: now(), cancel_note: a.p_note.trim(), hold_kind: null, hold_at: null, hold_ref: null, hold_eta: null });
      ev(r.id, me.id, 'cancelled', a.p_note); release(r.id, r.building_code);
    },
    admin_remove_staff: a => {
      const me = auth(a.p_token, ['admin']), s = db.staff.find(x => x.id === a.p_id && !x.removed_at); if (!s) fail('not_found');
      if (s.id === me.id) fail('not_self');
      if (db.requests.some(r => r.technician_id === s.id && ['assigned', 'accepted', 'onsite'].includes(r.status))) fail('has_open_jobs');
      Object.keys(db.sessions).forEach(k => { if (db.sessions[k] === s.id) delete db.sessions[k]; });
      const used = db.requests.some(r => r.technician_id === s.id || r.created_by === s.id || r.assigned_by === s.id || (r.legs || []).some(l => l.staff_id === s.id)) || db.events.some(e => e.actor === s.id);
      if (!used) { db.staff = db.staff.filter(x => x.id !== s.id); return { removed: 'deleted' }; }
      Object.assign(s, { removed_at: now(), active: false, phone: s.phone + '-' + s.id.slice(-6) });
      return { removed: 'archived' };
    },
    team_list: a => { auth(a.p_token, ['supervisor', 'admin']); return db.staff.filter(s => !s.removed_at).sort((x, y) => (y.active - x.active) || x.role.localeCompare(y.role) || String(x.team).localeCompare(String(y.team)) || x.full_name.localeCompare(y.full_name)).map(s => ({ id: s.id, name: s.full_name, phone: s.phone, role: s.role, team: s.team || 'ops', sites: s.sites || [], active: s.active, locked: false, created_at: s.created_at })); },
    admin_save_staff: a => {
      const me = auth(a.p_token, ['admin']), phone = normPhone(a.p_phone);
      if (!a.p_name || a.p_name.trim().length < 2) fail('name_required'); if (phone.length < 8) fail('phone_required');
      if (['technician', 'supervisor', 'admin'].indexOf(a.p_role) < 0) fail('bad_role'); if (a.p_pin && !/^[0-9]{6}$/.test(a.p_pin)) fail('pin_format');
      if (a.p_role === 'admin' && a.p_id !== me.id) fail('one_admin');
      if (db.staff.some(s => s.phone === phone && s.id !== a.p_id)) fail('phone_taken');
      const team = a.p_team === 'hm' && a.p_role === 'technician' ? 'hm' : 'ops';
      const sites = team === 'hm' ? Array.from(new Set((Array.isArray(a.p_sites) ? a.p_sites : []).map(x => String(x).trim().toUpperCase()).filter(x => /^[A-Z0-9]{2,8}$/.test(x)))) : [];
      if (team === 'hm' && !sites.length) fail('sites_required');
      if (!a.p_id) { if (!a.p_pin) fail('pin_format'); const s = { id: uid(), full_name: a.p_name.trim(), phone, role: a.p_role, team, sites, pin: a.p_pin, active: true, created_at: now() }; db.staff.push(s); return { id: s.id }; }
      const s = db.staff.find(x => x.id === a.p_id && !x.removed_at); if (!s) fail('not_found');
      if (s.id === me.id && (a.p_role !== 'admin' || a.p_active === false)) fail('not_self');
      Object.assign(s, { full_name: a.p_name.trim(), phone, role: a.p_role, team, sites, active: a.p_active !== false }); if (a.p_pin) s.pin = a.p_pin;
      if ((a.p_pin || a.p_active === false) && s.id !== me.id) Object.keys(db.sessions).forEach(k => { if (db.sessions[k] === s.id) delete db.sessions[k]; });
      return { id: s.id };
    },
    admin_units: a => { const me = auth(a.p_token, ['supervisor', 'admin']); return db.units.slice().sort((x, y) => x.building_code.localeCompare(y.building_code) || x.sort - y.sort).map(u => Object.assign({}, u, { token: me.role === 'admin' ? u.token : null })); },
    admin_add_unit: a => {
      auth(a.p_token, ['admin']); const code = String(a.p_building_code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{2,8}$/.test(code) || !a.p_building_ar || !a.p_building_en) fail('bad_building'); if (!a.p_label_ar || !a.p_label_en) fail('label_required');
      if (db.units.some(u => u.building_code === code && u.label_en === a.p_label_en.trim())) fail('unit_exists');
      const u = { id: uid(), building_code: code, building_ar: a.p_building_ar.trim(), building_en: a.p_building_en.trim(), label_ar: a.p_label_ar.trim(), label_en: a.p_label_en.trim(), kind: a.p_kind === 'common' ? 'common' : 'flat', token: code.toLowerCase() + '-' + uid().slice(1, 9), active: true, sort: a.p_sort || 0 };
      db.units.push(u);
      db.settings.buildings = db.settings.buildings || {};
      if (!db.settings.buildings[code]) db.settings.buildings[code] = { ar: u.building_ar, en: u.building_en, type: 'res', ops: 60, sort: 50 };
      return { id: u.id, token: u.token };
    },
    admin_unit_active: a => { auth(a.p_token, ['admin']); const u = db.units.find(x => x.id === a.p_id); if (u) u.active = !!a.p_active; },
    admin_save_settings: a => {
      auth(a.p_token, ['admin']); const d = a.p_data;
      if (!d || !Array.isArray(d.issueTypes) || !d.issueTypes.length || d.issueTypes.some(i => !i.k || !i.ar || !i.en || ['urgent', 'normal'].indexOf(i.p) < 0)) fail('bad_settings');
      if (d.buildings && (typeof d.buildings !== 'object' || Object.values(d.buildings).some(b => !b || typeof b !== 'object' || (b.ops != null && typeof b.ops !== 'number') || ['res', 'com'].indexOf(b.type || 'res') < 0))) fail('bad_settings');
      db.settings = clone(d);
    }
  };

  /* ----- sample data: seven buildings, four handymen, four operations-room technicians, five weeks of history ----- */
  function seed() {
    let s = 73112;
    const R = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const pickR = a => a[Math.floor(R() * a.length)];
    const wpick = obj => { const ks = Object.keys(obj), tot = ks.reduce((t2, k) => t2 + obj[k], 0); let x = R() * tot; for (const k of ks) { x -= obj[k]; if (x <= 0) return k; } return ks[0]; };
    const st = clone(DEFAULTS);
    if (st.buildings.AZB) { st.buildings.AZB.lat = 23.5893; st.buildings.AZB.lng = 58.3891; }
    const extra = {
      SAY: [['شقة 101', 'Flat 101'], ['شقة 102', 'Flat 102'], ['شقة 103', 'Flat 103'], ['شقة 201', 'Flat 201'], ['شقة 202', 'Flat 202'], ['شقة 203', 'Flat 203']],
      MWL: [['شقة 11', 'Flat 11'], ['شقة 12', 'Flat 12'], ['شقة 21', 'Flat 21'], ['شقة 22', 'Flat 22'], ['شقة 31', 'Flat 31']],
      BSH: [['شقة 1', 'Flat 1'], ['شقة 2', 'Flat 2'], ['شقة 3', 'Flat 3'], ['شقة 4', 'Flat 4']],
      HO: [['الطابق الأرضي', 'Ground floor'], ['الطابق الأول', 'First floor'], ['الطابق الثاني', 'Second floor']],
      SCC: [['محل 5', 'Shop 5'], ['محل 12', 'Shop 12'], ['المطعم', 'Restaurant'], ['المواقف', 'Car park']],
      OBTS: [['الطابق 2', 'Floor 2'], ['الطابق 5', 'Floor 5'], ['الطابق 8', 'Floor 8']]
    };
    let ui = 0;
    const units = [];
    DEMO_UNITS.buildings.forEach(B => {
      B.units.forEach(u => units.push({ id: 'u' + (++ui), building_code: B.code, building_ar: B.ar, building_en: B.en, label_ar: u.label_ar, label_en: u.label_en, kind: u.kind, token: u.token, active: true, sort: u.sort }));
      (extra[B.code] || []).forEach((x, i) => units.push({ id: 'u' + (++ui), building_code: B.code, building_ar: B.ar, building_en: B.en, label_ar: x[0], label_en: x[1], kind: B.code === 'HO' || B.code === 'OBTS' || x[1] === 'Car park' ? 'common' : 'flat', token: B.code.toLowerCase() + (i + 1) + '-demo' + (i + 1), active: true, sort: i + 1 }));
    });
    const t0 = new Date(Date.now() - 60 * 864e5).toISOString();
    const staff = [
      { id: 's-admin', full_name: 'مدير المرافق', phone: '96890000001', role: 'admin', team: 'ops', sites: [], pin: '100001', active: true, created_at: t0 },
      { id: 's-sup', full_name: 'ناصر الرواحي', phone: '96890000002', role: 'supervisor', team: 'ops', sites: [], pin: '100002', active: true, created_at: t0 },
      { id: 's-h1', full_name: 'Rajesh Nair', phone: '96895555551', role: 'technician', team: 'hm', sites: ['AZB'], pin: '555551', active: true, created_at: t0 },
      { id: 's-h2', full_name: 'Sameer Ali', phone: '96895555552', role: 'technician', team: 'hm', sites: ['SAY'], pin: '555552', active: true, created_at: t0 },
      { id: 's-h3', full_name: 'Bijoy Das', phone: '96895555553', role: 'technician', team: 'hm', sites: ['MWL'], pin: '555553', active: true, created_at: t0 },
      { id: 's-h4', full_name: 'Imran Khan', phone: '96895555554', role: 'technician', team: 'hm', sites: ['BSH'], pin: '555554', active: true, created_at: t0 },
      { id: 's-t1', full_name: 'Sanjay Kumar', phone: '96891111111', role: 'technician', team: 'ops', sites: [], pin: '111111', active: true, created_at: t0 },
      { id: 's-t2', full_name: 'Mohammed Rafiq', phone: '96892222222', role: 'technician', team: 'ops', sites: [], pin: '222222', active: true, created_at: t0 },
      { id: 's-t3', full_name: 'Anil Thomas', phone: '96893333333', role: 'technician', team: 'ops', sites: [], pin: '333333', active: true, created_at: t0 },
      { id: 's-t4', full_name: 'سالم البلوشي', phone: '96894444444', role: 'technician', team: 'ops', sites: [], pin: '444444', active: true, created_at: t0 }
    ];
    const HM = { AZB: 's-h1', SAY: 's-h2', MWL: 's-h3', BSH: 's-h4' };
    const prof = {
      's-h1': { a: 0.55, w: 0.65, r: 4.6, esc: 0.22, man: 0.03, on: 0.12 }, 's-h2': { a: 0.9, w: 0.9, r: 4.2, esc: 0.32, man: 0.08, on: 0.2 },
      's-h3': { a: 1.35, w: 1.15, r: 3.6, esc: 0.45, man: 0.25, on: 0.4 }, 's-h4': { a: 0.75, w: 0.8, r: 4.4, esc: 0.3, man: 0.05, on: 0.15 },
      's-t1': { a: 0.55, w: 0.6, r: 4.7, man: 0.03, on: 0.1 }, 's-t2': { a: 0.85, w: 0.85, r: 4.2, man: 0.08, on: 0.2 },
      's-t3': { a: 1.3, w: 1.15, r: 3.4, man: 0.3, on: 0.45 }, 's-t4': { a: 0.7, w: 0.8, r: 4.4, man: 0.05, on: 0.15 }
    };
    const opsW = { 's-t1': 30, 's-t2': 27, 's-t3': 23, 's-t4': 20 };
    const bldW = { AZB: 30, SAY: 15, MWL: 13, BSH: 11, HO: 13, SCC: 12, OBTS: 6 };
    const flatW = { ac: 22, plumbing: 14, water_leak: 9, lights: 10, heater: 8, sockets: 6, drain_overflow: 6, carpentry: 5, door_lock: 4, no_power: 3, pests: 4, no_water: 2, sparks: 1, other: 3 };
    const commonW = { lights: 40, lift: 15, water_leak: 10, plumbing: 8, door_lock: 9, pests: 8, other: 10 };
    const escBoost = { ac: 0.35, no_power: 0.3, sparks: 0.45, lift: 0.6, heater: 0.15, drain_overflow: 0.15, water_leak: 0.1 };
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
    const COMMON_DESC = { lights: ['إنارة الدرج في الطابق الرابع لا تعمل', 'Corridor lights on the 2nd floor are off', 'إنارة المدخل لا تعمل'], water_leak: ['تسرّب ماء في موقف السيارات'], plumbing: ['حنفية دورة المياه العامة تسرّب'], door_lock: ['باب المدخل الرئيسي لا يُقفل'], pests: ['حشرات عند حاويات النفايات'], other: ['جرس الإنتركم في المدخل لا يعمل'], lift: ['المصعد متوقف بين الطابقين'] };
    const NOTE = { ac: ['تم تنظيف الفلتر وإعادة شحن الغاز وتجربة التبريد', 'Cleaned the drain line and tested cooling'], plumbing: ['تم تغيير الشطاف وتجربته', 'Replaced the cartridge and tested'], water_leak: ['الوصلة تحت المغسلة متآكلة، تم تغييرها وتجربة التشغيل', 'Sealed the joint and checked for leaks'], lights: ['تم تغيير اللمبة والمفتاح', 'Replaced the LED driver and tested'], heater: ['تم تغيير الثرموستات وتجربة التسخين'], sockets: ['تم تغيير الفيش وشد التوصيلات'], drain_overflow: ['تم تسليك المجرى بالماكينة'], carpentry: ['Re-fixed the hinge and adjusted the door'], door_lock: ['تم تغيير أسطوانة القفل وتسليم المفاتيح'], no_power: ['تم تغيير القاطع وشد التوصيلات في اللوحة'], pests: ['تم رش المبيد وإغلاق الفتحات'], no_water: ['تم فتح المحبس وتنظيف العوامة'], sparks: ['تم تغيير التوصيلة المحترقة وفحص اللوحة'], lift: ['تمت إعادة تشغيل المصعد مع شركة المصاعد'], other: ['تم الإصلاح وتجربته'] };
    const PARTS = { ac: [[{ n: 'فلتر مكيف', q: 1 }], [{ n: 'غاز R410A (كجم)', q: 1.5 }], [{ n: 'مكثف تشغيل 35 مايكرو', q: 1 }]], plumbing: [[{ n: 'شطاف كامل', q: 1 }], [{ n: 'جلدة سيفون', q: 1 }]], water_leak: [[{ n: 'وصلة مرنة ½ إنش', q: 1 }], [{ n: 'شريط تفلون', q: 2 }]], lights: [[{ n: 'لمبة LED 18 واط', q: 2 }], [{ n: 'محوّل إنارة LED', q: 1 }]], heater: [[{ n: 'ثرموستات سخان', q: 1 }], [{ n: 'عنصر تسخين 2 كيلوواط', q: 1 }]], sockets: [[{ n: 'فيش 13 أمبير', q: 1 }]], carpentry: [[{ n: 'مفصلة باب', q: 2 }]], door_lock: [[{ n: 'أسطوانة قفل', q: 1 }]], no_power: [[{ n: 'قاطع 32 أمبير', q: 1 }]], sparks: [[{ n: 'سلك 4 مم (متر)', q: 3 }]] };
    const WAIT_PARTS = { ac: [{ n: 'كمبروسر 1.5 طن', q: 1 }], heater: [{ n: 'سخان 80 لتر', q: 1 }], lift: [{ n: 'لوحة تحكم الباب', q: 1 }], no_power: [{ n: 'قاطع رئيسي 63 أمبير', q: 1 }], plumbing: [{ n: 'خلاط مغسلة', q: 1 }], door_lock: [{ n: 'قفل ذكي', q: 1 }], water_leak: [{ n: 'أنبوب PPR 1 إنش (متر)', q: 3 }] };
    const ESC = ['الكمبروسر لا يعمل، يحتاج فني تكييف', 'العطل في لوحة الكهرباء الرئيسية', 'يحتاج سلّم ومعدات غير متوفرة في المبنى', 'التسريب من الأنبوب الرئيسي داخل الجدار', 'يحتاج فني كهرباء مختص'];
    const COMMENTS = ['شكراً، خدمة سريعة', 'Very polite technician', 'تأخر قليلاً لكن العمل ممتاز', 'Good job', 'الفني محترم ونظيف في العمل', 'وصل متأخراً'];
    const NAMES = ['أحمد', 'Fatma', 'خالد', 'Priya', 'سعيد', 'مريم', 'John', null, null];
    const db0 = { v: 6, at: Date.now(), settings: st, units, staff, sessions: {}, requests: [], events: [], seq: { no: 1000, ev: 0 } };
    const iso = x => new Date(x).toISOString();
    const nowMs = Date.now(), midnight = d => { const n = d + OFFSET; return n - (n % 864e5) - OFFSET; };
    let quiet = false;   // the older history keeps no event log, to stay small
    const pushEv = (rid, at, actor, e, note) => { if (!quiet) db0.events.push({ id: ++db0.seq.ev, request_id: rid, at: iso(at), actor: actor || null, ev: e, note: note || null }); };
    const sname = id => (staff.find(x => x.id === id) || {}).full_name;
    const ops = c => st.buildings[c].ops;
    const tgA = (code, p, team, origin) => ((origin && origin === code) || (team === 'hm' && !origin) ? st.targets[p].arrive : Math.max(ops(code), origin ? ops(origin) : 0));
    const HOME = { 's-h1': 'AZB', 's-h2': 'SAY', 's-h3': 'MWL', 's-h4': 'BSH' };
    const teamOfS = id => (HOME[id] ? 'hm' : 'ops');
    const fromOf = (id, code) => (HOME[id] ? (HOME[id] === code ? code : HOME[id]) : null);
    const SUP_NOTES = ['المستأجر في البيت بعد العصر', 'المفتاح عند حارس المبنى', 'اتصل بالمستأجر قبل الوصول', 'Tenant asked for a call before coming', 'خذ معك سلّماً'];
    const DECLINE = ['أنا في مبنى آخر بمهمة عاجلة', 'في إجازة اليوم', 'يحتاج فني كهرباء وليس سباكة', 'On another urgent job until the evening'];
    const mk = (u, issue, created) => {
      const it = st.issueTypes.find(i => i.k === issue), stage = HM[u.building_code] ? 'hm' : 'ops';
      const descs = (u.kind === 'common' && COMMON_DESC[issue]) || DESC[issue] || DESC.other;
      const nm = pickR(NAMES);
      return { id: uid(), no: 0, unit_id: u.id, building_code: u.building_code, building_ar: u.building_ar, building_en: u.building_en, unit_ar: u.label_ar, unit_en: u.label_en, unit_kind: u.kind, issue_type: issue, priority: it.p, target_pickup: st.targets[it.p].pickup, target_arrive: tgA(u.building_code, it.p, stage, null), target_work: st.targets[it.p].work, target_dispatch: st.targets[it.p].dispatch, description: pickR(descs), photo_before: PH_BEFORE, lang: R() < 0.7 ? 'ar' : 'en', contact_name: nm, contact_phone: nm ? '9' + String(1000000 + Math.floor(R() * 8999999)) : null, tracking_code: uid() + uid(), status: 'new', created_at: iso(created), queued_at: iso(created), offered_at: null, source: R() < 0.12 ? pickR(['phone', 'whatsapp']) : 'qr', stage, paused_arrive: 0, paused_work: 0, parts: [], legs: [] };
    };
    // the supervisor gives the request to someone (and the visit record when it ends)
    const give = (r, techId, at, note) => { const team = teamOfS(techId), origin = fromOf(techId, r.building_code); Object.assign(r, { status: 'assigned', technician_id: techId, stage: team, offered_at: iso(at), assigned_by: 's-sup', assign_note: note || null, origin, target_arrive: tgA(r.building_code, r.priority, team, origin) }); };
    const legNow = (r, outcome, note, endAt) => ({ staff_id: r.technician_id, name: sname(r.technician_id), team: r.stage, queued_at: r.queued_at, target_dispatch: r.target_dispatch, assigned_by: r.assigned_by, assigned_by_name: sname(r.assigned_by), assign_note: r.assign_note || null, offered_at: r.offered_at, accepted_at: r.accepted_at || null, accept_method: r.accept_method || null, arrived_at: r.arrived_at || null, arrival_method: r.arrival_method || null, ended_at: iso(endAt), outcome, note: note || null, target_pickup: r.target_pickup, target_arrive: r.target_arrive, target_work: r.target_work, origin: r.origin || null, paused_arrive: r.paused_arrive || 0, paused_work: r.paused_work || 0 });
    const backToQueue = (r, at, stage) => Object.assign(r, { stage: stage || r.stage, status: 'new', technician_id: null, queued_at: iso(at), offered_at: null, assigned_by: null, assign_note: null, accepted_at: null, accept_method: null, arrived_at: null, arrival_method: null, arrival_note: null, arrival_lat: null, arrival_lng: null, arrival_acc: null, origin: null, paused_arrive: 0, paused_work: 0, target_arrive: tgA(r.building_code, r.priority, stage || r.stage, null) });
    // one visit: the supervisor gives it to techId after some minutes, he accepts (or declines), and so on
    const visit = (r, techId, queuedAt, upTo, opts) => {
      let at = queuedAt + (r.priority === 'urgent' ? 1 + R() * 11 : 3 + R() * 34) * 60000;
      if (at > upTo) return 'new';
      const p = prof[techId], team = teamOfS(techId);
      give(r, techId, at, R() < 0.18 ? pickR(SUP_NOTES) : null);
      if (team === 'ops' && R() < 0.25) { r.origin = pickR(['SAY', 'MWL', 'BSH', 'AZB']); r.target_arrive = tgA(r.building_code, r.priority, team, r.origin); }
      pushEv(r.id, at, 's-sup', 'assigned', [sname(techId), r.assign_note].filter(Boolean).join(' · '));
      if (!opts.noDecline && R() < 0.06) {
        const dAt = at + (2 + R() * 14) * 60000; if (dAt > upTo) return 'assigned';
        const note = pickR(DECLINE);
        r.legs.push(legNow(r, 'declined', note, dAt)); pushEv(r.id, dAt, techId, 'declined', note);
        backToQueue(r, dAt);
        return visit(r, team === 'hm' ? opts.ops() : pickR(Object.keys(opsW).filter(x => x !== techId)), dAt, upTo, Object.assign({}, opts, { noDecline: true }));
      }
      at += (r.priority === 'urgent' ? 1 + R() * 9 : 2 + R() * 26) * 60000;
      if (at > upTo) return 'assigned';
      Object.assign(r, { status: 'accepted', accepted_at: iso(at), accept_method: 'self' });
      pushEv(r.id, at, techId, 'accepted');
      if (R() < (team === 'ops' ? 0.22 : 0.1)) { const pause = (team === 'ops' ? 20 + R() * 100 : 10 + R() * 35) * 60000; r.paused_arrive += Math.round(pause / 1000); pushEv(r.id, at + 1000, techId, 'hold_busy', pickR(['صيانة دورية لمضخات المياه', 'طلب آخر في نفس المبنى', 'Routine check of the fire pumps'])); pushEv(r.id, at + pause, null, 'resumed_auto', ''); at += pause; }
      const arr = at + r.target_arrive * p.a * (0.5 + R() * 0.95) * 60000; if (arr > upTo) return 'accepted';
      const manual = R() < p.man;
      Object.assign(r, { status: 'onsite', arrived_at: iso(arr), arrival_method: manual ? 'manual' : 'qr', arrival_note: manual ? pickR(['ملصق الرمز تالف', 'الكاميرا لا تعمل', 'QR label missing']) : null });
      if (r.building_code === 'AZB') Object.assign(r, { arrival_lat: 23.5893 + (R() - 0.5) * 0.0012, arrival_lng: 58.3891 + (R() - 0.5) * 0.0012, arrival_acc: 8 + R() * 25 });
      pushEv(r.id, arr, techId, manual ? 'arrived_manual' : 'arrived_qr', r.arrival_note);
      if (team === 'hm' && R() < p.esc + (escBoost[r.issue_type] || 0)) {
        const end = arr + (10 + R() * 30) * 60000; if (end > upTo) return 'onsite';
        const note = pickR(ESC);
        r.legs.push(legNow(r, 'escalated', note, end));
        pushEv(r.id, end, techId, 'to_ops', note);
        backToQueue(r, end, 'ops');
        return visit(r, opts.ops(), end, upTo, opts);
      }
      let fin = arr + r.target_work * p.w * (0.3 + R() * 1.0) * 60000;
      if (WAIT_PARTS[r.issue_type] && R() < 0.14) {
        const hold = arr + (20 + R() * 40) * 60000, wait = (4 + R() * 60) * 3600e3;
        r.hold_parts = WAIT_PARTS[r.issue_type];
        pushEv(r.id, hold, techId, 'hold_parts', partsTxt(r.hold_parts));
        if (hold + wait > upTo) { Object.assign(r, { hold_kind: 'parts', hold_at: iso(hold), hold_note: 'طلب من المورد', hold_eta: iso(hold + wait + 864e5) }); return 'hold'; }
        r.paused_work += Math.round(wait / 1000); pushEv(r.id, hold + wait, techId, 'resumed_qr'); fin += wait;
      }
      if (fin > upTo) return 'onsite';
      const parts = r.hold_parts ? r.hold_parts : PARTS[r.issue_type] && R() < 0.75 ? pickR(PARTS[r.issue_type]) : [];
      Object.assign(r, { status: 'finished', finished_at: iso(fin), photo_after: PH_AFTER, tech_note: pickR(NOTE[r.issue_type] || NOTE.other), parts: clone(parts) });
      pushEv(r.id, fin, techId, 'finished', r.tech_note);
      const sig = fin + (5 + R() * 80) * 60000; if (sig > upTo) return 'finished';
      if (R() < 0.03) { Object.assign(r, { status: 'closed', closed_at: iso(sig), close_method: 'manual', close_note: 'تعذّر الوصول للمستأجر للتوقيع' }); pushEv(r.id, sig, 's-sup', 'closed_manual', r.close_note); return 'closed'; }
      const onsite = R() < p.on || r.unit_kind === 'common';
      const rating = Math.max(1, Math.min(5, Math.round(p.r + (R() - 0.5) * 1.8)));
      Object.assign(r, { status: 'closed', signature: SIGS[Math.floor(R() * SIGS.length)], signer_name: onsite ? (r.unit_kind === 'common' ? 'حارس المبنى' : (r.contact_name || 'صاحب الشقة')) : null, signoff_method: onsite ? 'onsite' : 'tenant', rating, rating_comment: R() < 0.3 ? pickR(COMMENTS) : null, signed_at: iso(sig), closed_at: iso(sig), close_method: 'signed' });
      pushEv(r.id, sig, onsite ? techId : null, onsite ? 'signed_onsite' : 'signed_tenant', onsite ? r.signer_name : null);
      return 'closed';
    };
    const opts = { ops: () => wpick(opsW) };
    const play = (r, upTo) => {
      const c = D(r.created_at).getTime();
      pushEv(r.id, c, r.source !== 'qr' ? 's-sup' : null, r.source !== 'qr' ? 'logged' : 'submitted', r.source !== 'qr' ? r.source : null);
      return visit(r, r.stage === 'hm' ? HM[r.building_code] : opts.ops(), c, upTo, opts);
    };
    const hist = [], used = new Set();
    for (let i = 0; i < 96; i++) {
      const day = 1 + Math.floor(R() * 34), created = midnight(nowMs - day * 864e5) + (7 * 60 + R() * 15 * 60) * 60000;
      const code = wpick(bldW), bunits = units.filter(u => u.building_code === code);
      const common = R() < 0.18 || !bunits.some(u => u.kind === 'flat');
      const pool = bunits.filter(u => (u.kind === 'common') === common).length ? bunits.filter(u => (u.kind === 'common') === common) : bunits;
      let u, issue, tries = 0;
      do { u = pickR(pool); issue = wpick(u.kind === 'common' ? commonW : flatW); tries++; } while (used.has(u.id + '|' + issue) && tries < 25);
      used.add(u.id + '|' + issue);
      const r = mk(u, issue, created);
      play(r, nowMs - 6 * 3600e3);
      hist.push(r);
    }
    // two repeat faults after the slowest people's jobs
    hist.filter(r => r.status === 'closed' && ['s-t3', 's-h3'].includes(r.technician_id) && D(r.closed_at) < nowMs - 14 * 864e5).slice(0, 2).forEach(r => {
      const u = units.find(x => x.id === r.unit_id), again = mk(u, r.issue_type, D(r.closed_at).getTime() + (3 + R() * 6) * 864e5);
      play(again, nowMs - 6 * 3600e3); hist.push(again);
    });
    // two cancelled duplicates, cancelled by the supervisor before giving them out
    hist.slice(5, 7).forEach(r => { const d = mk(units.find(x => x.id === r.unit_id), r.issue_type, D(r.created_at).getTime() + 9 * 60000); pushEv(d.id, D(d.created_at), null, 'submitted'); Object.assign(d, { status: 'cancelled', cancelled_at: iso(D(d.created_at).getTime() + 6 * 60000), cancel_note: 'طلب مكرر' }); pushEv(d.id, D(d.cancelled_at), 's-sup', 'cancelled', d.cancel_note); hist.push(d); });
    // the two years before that, lighter: more AC faults in summer, heaters in winter, and a few flats
    // whose problem keeps coming back, so the flats report has months and years to compare
    quiet = true;
    const thisY = new Date(nowMs + OFFSET).getUTCFullYear(), startMs = Date.UTC(thisY - 1, 0, 1) - OFFSET, endMs = nowMs - 36 * 864e5;
    const hot = [['AZB', 'Flat 21', 'ac', 0.5], ['SAY', 'Flat 102', 'water_leak', 0.32], ['BSH', 'Flat 3', 'heater', 0.28], ['MWL', 'Flat 21', 'ac', 0.3]];
    const arch = [];
    const old = (u, issue, created) => { const r = mk(u, issue, created); r.photo_before = null; r.description = String(r.description).slice(0, 60); play(r, nowMs - 6 * 864e5); Object.assign(r, { photo_after: null, signature: null }); arch.push(r); };
    for (let ms = startMs; ms < endMs; ms += 864e5) {
      const mo = new Date(ms + OFFSET).getUTCMonth(), summer = mo >= 4 && mo <= 8, winter = mo === 11 || mo <= 1;
      const n = Math.floor(0.55 + R() * (summer ? 1.5 : 1.1));
      for (let i = 0; i < n; i++) {
        const code = wpick(bldW), bunits = units.filter(u => u.building_code === code);
        const u = pickR(R() < 0.18 ? bunits.filter(x => x.kind === 'common').concat(bunits).slice(0, 3) : bunits.filter(x => x.kind === 'flat').length ? bunits.filter(x => x.kind === 'flat') : bunits);
        const w = Object.assign({}, u.kind === 'common' ? commonW : flatW);
        if (w.ac) w.ac *= summer ? 2.6 : 0.6; if (w.heater) w.heater *= winter ? 2.2 : 0.5;
        old(u, wpick(w), ms + (7 * 60 + R() * 14 * 60) * 60000);
      }
      if (new Date(ms + OFFSET).getUTCDate() === 10) hot.forEach(([code, label, issue, pr]) => {
        const u = units.find(x => x.building_code === code && x.label_en === label); if (!u) return;
        const season = issue === 'ac' ? (summer ? 1.8 : 0.4) : issue === 'heater' ? (winter ? 1.8 : 0.5) : 1;
        if (R() < pr * season) old(u, issue, ms + (R() * 18 * 864e5) + (8 * 60 + R() * 10 * 60) * 60000);
      });
    }
    hist.push(...arch.filter(r => D(r.created_at).getTime() < endMs));
    quiet = false;
    // what is happening right now
    const at = (code, label, issue, mins) => { const u = units.find(x => x.building_code === code && x.label_en === label) || units.find(x => x.building_code === code); return mk(u, issue, nowMs - mins * 60000); };
    const ago = mins => nowMs - mins * 60000, m = mins => iso(ago(mins));
    const live = [];
    // waiting for the supervisor: just reported, past its target, declined, and asked for the operations room
    const q1 = at('AZB', 'Flat 32', 'water_leak', 6); live.push(q1);
    const q2 = at('HO', 'First floor', 'lights', 36); live.push(q2);
    const q3 = at('BSH', 'Flat 1', 'ac', 25); give(q3, 's-h4', ago(19)); q3.legs = [legNow(q3, 'declined', 'أنا مع شركة المصاعد في مبنى آخر حتى الواحدة', ago(4))]; backToQueue(q3, ago(4)); live.push(q3);
    const say = at('SAY', 'Flat 102', 'no_power', 52); give(say, 's-h2', ago(49)); Object.assign(say, { status: 'onsite', accepted_at: m(47), accept_method: 'self', arrived_at: m(36), arrival_method: 'qr' });
    say.legs = [legNow(say, 'escalated', 'العطل في لوحة الكهرباء الرئيسية للشقة، يحتاج فني كهرباء', ago(3))]; backToQueue(say, ago(3), 'ops'); live.push(say);
    // given out, waiting for the person to accept
    const azc = at('AZB', 'Common area', 'drain_overflow', 15); give(azc, 's-t4', ago(7), 'الانسداد قريب من غرفة الكهرباء، ابدأ بالتصريف'); live.push(azc);
    // in hand
    const f44 = at('AZB', 'Flat 44', 'lights', 70); give(f44, 's-h1', ago(67)); Object.assign(f44, { status: 'onsite', accepted_at: m(64), accept_method: 'self', arrived_at: m(55), arrival_method: 'qr' }); live.push(f44);
    const f23 = at('AZB', 'Flat 23', 'ac', 38); give(f23, 's-h1', ago(35)); Object.assign(f23, { status: 'accepted', accepted_at: m(33), accept_method: 'self', hold_kind: 'busy', hold_at: m(33), hold_ref: f44.id }); live.push(f23);
    const mwl = at('MWL', 'Flat 21', 'ac', 150); give(mwl, 's-h3', ago(141)); Object.assign(mwl, { status: 'onsite', accepted_at: m(122), accept_method: 'self', arrived_at: m(95), arrival_method: 'manual', arrival_note: 'ملصق الرمز تالف' });
    mwl.legs = [legNow(mwl, 'escalated', 'الكمبروسر لا يعمل، يحتاج فني تكييف', ago(70))]; backToQueue(mwl, ago(70), 'ops');
    give(mwl, 's-t1', ago(64), 'الهاندي مان فحصه: الكمبروسر'); Object.assign(mwl, { status: 'accepted', accepted_at: m(58), accept_method: 'self' }); live.push(mwl);
    const bsh = at('BSH', 'Flat 3', 'heater', 26 * 60); give(bsh, 's-h4', ago(26 * 60 - 7));
    Object.assign(bsh, { status: 'onsite', accepted_at: m(26 * 60 - 20), accept_method: 'self', arrived_at: m(26 * 60 - 35), arrival_method: 'qr', hold_kind: 'parts', hold_at: m(25 * 60), hold_note: 'السخان تالف بالكامل، طُلب سخان جديد من المورد', hold_parts: [{ n: 'سخان 80 لتر', q: 1 }, { n: 'صمام أمان', q: 1 }], hold_eta: iso(midnight(nowMs + 864e5) + 10 * 3600e3) }); live.push(bsh);
    const scc = at('SCC', 'Shop 12', 'water_leak', 50); give(scc, 's-t2', ago(48)); Object.assign(scc, { status: 'onsite', accepted_at: m(46), accept_method: 'self', arrived_at: m(35), arrival_method: 'qr' }); live.push(scc);
    const f13 = at('AZB', 'Flat 13', 'heater', 300); give(f13, 's-h1', ago(296)); Object.assign(f13, { status: 'finished', accepted_at: m(290), accept_method: 'self', arrived_at: m(270), arrival_method: 'qr', finished_at: m(150), photo_after: PH_AFTER, tech_note: 'الثرموستات تالف، تم تغييره وتجربة التسخين', parts: [{ n: 'ثرموستات سخان', q: 1 }] }); live.push(f13);
    const obts = at('OBTS', 'Floor 5', 'ac', 40); give(obts, 's-t3', ago(38)); Object.assign(obts, { status: 'onsite', accepted_at: m(36), accept_method: 'self', arrived_at: m(25), arrival_method: 'qr' }); live.push(obts);
    const hoq = at('HO', 'Common area', 'door_lock', 20); give(hoq, 's-t3', ago(18)); Object.assign(hoq, { status: 'accepted', accepted_at: m(16), accept_method: 'self', origin: 'OBTS', target_arrive: tgA('HO', hoq.priority, 'ops', 'OBTS'), hold_kind: 'busy', hold_at: m(16), hold_ref: obts.id }); live.push(hoq);
    live.forEach(x => {
      pushEv(x.id, D(x.created_at), null, 'submitted');
      (x.legs || []).forEach(l => {
        pushEv(x.id, D(l.offered_at), 's-sup', 'assigned', [l.name, l.assign_note].filter(Boolean).join(' · '));
        if (l.accepted_at) pushEv(x.id, D(l.accepted_at), l.staff_id, 'accepted');
        if (l.arrived_at) pushEv(x.id, D(l.arrived_at), l.staff_id, l.arrival_method === 'manual' ? 'arrived_manual' : 'arrived_qr', l.arrival_method === 'manual' ? 'ملصق الرمز تالف' : null);
        if (l.outcome === 'escalated' || l.outcome === 'declined') pushEv(x.id, D(l.ended_at), l.staff_id, l.outcome === 'escalated' ? 'to_ops' : 'declined', l.note);
      });
      if (x.offered_at) pushEv(x.id, D(x.offered_at), 's-sup', 'assigned', [sname(x.technician_id), x.assign_note].filter(Boolean).join(' · '));
      if (x.accepted_at) pushEv(x.id, D(x.accepted_at), x.technician_id, 'accepted');
      if (x.hold_kind === 'busy') pushEv(x.id, D(x.hold_at) + 1000, x.technician_id, 'hold_busy', '#?');
      if (x.arrived_at) pushEv(x.id, D(x.arrived_at), x.technician_id, x.arrival_method === 'manual' ? 'arrived_manual' : 'arrived_qr', x.arrival_note || null);
      if (x.hold_kind === 'parts') pushEv(x.id, D(x.hold_at), x.technician_id, 'hold_parts', x.hold_note + ' · ' + partsTxt(x.hold_parts));
      if (x.finished_at) pushEv(x.id, D(x.finished_at), x.technician_id, 'finished', x.tech_note);
    });
    // the five-minute reminder already went out for the one waiting past its target
    q2.escalated_at = iso(D(q2.created_at) + (q2.target_dispatch + 2) * 60000); pushEv(q2.id, D(q2.escalated_at), null, 'late_dispatch');
    db0.requests = hist.concat(live).sort((a, b) => D(a.created_at) - D(b.created_at));
    db0.requests.forEach((x, i) => { x.no = 1001 + i; });
    db0.events.forEach(e => { if (e.ev === 'hold_busy' && e.note === '#?') { const r = db0.requests.find(x => x.id === e.request_id), b = r && db0.requests.find(x => x.id === r.hold_ref); e.note = b ? '#' + b.no : null; } });
    db0.seq.no = 1000 + db0.requests.length;
    const wu = units.find(x => x.id === f13.unit_id);
    store.set(P + 'mine', [{ id: f13.id, code: f13.tracking_code, no: f13.no, token: wu.token, at: f13.created_at }]);
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
    loginAs(id) { load(); const s = db.staff.find(x => x.id === id) || db.staff[0]; const res = session(s); save(); return res; },
    assignee(rid) { load(); const r = db.requests.find(x => x.id === rid); return (r && r.technician_id) || 's-t1'; }
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
  if (LIVE && !EMB && PUSH.supported()) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.rasd === 'go' && e.data.url) location.href = e.data.url; });
  }
  setInterval(tick, 1000);
  render();
  if (LIVE && S.session) rpc('staff_me', { p_token: S.session.token }).then(me => { if (me && S.session) { S.session.me = me; store.set(P + 'session', S.session); } }).catch(e => { if (e.message === 'auth_required') signOut(true); });
}
boot();
})();
