/**
 * Seeds the demonstration dataset: 1 employer, 3 freelancers, 2 job briefs,
 * 1 proposal, and 1 conversation with a shared glossary.
 *
 *   npm run db:seed
 *
 * Safe to re-run: every insert is an upsert keyed on a natural unique column.
 *
 * The credentials below are DEMONSTRATION credentials. They are published in
 * README.md on purpose so that anyone can explore the platform. They protect
 * nothing real. Never reuse these passwords for a real account, and never
 * seed this dataset into a deployment that holds genuine user data.
 */
import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const DEMO_PASSWORD_EMPLOYER = "Employer#2026";
const DEMO_PASSWORD_FREELANCER = "Freelance#2026";

const sql = postgres(process.env.DATABASE_URL ?? "", {
  max: 1,
  prepare: false,
  onnotice: () => {},
});

async function upsertUser(u: {
  email: string;
  password: string;
  role: "employer" | "freelancer";
  fullName: string;
  company?: string | null;
  city: string;
  preferredLang: "ar" | "en";
}): Promise<string> {
  const hash = await bcrypt.hash(u.password, 10);
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO users (email, password_hash, role, full_name, company, city, preferred_lang)
    VALUES (${u.email}, ${hash}, ${u.role}, ${u.fullName},
            ${u.company ?? null}, ${u.city}, ${u.preferredLang})
    ON CONFLICT (email) DO UPDATE SET
      password_hash  = EXCLUDED.password_hash,
      role           = EXCLUDED.role,
      full_name      = EXCLUDED.full_name,
      company        = EXCLUDED.company,
      city           = EXCLUDED.city,
      preferred_lang = EXCLUDED.preferred_lang
    RETURNING id
  `;
  return rows[0].id;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("\n  DATABASE_URL is not set. Copy .env.example to .env first.\n");
    process.exit(1);
  }

  // ---------------------------------------------------------------------
  // Employer
  // ---------------------------------------------------------------------
  const employerId = await upsertUser({
    email: "employer@linguabridge.demo",
    password: DEMO_PASSWORD_EMPLOYER,
    role: "employer",
    fullName: "Layla Mansour",
    company: "Nawras Digital",
    city: "Amman",
    preferredLang: "en",
  });

  // ---------------------------------------------------------------------
  // Freelancers — mirroring the survey cohort of thesis §5.1: software,
  // AI and cybersecurity engineering across Zarqa, Amman and Irbid.
  // ---------------------------------------------------------------------
  const omarId = await upsertUser({
    email: "omar@linguabridge.demo",
    password: DEMO_PASSWORD_FREELANCER,
    role: "freelancer",
    fullName: "Omar Al-Khatib",
    city: "Zarqa",
    preferredLang: "ar",
  });

  const hibaId = await upsertUser({
    email: "hiba@linguabridge.demo",
    password: DEMO_PASSWORD_FREELANCER,
    role: "freelancer",
    fullName: "Hiba Nasser",
    city: "Amman",
    preferredLang: "ar",
  });

  const yousefId = await upsertUser({
    email: "yousef@linguabridge.demo",
    password: DEMO_PASSWORD_FREELANCER,
    role: "freelancer",
    fullName: "Yousef Darwish",
    city: "Irbid",
    preferredLang: "ar",
  });

  const profiles = [
    {
      userId: omarId,
      headline_ar: "مهندس برمجيات متكامل — React و Node.js و PostgreSQL",
      headline_en: "Full-Stack Software Engineer — React, Node.js, PostgreSQL",
      bio_ar:
        "مهندس برمجيات بخبرة أربع سنوات في بناء تطبيقات ويب متكاملة. عملت على أنظمة إدارة المخزون ولوحات تحكم إدارية لشركات صغيرة ومتوسطة في الأردن.\n\nأركّز على كتابة كود واضح وقابل للصيانة، وعلى تصميم واجهات تدعم العربية والإنجليزية معاً مع ضبط اتجاه النص. لديّ خبرة عملية في تحسين أداء قواعد البيانات وتقليل زمن الاستجابة.",
      bio_en:
        "Software engineer with four years of experience building end-to-end web applications. I have delivered inventory-management systems and administrative dashboards for small and medium businesses in Jordan.\n\nI focus on clear, maintainable code and on interfaces that support Arabic and English equally, including correct text-direction handling. I have hands-on experience optimising database performance and reducing response times.",
      skills: ["React", "Node.js", "PostgreSQL", "TypeScript", "REST APIs", "Docker", "Git"],
      rate_amount: 15,
      rate_currency: "USD",
      rate_unit: "hour",
    },
    {
      userId: hibaId,
      headline_ar: "مهندسة ذكاء اصطناعي — معالجة اللغة العربية الطبيعية",
      headline_en: "AI Engineer — Arabic Natural Language Processing",
      bio_ar:
        "مهندسة ذكاء اصطناعي متخصصة في معالجة اللغة العربية الطبيعية. بنيت نماذج لتصنيف النصوص وتحليل المشاعر واستخراج الكيانات من نصوص عربية فصحى وعامية.\n\nأعمل عادةً باستخدام Python و PyTorch و Hugging Face، ولديّ خبرة في ضبط النماذج متعددة اللغات على بيانات عربية محدودة الحجم. أهتم بتوثيق حدود النموذج بوضوح بدل المبالغة في نتائجه.",
      bio_en:
        "AI engineer specialising in Arabic natural language processing. I have built models for text classification, sentiment analysis, and entity extraction across both Modern Standard and colloquial Arabic.\n\nI work primarily with Python, PyTorch, and Hugging Face, and I have experience fine-tuning multilingual models on small Arabic datasets. I document model limitations clearly rather than overstating results.",
      skills: [
        "Python",
        "PyTorch",
        "Natural Language Processing",
        "Hugging Face",
        "Machine Learning",
        "Arabic NLP",
        "FastAPI",
      ],
      rate_amount: 22,
      rate_currency: "USD",
      rate_unit: "hour",
    },
    {
      userId: yousefId,
      headline_ar: "مهندس أمن سيبراني — اختبار الاختراق وتأمين الشبكات",
      headline_en: "Cybersecurity Engineer — Penetration Testing & Network Security",
      bio_ar:
        "مهندس أمن سيبراني بخبرة خمس سنوات في اختبار الاختراق وتقييم الثغرات وتأمين البنية التحتية للشبكات.\n\nنفّذت تقييمات أمنية لتطبيقات ويب وفق منهجية OWASP، وساعدت مؤسسات على الاستعداد لمتطلبات ISO 27001. أقدّم تقارير مفصّلة تشرح المخاطر بلغة يفهمها فريق الإدارة، لا فريق الأمن وحده.",
      bio_en:
        "Cybersecurity engineer with five years of experience in penetration testing, vulnerability assessment, and securing network infrastructure.\n\nI have carried out security assessments of web applications following OWASP methodology and helped organisations prepare for ISO 27001 requirements. I write detailed reports that explain risk in language management can act on, not only security teams.",
      skills: [
        "Penetration Testing",
        "OWASP",
        "Network Security",
        "ISO 27001",
        "Vulnerability Assessment",
        "Linux",
        "Python",
      ],
      rate_amount: 20,
      rate_currency: "USD",
      rate_unit: "hour",
    },
  ] as const;

  for (const p of profiles) {
    await sql`
      INSERT INTO freelancer_profiles (
        user_id, headline_ar, headline_en, bio_ar, bio_en, skills,
        rate_amount, rate_currency, rate_unit, source_lang, published, ai_provider
      ) VALUES (
        ${p.userId}, ${p.headline_ar}, ${p.headline_en}, ${p.bio_ar}, ${p.bio_en},
        ${sql.array([...p.skills])}, ${p.rate_amount}, ${p.rate_currency}, ${p.rate_unit},
        'ar', true, null
      )
      ON CONFLICT (user_id) DO UPDATE SET
        headline_ar = EXCLUDED.headline_ar, headline_en = EXCLUDED.headline_en,
        bio_ar = EXCLUDED.bio_ar,           bio_en = EXCLUDED.bio_en,
        skills = EXCLUDED.skills,           rate_amount = EXCLUDED.rate_amount,
        rate_currency = EXCLUDED.rate_currency, rate_unit = EXCLUDED.rate_unit,
        published = true, updated_at = now()
    `;
  }

  // ---------------------------------------------------------------------
  // Job briefs — authored in Arabic, published bilingually
  // ---------------------------------------------------------------------
  const jobSeeds = [
    {
      key: "Arabic-first e-commerce admin dashboard",
      title_ar: "لوحة تحكم لمتجر إلكتروني تدعم العربية والإنجليزية",
      title_en: "Arabic-first e-commerce admin dashboard",
      summary_ar:
        "نبحث عن مطوّر واجهات أمامية لبناء لوحة تحكم إدارية لمتجر إلكتروني يخدم عملاء في الأردن ودول الخليج. يجب أن تدعم اللوحة العربية والإنجليزية بالكامل مع تبديل اتجاه النص تلقائياً.\n\nالمتجر قائم بالفعل وواجهة البرمجة (API) جاهزة وموثّقة. العمل ينحصر في بناء الواجهة الأمامية وربطها بواجهة البرمجة الحالية. نتوقع تصميماً بسيطاً وسريعاً يعمل جيداً على الأجهزة المحمولة.",
      summary_en:
        "We are looking for a front-end developer to build an administrative dashboard for an e-commerce store serving customers in Jordan and the Gulf. The dashboard must fully support Arabic and English with automatic text-direction switching.\n\nThe store already exists and its API is built and documented. The work is limited to building the front end and connecting it to the existing API. We expect a simple, fast design that works well on mobile devices.",
      deliverables_ar: [
        "لوحة تحكم متجاوبة مبنية بـ React مع دعم RTL و LTR",
        "شاشات إدارة المنتجات والطلبات والمخزون",
        "ربط كامل بواجهة البرمجة الحالية",
        "توثيق مختصر لتشغيل المشروع محلياً",
      ],
      deliverables_en: [
        "Responsive React dashboard with RTL and LTR support",
        "Product, order, and inventory management screens",
        "Full integration with the existing API",
        "Brief documentation for running the project locally",
      ],
      skills: ["React", "TypeScript", "REST APIs", "Responsive Design"],
      budget_amount: 1800,
      deadline: "6 weeks from project start",
      completeness: 85,
    },
    {
      key: "Arabic support-ticket classification model",
      title_ar: "نموذج تصنيف تلقائي لتذاكر الدعم الفني باللغة العربية",
      title_en: "Arabic support-ticket classification model",
      summary_ar:
        "لدينا أرشيف يضم نحو اثني عشر ألف تذكرة دعم فني مكتوبة بالعربية الفصحى والعامية الأردنية والشامية. نريد نموذجاً يصنّف التذكرة الواردة تلقائياً إلى واحدة من ست فئات، ويحدد مستوى الأولوية.\n\nالبيانات مصنّفة يدوياً بالفعل وجاهزة للتدريب. نفضّل حلاً يمكن تشغيله على خادم واحد دون الاعتماد على واجهات برمجة خارجية، لأسباب تتعلق بخصوصية بيانات العملاء.",
      summary_en:
        "We hold an archive of roughly twelve thousand support tickets written in Modern Standard Arabic and in Jordanian and Levantine colloquial Arabic. We want a model that automatically classifies an incoming ticket into one of six categories and assigns a priority level.\n\nThe data is already manually labelled and ready for training. We prefer a solution that can run on a single server without depending on external APIs, for reasons of customer data privacy.",
      deliverables_ar: [
        "نموذج مدرَّب مع تقرير يوضح الدقة وحدود الأداء",
        "واجهة برمجة بسيطة لاستقبال التذكرة وإرجاع التصنيف",
        "نص برمجي لإعادة التدريب على بيانات جديدة",
        "توثيق يشرح كيفية النشر على خادم واحد",
      ],
      deliverables_en: [
        "Trained model with a report covering accuracy and performance limits",
        "Simple API that accepts a ticket and returns its classification",
        "Retraining script for new data",
        "Documentation explaining single-server deployment",
      ],
      skills: ["Python", "Natural Language Processing", "Machine Learning", "Arabic NLP"],
      budget_amount: 2500,
      deadline: "8 weeks from project start",
      completeness: 90,
    },
  ] as const;

  const jobIds: string[] = [];
  for (const j of jobSeeds) {
    // title_en is effectively the natural key for the demo dataset; re-running
    // the seed should refresh the row rather than create a duplicate.
    const existing = await sql<Array<{ id: string }>>`
      SELECT id FROM jobs WHERE employer_id = ${employerId} AND title_en = ${j.title_en}
    `;

    if (existing[0]) {
      await sql`
        UPDATE jobs SET
          title_ar = ${j.title_ar}, summary_ar = ${j.summary_ar}, summary_en = ${j.summary_en},
          deliverables_ar = ${sql.json([...j.deliverables_ar])},
          deliverables_en = ${sql.json([...j.deliverables_en])},
          skills = ${sql.array([...j.skills])},
          budget_amount = ${j.budget_amount}, deadline = ${j.deadline},
          completeness = ${j.completeness}, status = 'open'
        WHERE id = ${existing[0].id}
      `;
      jobIds.push(existing[0].id);
    } else {
      const rows = await sql<Array<{ id: string }>>`
        INSERT INTO jobs (
          employer_id, title_ar, title_en, summary_ar, summary_en,
          deliverables_ar, deliverables_en, skills,
          budget_amount, budget_currency, deadline, source_lang, status, completeness
        ) VALUES (
          ${employerId}, ${j.title_ar}, ${j.title_en}, ${j.summary_ar}, ${j.summary_en},
          ${sql.json([...j.deliverables_ar])}, ${sql.json([...j.deliverables_en])},
          ${sql.array([...j.skills])},
          ${j.budget_amount}, 'USD', ${j.deadline}, 'ar', 'open', ${j.completeness}
        )
        RETURNING id
      `;
      jobIds.push(rows[0].id);
    }
  }

  // ---------------------------------------------------------------------
  // One submitted proposal + one conversation, so both roles have something
  // to look at immediately after signing in.
  // ---------------------------------------------------------------------
  await sql`
    INSERT INTO proposals (job_id, freelancer_id, answers, body_en, body_ar, status)
    VALUES (
      ${jobIds[0]}, ${omarId},
      ${sql.json({
        understanding:
          "المطلوب لوحة تحكم إدارية لمتجر قائم، والعمل محصور في الواجهة الأمامية وربطها بواجهة برمجة جاهزة وموثّقة.",
        approach:
          "سأبني الواجهة بـ React مع TypeScript، وأستخدم نظام تصميم بسيط يدعم اتجاهي النص. سأبدأ بشاشة المنتجات ثم الطلبات ثم المخزون.",
        timeline: "خمسة أسابيع: أسبوع للإعداد والتصميم، ثلاثة أسابيع للتنفيذ، أسبوع للمراجعة والتوثيق.",
        pricing: "١٦٠٠ دولار للمشروع كاملاً، مقسّمة على ثلاث دفعات حسب المراحل.",
        experience:
          "بنيت لوحتي تحكم مشابهتين لشركتي تجزئة في عمّان، إحداهما تدعم العربية والإنجليزية مع تبديل الاتجاه.",
      })},
      'The project is an administrative dashboard for an existing store, with the work scoped to the front end and its integration with a documented, ready API.\n\nI would build the interface in React with TypeScript, using a simple design system that supports both text directions from the start rather than retrofitting RTL later. I would sequence the work by screen: products first, then orders, then inventory, so you have something reviewable early.\n\nMy proposed timeline is five weeks: one week for setup and design, three weeks for implementation, and one week for review and documentation. I propose USD 1,600 for the complete project, split into three milestone payments.\n\nI have previously built two comparable dashboards for retail companies in Amman. One of them supported Arabic and English with direction switching, so the specific challenges here are familiar to me.',
      'المشروع لوحة تحكم إدارية لمتجر قائم، والعمل محدد بالواجهة الأمامية وربطها بواجهة برمجة جاهزة وموثّقة.\n\nسأبني الواجهة باستخدام React مع TypeScript، معتمداً نظام تصميم بسيط يدعم اتجاهي النص منذ البداية بدل إضافة دعم RTL لاحقاً. سأرتّب العمل حسب الشاشات: المنتجات أولاً، ثم الطلبات، ثم المخزون، لتتمكنوا من المراجعة مبكراً.\n\nالمدة المقترحة خمسة أسابيع: أسبوع للإعداد والتصميم، وثلاثة أسابيع للتنفيذ، وأسبوع للمراجعة والتوثيق. أقترح ١٦٠٠ دولاراً للمشروع كاملاً على ثلاث دفعات مرتبطة بالمراحل.\n\nسبق أن بنيت لوحتي تحكم مشابهتين لشركتي تجزئة في عمّان، إحداهما تدعم العربية والإنجليزية مع تبديل اتجاه النص، لذا فإن تحديات هذا المشروع مألوفة لديّ.',
      'submitted'
    )
    ON CONFLICT (job_id, freelancer_id) DO NOTHING
  `;

  const convRows = await sql<Array<{ id: string }>>`
    INSERT INTO conversations (job_id, employer_id, freelancer_id)
    VALUES (${jobIds[0]}, ${employerId}, ${omarId})
    ON CONFLICT (job_id, freelancer_id) DO UPDATE SET job_id = EXCLUDED.job_id
    RETURNING id
  `;
  const conversationId = convRows[0].id;

  const existingMessages = await sql<Array<{ count: string }>>`
    SELECT count(*)::text AS count FROM messages WHERE conversation_id = ${conversationId}
  `;

  if (existingMessages[0].count === "0") {
    const thread = [
      {
        sender: employerId,
        body: "Thanks for the proposal — the phased approach by screen works well for us. Before we start, could you confirm whether the five-week timeline assumes the API documentation is complete as-is?",
        source: "en",
        translated:
          "شكراً على العرض — أسلوب التنفيذ المرحلي حسب الشاشات مناسب لنا. قبل أن نبدأ، هل يمكنك تأكيد ما إذا كانت مدة الأسابيع الخمسة تفترض أن توثيق واجهة البرمجة مكتمل كما هو؟",
        target: "ar",
      },
      {
        sender: omarId,
        body: "نعم، التقدير مبني على أن التوثيق الحالي كامل وأن نقاط النهاية تعمل كما هو موصوف. إذا احتجنا تعديلات على واجهة البرمجة أثناء العمل، سأبلغكم فوراً بأثر ذلك على الجدول الزمني قبل تنفيذ أي تغيير.",
        source: "ar",
        translated:
          "Yes — the estimate assumes the current documentation is complete and that the endpoints behave as described. If we find we need API changes during the work, I will tell you immediately what that means for the schedule, before making any change.",
        target: "en",
      },
      {
        sender: employerId,
        body: "Understood, that is a fair assumption. One clarification on scope: the inventory screen needs to show stock across two warehouses, not one. Does that change your estimate?",
        source: "en",
        translated:
          "مفهوم، وهذا افتراض معقول. توضيح واحد بخصوص النطاق: شاشة المخزون يجب أن تعرض المخزون في مستودعين لا مستودع واحد. هل يغيّر ذلك تقديرك؟",
        target: "ar",
      },
    ] as const;

    for (const m of thread) {
      await sql`
        INSERT INTO messages (conversation_id, sender_id, body, source_lang, translated, target_lang, ai_provider)
        VALUES (${conversationId}, ${m.sender}, ${m.body}, ${m.source}, ${m.translated}, ${m.target}, 'seed')
      `;
    }
  }

  // Shared project glossary (thesis §4.3.5) — keeps domain terms consistent.
  const glossary = [
    { en: "inventory", ar: "المخزون" },
    { en: "warehouse", ar: "المستودع" },
    { en: "milestone payment", ar: "دفعة مرحلية" },
    { en: "endpoint", ar: "نقطة نهاية" },
  ];
  for (const term of glossary) {
    await sql`
      INSERT INTO glossary_terms (conversation_id, term_en, term_ar, created_by)
      VALUES (${conversationId}, ${term.en}, ${term.ar}, ${employerId})
      ON CONFLICT (conversation_id, term_en) DO UPDATE SET term_ar = EXCLUDED.term_ar
    `;
  }

  console.log("\nSeed complete.\n");
  console.log("  Employer    employer@linguabridge.demo   " + DEMO_PASSWORD_EMPLOYER);
  console.log("  Freelancer  omar@linguabridge.demo       " + DEMO_PASSWORD_FREELANCER);
  console.log("  Freelancer  hiba@linguabridge.demo       " + DEMO_PASSWORD_FREELANCER);
  console.log("  Freelancer  yousef@linguabridge.demo     " + DEMO_PASSWORD_FREELANCER);
  console.log("\nStart the app with:  npm run dev\n");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
