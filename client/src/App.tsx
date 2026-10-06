import { useMemo, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowUpLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  Clock3,
  Compass,
  FileText,
  Inbox,
  LayoutDashboard,
  Linkedin,
  Mail,
  Menu,
  PenLine,
  Phone,
  Plus,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "./lib/trpc";

const logo = "/brand-logo.png";

const services = [
  {
    slug: "strategy",
    number: "01",
    title: "استراتيجية الأعمال",
    eyebrow: "من الفكرة إلى الاتجاه",
    summary: "نحوّل التشتت إلى قرار واضح: أين تقف، ماذا تبيع، وما الخطوة التي تستحق الاستثمار الآن.",
    body: "جلسة استراتيجية عميقة، تشخيص للسوق والعرض، ثم خارطة طريق عملية قابلة للتنفيذ والقياس. لا نطارد كل فرصة؛ نبني اختياراً يقدر عملك على تحمّله والنمو فوقه.",
    bullets: ["تحديد العرض الأكثر قابلية للنمو", "رسم أولويات 90 يوماً", "مؤشرات قرار يفهمها الفريق"],
    color: "blue",
  },
  {
    slug: "brand",
    number: "02",
    title: "هوية وعرض العلامة",
    eyebrow: "صورة يفهمها السوق",
    summary: "نصوغ قصة العلامة وعرضها بطريقة تجعل العميل المناسب يرى نفسه داخل الحل، لا أمام إعلان آخر.",
    body: "من تموضع العلامة إلى الرسائل والصفحة التعريفية، نربط الشكل بالقرار التجاري. النتيجة ليست شعاراً فقط؛ بل نظاماً يرفع الثقة ويقصر طريق الفهم.",
    bullets: ["تموضع ورسالة واضحة", "نظام رسائل لصفحات البيع", "لغة بصرية متسقة"],
    color: "orange",
  },
  {
    slug: "growth",
    number: "03",
    title: "نظام النمو وجذب العملاء",
    eyebrow: "اهتمام يتحول إلى محادثة",
    summary: "نبني مساراً بسيطاً من المحتوى إلى التواصل، يراكم الثقة ويقيس أين بدأت الفرصة فعلاً.",
    body: "نصمم مسار المحتوى، الدعوات، ونقاط الالتقاط التي تجعل التسويق عادة قابلة للإدارة، لا حملة متقطعة مرتبطة بالحماس.",
    bullets: ["خطة محتوى معرفي", "صفحات تحويل ونماذج طلب", "لوحة متابعة للفرص"],
    color: "dark",
  },
];

const articles = [
  {
    slug: "growth-needs-a-system",
    category: "نمو الأعمال",
    title: "النمو لا يحتاج ضجيجاً أكثر؛ يحتاج نظاماً أوضح",
    excerpt: "حين تتوقف عن مطاردة كل فرصة وتبدأ في بناء مسار يمكن تكراره، يصبح النمو نتيجة مفهومة لا مفاجأة.",
    date: "05 أكتوبر 2026",
    readTime: "4 دقائق",
    tag: "منشور افتتاحي",
  },
  {
    slug: "offer-before-logo",
    category: "العلامة والعرض",
    title: "قبل أن تسأل: كيف يبدو الشعار؟ اسأل: ماذا يفهم العميل؟",
    excerpt: "الهوية القوية لا تكتفي بأن تكون جميلة؛ هي تختصر على العميل مسافة الشك وتوضح لماذا يختارك.",
    date: "28 سبتمبر 2026",
    readTime: "5 دقائق",
    tag: "منشور افتتاحي",
  },
  {
    slug: "the-90-day-decision",
    category: "إدارة",
    title: "قرار الـ90 يوماً: كيف تختار ما لن تفعله؟",
    excerpt: "خطة النمو ليست قائمة أمنيات. هي اتفاق شجاع على ترك بعض الأشياء حتى تعطي الأشياء المهمة فرصة حقيقية.",
    date: "19 سبتمبر 2026",
    readTime: "6 دقائق",
    tag: "منشور افتتاحي",
  },
];

const articleBodies: Record<string, string[]> = {
  "growth-needs-a-system": [
    "كثير من أصحاب الأعمال يصفون مشكلتهم بأنها نقص في العملاء. لكن بعد أول محادثة نكتشف غالباً أن المشكلة ليست في الاهتمام؛ بل في غياب المسار الذي يحوّل الاهتمام إلى قرار.",
    "النظام يبدأ بثلاثة أسئلة: من العميل الذي تستطيع خدمته فعلاً؟ ما المشكلة التي تقدر على شرحها ببساطة؟ وما الدليل الذي يجعل الخطوة التالية آمنة؟ عندما تجتمع هذه الإجابات، يصبح المحتوى امتداداً للفكرة وليس بديلاً عنها.",
    "لا تحتاج أن تنشر أكثر. تحتاج أن تكرر فكرة نافعة بطرق مختلفة، وتربطها بدعوة واضحة، ثم تراجع ما الذي فتح محادثة حقيقية. هذا هو الفرق بين نشاط تسويقي ونظام نمو.",
  ],
  "offer-before-logo": [
    "الهوية ليست طبقة تزيين فوق العمل. هي وعد مختصر يجيب عن سؤال العميل: لماذا هذا الخيار مناسب لي الآن؟ لذلك نبدأ دائماً بالعرض قبل الألوان.",
    "عندما يكون العرض غامضاً، تعجز أفضل هوية عن إنقاذه. أما حين يكون الوعد واضحاً ومحدداً، تصبح الهوية أداة لتقوية الذاكرة والثقة والتميّز.",
    "اسأل نفسك: هل يستطيع شخص خارج فريقك أن يشرح ما تفعله في جملة؟ إن كانت الإجابة لا، فهذه ليست مشكلة تصميم بعد؛ إنها فرصة استراتيجية.",
  ],
  "the-90-day-decision": [
    "الأهداف السنوية مفيدة للرؤية، لكنها بعيدة عن طاولة القرار اليومية. لذلك نحتاج إلى مساحة 90 يوماً نختبر فيها اختياراً واحداً بجدية.",
    "ابدأ بما تريد أن يصبح صحيحاً بعد ثلاثة أشهر، ثم اكتب ما الذي يجب أن يتغير أسبوعياً. الأهم أن تكتب أيضاً ما الذي لن تفعله خلال هذه الفترة.",
    "التركيز لا يعني أن الفرص قليلة؛ يعني أنك تحترم طاقة الفريق بما يكفي كي لا توزعها على كل اتجاه في الوقت نفسه.",
  ],
};

function Shell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const links = [
    ["/", "الرئيسية"],
    ["/services", "الخدمات"],
    ["/articles", "المقالات"],
    ["/about", "عنّا"],
  ];
  const go = (path: string) => {
    setOpen(false);
    setLocation(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="site-shell" dir="rtl">
      <div className="topline"><span>Business Owner / معرفة تتحول إلى حركة</span><span>متاح لمشاريع مختارة في 2026</span></div>
      <header className="site-header">
        <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="فتح القائمة">{open ? <X /> : <Menu />}</button>
        <button className="brand" onClick={() => go("/")} aria-label="العودة إلى الرئيسية">
          <span className="brand-mark"><img src={logo} alt="Business Owner" /></span>
          <span className="brand-type"><strong>Business</strong><small>Owner</small></span>
        </button>
        <nav className={open ? "main-nav open" : "main-nav"}>
          {links.map(([path, label]) => <button key={path} className={location === path ? "active" : ""} onClick={() => go(path)}>{label}</button>)}
        </nav>
        <button className="header-cta" onClick={() => go("/contact")}>ابدأ محادثة <ArrowUpLeft size={16} /></button>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="footer-callout"><span className="section-kicker">هل لديك فكرة تستحق الحركة؟</span><h2>لنحوّلها إلى عرض<br /><em>يفهمه السوق.</em></h2><button className="circle-arrow" onClick={() => go("/contact")}><ArrowUpLeft /></button></div>
        <div className="footer-bottom"><div className="footer-brand"><img src={logo} alt="Business Owner" /><span>Business Owner</span></div><p>معرفة عملية. قرارات أوضح. نمو يتحرك.</p><div className="footer-links"><button onClick={() => go("/articles")}>المقالات</button><button onClick={() => go("/services")}>الخدمات</button><a href="https://www.linkedin.com" target="_blank" rel="noreferrer"><Linkedin size={16} /> LinkedIn</a></div></div>
      </footer>
    </div>
  );
}

function Home() {
  const [, setLocation] = useLocation();
  return <>
    <section className="hero section-wrap">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot" /> استشارات ونمو للأعمال الجادة</div><h1>الفكرة الجيدة<br /><span>تحتاج مالكاً</span><br />يعرف كيف يحرّكها.</h1><p className="hero-lead">نساعد أصحاب الأعمال على تحويل الخبرة إلى عرض واضح، ونظام نمو قابل للإدارة، ومحتوى يبني الثقة قبل أن يطلب البيع.</p><div className="hero-actions"><button className="primary-btn" onClick={() => setLocation("/contact")}>احكِ لنا عن مشروعك <ArrowUpLeft size={18} /></button><button className="text-btn" onClick={() => setLocation("/articles")}>استكشف المعرفة <ArrowLeft size={18} /></button></div></div>
      <div className="hero-visual"><div className="hero-stamp"><img src={logo} alt="Business Owner logo" /></div><div className="hero-note"><span>01 —</span><p>من الوضوح<br />تبدأ الحركة.</p></div><div className="hero-line" /><div className="hero-figure"><span>BO</span><ArrowUpRight size={68} strokeWidth={1.2} /></div></div>
    </section>
    <section className="signal-strip"><div><strong>01</strong><span>وضوح العرض</span></div><div><strong>02</strong><span>ثقة السوق</span></div><div><strong>03</strong><span>نظام النمو</span></div><div className="signal-last"><span>Business Owner</span><ArrowUpLeft size={18} /></div></section>
    <section className="intro section-wrap"><div className="intro-side"><span className="section-kicker">لماذا نحن؟</span><span className="vertical-word">BUSINESS OWNER</span></div><div className="intro-copy"><h2>لا نبيع وصفات جاهزة.<br /><span>نبني قراراً يناسبك.</span></h2><p>كل عمل له سياقه، وطاقته، وتوقيته. دورنا أن نرى الصورة الكبيرة، نرتب الفوضى، ونضع خطوات تستطيع أنت وفريقك مواصلتها بعد انتهاء المشروع.</p><button className="outline-btn" onClick={() => setLocation("/about")}>تعرّف على الطريقة <ChevronLeft size={18} /></button></div></section>
    <section className="services-preview dark-panel"><div className="section-wrap"><div className="section-head light"><div><span className="section-kicker">ما الذي نحرّكه؟</span><h2>ثلاثة مسارات.<br /><em>اختيار واحد واضح.</em></h2></div><button className="round-link" onClick={() => setLocation("/services")}><ArrowUpLeft /></button></div><div className="service-list">{services.map((service) => <button className="service-row" key={service.slug} onClick={() => setLocation(`/services/${service.slug}`)}><span className="service-number">{service.number}</span><span className="service-main"><small>{service.eyebrow}</small><strong>{service.title}</strong></span><span className="service-summary">{service.summary}</span><ArrowUpLeft className="row-arrow" /></button>)}</div></div></section>
    <section className="articles-preview section-wrap"><div className="section-head"><div><span className="section-kicker">من الدفتر</span><h2>أفكار تستحق<br /><em>أن تتحول إلى قرار.</em></h2></div><button className="text-btn" onClick={() => setLocation("/articles")}>كل المقالات <ArrowLeft size={18} /></button></div><div className="article-grid">{articles.map((article, index) => <ArticleCard key={article.slug} article={article} index={index} />)}</div></section>
    <LeadBanner onClick={() => setLocation("/contact")} />
  </>;
}

function ArticleCard({ article, index }: { article: typeof articles[number]; index: number }) {
  const [, setLocation] = useLocation();
  return <button className={`article-card card-${index}`} onClick={() => setLocation(`/articles/${article.slug}`)}><div className="article-visual"><span>{String(index + 1).padStart(2, "0")}</span><ArrowUpLeft /></div><div className="article-meta"><span>{article.category}</span><span>{article.readTime}</span></div><h3>{article.title}</h3><p>{article.excerpt}</p><span className="read-more">اقرأ المقال <ArrowLeft size={15} /></span></button>;
}

function LeadBanner({ onClick }: { onClick: () => void }) { return <section className="lead-banner"><div><span className="section-kicker">الخطوة التالية</span><h2>ما الذي تريد<br /><span>أن يتحرك؟</span></h2></div><div className="lead-right"><p>أرسل لنا سطراً واحداً عن مشروعك. سنعود إليك بسؤال أفضل من عرض عام.</p><button className="primary-btn light-btn" onClick={onClick}>ابدأ من هنا <ArrowUpLeft size={18} /></button></div></section>; }

function ServicesPage() { const [, setLocation] = useLocation(); return <PageIntro kicker="الخدمات" title={<>ما يحتاجه عملك<br /><em>ليتحرك بثقة.</em></>} copy="نبدأ من السؤال الصحيح، ثم نبني ما يساعدك على الإجابة عنه في السوق: عرض، علامة، ومسار نمو قابل للقياس." ><div className="services-detail-list">{services.map((service) => <button className="service-detail" key={service.slug} onClick={() => setLocation(`/services/${service.slug}`)}><span className={`detail-index ${service.color}`}>{service.number}</span><div><span className="section-kicker">{service.eyebrow}</span><h3>{service.title}</h3><p>{service.summary}</p></div><ArrowUpLeft /></button>)}</div><LeadBanner onClick={() => setLocation("/contact")} /></PageIntro>; }

function ServiceDetail({ slug }: { slug: string }) { const service = services.find((item) => item.slug === slug); const [, setLocation] = useLocation(); if (!service) return <NotFound />; return <><section className="detail-hero section-wrap"><button className="back-link" onClick={() => setLocation("/services")}><ArrowRightIcon /> العودة إلى الخدمات</button><div className="detail-hero-grid"><span className={`detail-index giant ${service.color}`}>{service.number}</span><div><span className="section-kicker">{service.eyebrow}</span><h1>{service.title}</h1><p>{service.body}</p><button className="primary-btn" onClick={() => setLocation("/contact")}>لنتحدث عن هذا المسار <ArrowUpLeft size={18} /></button></div></div></section><section className="benefits section-wrap"><span className="section-kicker">ما الذي نخرج به؟</span><div className="benefit-grid">{service.bullets.map((bullet) => <div key={bullet}><Check size={18} /><h3>{bullet}</h3><p>خطوة عملية واضحة، تُبنى على واقع مشروعك وتستطيع مراجعتها مع فريقك.</p></div>)}</div></section><LeadBanner onClick={() => setLocation("/contact")} /></>; }
function ArrowRightIcon() { return <ArrowLeft size={16} />; }

function ArticlesPage() { const [, setLocation] = useLocation(); return <PageIntro kicker="المقالات" title={<>ملاحظات من<br /><em>طاولة العمل.</em></>} copy="معرفة قصيرة وعملية لأصحاب الأعمال الذين يريدون قرارات أهدأ، عروضاً أوضح، ونمواً لا يعتمد على الصدفة."><div className="articles-list">{articles.map((article, index) => <button className="article-row" key={article.slug} onClick={() => setLocation(`/articles/${article.slug}`)}><span className="article-row-number">0{index + 1}</span><div><span className="section-kicker">{article.category}</span><h3>{article.title}</h3><p>{article.excerpt}</p><span className="article-row-meta">{article.date} · {article.readTime}</span></div><ArrowUpLeft /></button>)}</div></PageIntro>; }

function ArticleDetail({ slug }: { slug: string }) { const article = articles.find((item) => item.slug === slug); const [, setLocation] = useLocation(); const paragraphs = articleBodies[slug] ?? []; if (!article) return <NotFound />; return <><section className="article-detail-head section-wrap"><button className="back-link" onClick={() => setLocation("/articles")}><ArrowRightIcon /> العودة إلى المقالات</button><span className="section-kicker">{article.category} · {article.date}</span><h1>{article.title}</h1><p>{article.excerpt}</p><div className="article-detail-meta"><span><Clock3 size={16} /> {article.readTime}</span><span><Linkedin size={16} /> {article.tag}</span></div></section><article className="article-body section-wrap"><div className="article-body-mark">BO</div><div>{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<div className="article-quote">"الوضوح ليس أن تعرف كل الإجابات؛ أن تعرف السؤال الذي يستحق وقتك."</div><button className="primary-btn" onClick={() => setLocation("/contact")}>حوّل الفكرة إلى خطوة <ArrowUpLeft size={18} /></button></div></article></>; }

function AboutPage() { const [, setLocation] = useLocation(); return <PageIntro kicker="عن Business Owner" title={<>نحن نؤمن أن<br /><em>الوضوح ميزة.</em></>} copy="Business Owner مساحة عملية لصاحب العمل: نضع المعرفة في سياقها، ونحوّلها إلى قرارات تقدر على تحريك مشروع حقيقي."><div className="about-manifesto"><div><Sparkles /><h3>فضول عملي</h3><p>نسأل قبل أن نقترح، ونبحث عن السبب قبل أن نجمّل النتيجة.</p></div><div><Target /><h3>تركيز تجاري</h3><p>كل فكرة يجب أن تساعد على قرار أو تقرّب العميل من الثقة.</p></div><div><Compass /><h3>حركة قابلة للاستمرار</h3><p>نترك وراءنا نظاماً تستطيع مواصلته، لا اعتماداً جديداً علينا.</p></div></div><LeadBanner onClick={() => setLocation("/contact")} /></PageIntro>; }

function PageIntro({ kicker, title, copy, children }: { kicker: string; title: React.ReactNode; copy: string; children: React.ReactNode }) { return <><section className="page-intro section-wrap"><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{copy}</p></section><section className="page-content section-wrap">{children}</section></>; }

function ContactPage() { const [sent, setSent] = useState(false); const mutation = trpc.leads.create.useMutation({ onSuccess: (data) => { if (data.persisted) setSent(true); } }); const [form, setForm] = useState({ name: "", email: "", company: "", service: "", message: "" }); const submit = (event: React.FormEvent) => { event.preventDefault(); if (!form.name || !form.email || !form.message) return; mutation.mutate(form); }; if (sent) return <section className="success-state section-wrap"><div className="success-icon"><Check /></div><span className="section-kicker">وصلت الرسالة</span><h1>سنعود إليك<br /><em>بسؤال جيد.</em></h1><p>شكراً يا {form.name || "صاحب الفكرة"}. تم تسجيل طلبك، وسيتم التواصل معك قريباً.</p><Link href="/"><button className="primary-btn">العودة للرئيسية <ArrowUpLeft size={18} /></button></Link></section>; return <section className="contact-layout section-wrap"><div className="contact-copy"><span className="section-kicker">ابدأ محادثة</span><h1>أخبرنا بما<br /><em>تريد تحريكه.</em></h1><p>لا تحتاج إلى ملف تعريفي طويل. سطران عن التحدي الحالي يكفيان لنبدأ من المكان الصحيح.</p><div className="contact-notes"><a href="mailto:hello@businessowner.co"><Mail size={18} /> hello@businessowner.co</a><a href="https://www.linkedin.com" target="_blank" rel="noreferrer"><Linkedin size={18} /> تابع المعرفة على LinkedIn</a></div></div><form className="lead-form" onSubmit={submit}><label>الاسم الكامل<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اكتب اسمك" /></label><label>البريد الإلكتروني<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" /></label><label>اسم الشركة <span>(اختياري)</span><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="اسم المشروع أو الشركة" /></label><label>المسار الأقرب<select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}><option value="">اختر إن كنت تعرف</option>{services.map((service) => <option key={service.slug} value={service.title}>{service.title}</option>)}</select></label><label>ما الذي تريد أن يتحرك؟<textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="اكتب التحدي أو الفكرة في كلماتك..." rows={5} /></label><button className="primary-btn form-submit" type="submit" disabled={mutation.isPending}>إرسال الرسالة <Send size={17} /></button><small>لن نرسل لك رسائل عامة. نستخدم بياناتك فقط للرد على طلبك.</small></form></section>; }

function AdminPage() { const [tab, setTab] = useState("overview"); const [showForm, setShowForm] = useState(false); return <section className="admin-wrap section-wrap"><div className="admin-head"><div><span className="section-kicker">Full CMS</span><h1>مساحة إدارة <em>المعرفة والنمو.</em></h1></div><button className="primary-btn" onClick={() => setShowForm(true)}><Plus size={17} /> إضافة محتوى</button></div><div className="admin-shell"><aside className="admin-sidebar"><div className="admin-user"><div className="avatar">BO</div><div><strong>مالك المشروع</strong><small>مدير المحتوى</small></div></div>{[["overview", <LayoutDashboard size={16} />, "نظرة عامة"],["articles", <FileText size={16} />, "المقالات"],["services", <BriefcaseBusiness size={16} />, "الخدمات"],["leads", <Inbox size={16} />, "العملاء المحتملون"]].map(([key, icon, label]) => <button key={key as string} className={tab === key ? "active" : ""} onClick={() => setTab(key as string)}>{icon}{label}</button>)}</aside><div className="admin-main"><div className="admin-toolbar"><span>آخر تحديث: الآن</span><span className="status-dot">متصل</span></div>{tab === "overview" && <><div className="stat-grid"><div><small>المقالات المنشورة</small><strong>12</strong><span>+3 هذا الشهر</span></div><div><small>الخدمات النشطة</small><strong>03</strong><span>كلها مرئية</span></div><div><small>طلبات جديدة</small><strong>08</strong><span>تحتاج مراجعة</span></div></div><div className="admin-table"><div className="table-title"><h3>آخر النشاطات</h3><button onClick={() => setTab("articles")}>عرض الكل <ArrowLeft size={14} /></button></div><div className="table-row"><FileText size={16} /><span>النمو لا يحتاج ضجيجاً أكثر</span><small>منشور · منذ يوم</small><PenLine size={15} /></div><div className="table-row"><Inbox size={16} /><span>طلب استشارة جديد من أحمد</span><small>جديد · منذ 3 ساعات</small><ArrowUpLeft size={15} /></div></div></>}{tab === "articles" && <ContentList icon={<FileText />} title="المقالات" items={articles.map((a) => a.title)} />}{tab === "services" && <ContentList icon={<BriefcaseBusiness />} title="الخدمات" items={services.map((s) => s.title)} />}{tab === "leads" && <ContentList icon={<Inbox />} title="العملاء المحتملون" items={["شركة مدار — طلب استراتيجية", "أحمد محمد — بناء عرض العلامة", "مشروع نواة — نظام نمو"]} />}</div></div>{showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><div className="cms-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setShowForm(false)}><X /></button><span className="section-kicker">إنشاء جديد</span><h2>أضف محتوى إلى المساحة</h2><label>نوع المحتوى<select><option>مقال</option><option>خدمة</option><option>محتوى صفحة</option></select></label><label>العنوان<input placeholder="اكتب عنواناً واضحاً" /></label><label>المحتوى<textarea rows={5} placeholder="ابدأ بالمسودة هنا..." /></label><button className="primary-btn" onClick={() => setShowForm(false)}>حفظ كمسودة <Check size={16} /></button></div></div>}</section>; }
function ContentList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) { return <div className="content-list"><div className="list-heading">{icon}<h2>{title}</h2><span>{items.length} عناصر</span></div>{items.map((item, index) => <div className="content-item" key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><small>منشور</small><button><PenLine size={15} /></button></div>)}</div>; }

function Router() { return <Switch><Route path="/" component={Home} /><Route path="/services" component={ServicesPage} /><Route path="/services/:slug">{(params) => <ServiceDetail slug={params.slug} />}</Route><Route path="/articles" component={ArticlesPage} /><Route path="/articles/:slug">{(params) => <ArticleDetail slug={params.slug} />}</Route><Route path="/about" component={AboutPage} /><Route path="/contact" component={ContactPage} /><Route path="/admin" component={AdminPage} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }

function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Shell><Router /></Shell></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
