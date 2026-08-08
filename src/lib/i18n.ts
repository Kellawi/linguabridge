import type { Lang } from "@/lib/language";

/**
 * UI string dictionary.
 *
 * Both languages are maintained by hand rather than machine-translated at
 * runtime: interface chrome must be stable, instant, and identical on every
 * load. The AI layer is reserved for *user content* (profiles, briefs,
 * proposals, chat), which is where the language barrier documented in the
 * thesis actually bites.
 */

export const dict = {
  // --- chrome -------------------------------------------------------------
  appName: { ar: "لينجوا بريدج", en: "LinguaBridge" },
  tagline: {
    ar: "منصّة عمل حر ثنائية اللغة بمساعدة الذكاء الاصطناعي",
    en: "An AI-assisted bilingual freelancing platform",
  },
  nav_dashboard: { ar: "الرئيسية", en: "Dashboard" },
  nav_jobs: { ar: "المشاريع", en: "Jobs" },
  nav_talent: { ar: "المستقلّون", en: "Talent" },
  nav_profile: { ar: "ملفي الشخصي", en: "My profile" },
  nav_messages: { ar: "المحادثات", en: "Messages" },
  nav_postJob: { ar: "انشر مشروعاً", en: "Post a job" },
  signIn: { ar: "تسجيل الدخول", en: "Sign in" },
  signUp: { ar: "إنشاء حساب", en: "Create account" },
  signOut: { ar: "تسجيل الخروج", en: "Sign out" },
  language: { ar: "اللغة", en: "Language" },

  // --- generic ------------------------------------------------------------
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  back: { ar: "رجوع", en: "Back" },
  loading: { ar: "جارٍ التحميل…", en: "Loading…" },
  working: { ar: "جارٍ العمل…", en: "Working…" },
  optional: { ar: "اختياري", en: "optional" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  fullName: { ar: "الاسم الكامل", en: "Full name" },
  city: { ar: "المدينة", en: "City" },
  company: { ar: "الشركة", en: "Company" },
  role: { ar: "نوع الحساب", en: "Account type" },
  employer: { ar: "صاحب عمل", en: "Employer" },
  freelancer: { ar: "مستقل", en: "Freelancer" },
  budget: { ar: "الميزانية", en: "Budget" },
  deadline: { ar: "الموعد النهائي", en: "Deadline" },
  skills: { ar: "المهارات", en: "Skills" },
  deliverables: { ar: "المُخرجات", en: "Deliverables" },
  showOriginal: { ar: "إظهار النص الأصلي", en: "Show original" },
  hideOriginal: { ar: "إخفاء النص الأصلي", en: "Hide original" },

  // --- AI transparency (design principle 3) --------------------------------
  aiGenerated: { ar: "من إنتاج الذكاء الاصطناعي — راجعه قبل الاعتماد", en: "AI-generated — review before use" },
  aiDraftNote: {
    ar: "هذه مسوّدة. أنت المؤلف: عدّل أي شيء قبل النشر.",
    en: "This is a draft. You are the author — edit anything before publishing.",
  },
  aiMockNotice: {
    ar: "الوضع التجريبي مفعّل: لم يُضبط مفتاح مزوّد ذكاء اصطناعي، لذا المخرجات ثابتة وتوضيحية فقط.",
    en: "Mock mode: no AI provider key is configured, so output is fixed placeholder text.",
  },
  aiBackupNotice: {
    ar: "تعذّر الوصول إلى المزوّد الأساسي، فاستُخدم المزوّد الاحتياطي.",
    en: "The primary provider was unavailable, so the backup provider was used.",
  },
  poweredBy: { ar: "المزوّد", en: "Provider" },

  // --- landing ------------------------------------------------------------
  heroTitle: {
    ar: "اللغة يجب ألّا تكون سبب توقّف محترف ماهر عن العمل",
    en: "Language should never be the reason a skilled professional cannot work",
  },
  heroBody: {
    ar: "اكتب ملفك ومقترحاتك ورسائلك بالعربية. يتولّى لينجوا بريدج تقديمها بإنجليزية مهنية للعملاء الدوليين — وتبقى أنت صاحب القرار في كل كلمة.",
    en: "Write your profile, proposals, and messages in Arabic. LinguaBridge presents them to international clients in professional English — and you approve every word.",
  },
  heroCta: { ar: "ابدأ الآن", en: "Get started" },
  heroSecondary: { ar: "استعرض المشاريع", en: "Browse jobs" },

  // --- auth ---------------------------------------------------------------
  signInTitle: { ar: "تسجيل الدخول إلى حسابك", en: "Sign in to your account" },
  signUpTitle: { ar: "أنشئ حسابك", en: "Create your account" },
  noAccount: { ar: "لا تملك حساباً؟", en: "No account yet?" },
  haveAccount: { ar: "لديك حساب بالفعل؟", en: "Already have an account?" },
  demoAccounts: { ar: "حسابات تجريبية", en: "Demo accounts" },
  demoAccountsHint: {
    ar: "اضغط على أي حساب لتعبئة بيانات الدخول تلقائياً.",
    en: "Click any account to fill the sign-in form.",
  },
  preferredLang: { ar: "لغتك المفضّلة", en: "Your preferred language" },

  // --- profile (§4.3.1) ---------------------------------------------------
  profileTitle: { ar: "ملفك الشخصي ثنائي اللغة", en: "Your bilingual profile" },
  profileIntro: {
    ar: "اكتب عن نفسك وعن خبرتك بالعربية بحرّية. سيولّد النظام نسخة إنجليزية احترافية، ويستخرج مهاراتك، ويوحّد صيغة سعرك.",
    en: "Describe yourself and your experience freely in Arabic. The system will produce a professional English version, extract your skills, and normalise your rate.",
  },
  profileRawLabel: { ar: "من أنت؟ وما الذي تجيده؟", en: "Who are you, and what do you do well?" },
  profileRawPlaceholder: {
    ar: "مثال: مهندس برمجيات، خبرة أربع سنوات في بناء مواقع بـ React و Node، اشتغلت على أنظمة مخزون لشركات صغيرة، سعري حوالي ١٥ دولار بالساعة…",
    en: "Example: Software engineer, four years building web apps with React and Node, worked on inventory systems for small companies, my rate is around $15/hour…",
  },
  profileRateLabel: { ar: "سعرك (بأي صيغة)", en: "Your rate (any format)" },
  profileGenerate: { ar: "أنشئ الملف الشخصي", en: "Build my profile" },
  profileRegenerate: { ar: "أعد الإنشاء", en: "Regenerate" },
  profilePublish: { ar: "احفظ وانشر", en: "Save and publish" },
  profileSaved: { ar: "تم حفظ ملفك الشخصي.", en: "Your profile has been saved." },
  headline: { ar: "العنوان المهني", en: "Professional headline" },
  bio: { ar: "نبذة عنك", en: "About you" },
  rate: { ar: "السعر", en: "Rate" },
  perHour: { ar: "بالساعة", en: "per hour" },
  perDay: { ar: "باليوم", en: "per day" },
  perProject: { ar: "للمشروع", en: "per project" },

  // --- jobs (§4.3.2) ------------------------------------------------------
  jobsTitle: { ar: "المشاريع المتاحة", en: "Open jobs" },
  jobsEmpty: { ar: "لا توجد مشاريع منشورة بعد.", en: "No jobs have been posted yet." },
  postJobTitle: { ar: "انشر مشروعاً", en: "Post a job" },
  postJobIntro: {
    ar: "اشرح المشروع بلغتك. سيحوّله النظام إلى وصف منظّم بالعربية والإنجليزية، وسينبّهك إلى ما ينقصه قبل النشر.",
    en: "Describe the project in your own language. The system turns it into a structured brief in both Arabic and English, and flags what is missing before you publish.",
  },
  postJobRawLabel: { ar: "صف المشروع", en: "Describe the project" },
  postJobRawPlaceholder: {
    ar: "مثال: نحتاج مطوّر لبناء لوحة تحكم لمتجرنا الإلكتروني، تدعم العربية والإنجليزية، وتتصل بواجهة برمجة جاهزة عندنا…",
    en: "Example: We need a developer to build an admin dashboard for our online store, supporting Arabic and English, connecting to our existing API…",
  },
  generateBrief: { ar: "أنشئ الوصف ثنائي اللغة", en: "Generate bilingual brief" },
  publishJob: { ar: "انشر المشروع", en: "Publish job" },
  completeness: { ar: "اكتمال الوصف", en: "Brief completeness" },
  missingInfo: { ar: "معلومات ناقصة", en: "Missing information" },
  checkBrief: { ar: "افحص الاكتمال", en: "Check completeness" },
  proposalsReceived: { ar: "العروض المستلمة", en: "Proposals received" },
  postedBy: { ar: "نُشر بواسطة", en: "Posted by" },
  viewJob: { ar: "عرض المشروع", en: "View job" },

  // --- proposals (§4.3.4) -------------------------------------------------
  applyTitle: { ar: "قدّم عرضك", en: "Write your proposal" },
  applyIntro: {
    ar: "أجب عن الأسئلة الخمسة بالعربية. سيصيغ النظام منها عرضاً إنجليزياً احترافياً تراجعه وتعدّله قبل الإرسال.",
    en: "Answer the five questions in your own language. The system assembles them into a professional English proposal that you review and edit before sending.",
  },
  q_understanding: { ar: "١. ما فهمك للمشروع؟", en: "1. What is your understanding of the project?" },
  q_approach: { ar: "٢. كيف ستنفّذه؟", en: "2. How would you approach it?" },
  q_timeline: { ar: "٣. كم سيستغرق؟", en: "3. How long will it take?" },
  q_pricing: { ar: "٤. ما سعرك المقترح؟", en: "4. What is your proposed price?" },
  q_experience: { ar: "٥. ما خبرتك ذات الصلة؟", en: "5. What relevant experience do you have?" },
  buildProposal: { ar: "اصغ العرض", en: "Build my proposal" },
  submitProposal: { ar: "أرسل العرض", en: "Submit proposal" },
  proposalSubmitted: { ar: "تم إرسال عرضك.", en: "Your proposal has been submitted." },
  alreadyApplied: { ar: "لقد قدّمت عرضاً على هذا المشروع.", en: "You have already applied to this job." },
  acceptProposal: { ar: "اقبل العرض وابدأ المحادثة", en: "Accept and start conversation" },
  proposalAccepted: { ar: "مقبول", en: "Accepted" },

  // --- workspace (§4.3.5) -------------------------------------------------
  messagesTitle: { ar: "المحادثات", en: "Messages" },
  messagesEmpty: { ar: "لا توجد محادثات بعد.", en: "No conversations yet." },
  messagePlaceholder: { ar: "اكتب رسالتك بلغتك…", en: "Write your message in your own language…" },
  send: { ar: "إرسال", en: "Send" },
  glossary: { ar: "مسرد المصطلحات", en: "Project glossary" },
  glossaryIntro: {
    ar: "المصطلحات هنا تُستخدم في كل ترجمة لاحقة داخل هذه المحادثة، ليبقى المعنى ثابتاً.",
    en: "Terms here are applied to every later translation in this conversation, so terminology stays consistent.",
  },
  addTerm: { ar: "أضف مصطلحاً", en: "Add term" },
  termEn: { ar: "المصطلح بالإنجليزية", en: "English term" },
  termAr: { ar: "المصطلح بالعربية", en: "Arabic term" },
  translation: { ar: "الترجمة", en: "Translation" },
  original: { ar: "الأصل", en: "Original" },

  // --- dashboard ----------------------------------------------------------
  welcome: { ar: "أهلاً", en: "Welcome" },
  yourJobs: { ar: "مشاريعك", en: "Your jobs" },
  yourProposals: { ar: "عروضك", en: "Your proposals" },
  profileIncomplete: {
    ar: "ملفك الشخصي غير مكتمل. أكمله لتظهر لأصحاب العمل.",
    en: "Your profile is incomplete. Finish it so employers can find you.",
  },
  completeProfile: { ar: "أكمل ملفك", en: "Complete your profile" },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Lang): string {
  return dict[key][lang];
}
