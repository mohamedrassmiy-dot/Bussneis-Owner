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
        <div className="footer-bottom"><div className="footer-brand"><img src={logo} alt="Business Owner" /><span>Business Owner</span></div><p>معرفة عملية. قرارات أوضح. نمو يتحرك.</p><div className="footer-links"><button onClick={() => go("/articles")}>المقالات</button><button onClick={() => go("/services")}>الخدمات</button><a href="https://www.linkedin.com/company/81373254" target="_blank" rel="noreferrer"><Linkedin size={16} /> LinkedIn</a></div></div>
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

function ContactPage() { const [sent, setSent] = useState(false); const mutation = trpc.leads.create.useMutation({ onSuccess: (data) => { if (data.persisted) setSent(true); } }); const [form, setForm] = useState({ name: "", email: "", company: "", service: "", message: "" }); const submit = (event: React.FormEvent) => { event.preventDefault(); if (!form.name || !form.email || !form.message) return; mutation.mutate(form); }; if (sent) return <section className="success-state section-wrap"><div className="success-icon"><Check /></div><span className="section-kicker">وصلت الرسالة</span><h1>سنعود إليك<br /><em>بسؤال جيد.</em></h1><p>شكراً يا {form.name || "صاحب الفكرة"}. تم تسجيل طلبك، وسيتم التواصل معك قريباً.</p><Link href="/"><button className="primary-btn">العودة للرئيسية <ArrowUpLeft size={18} /></button></Link></section>; return <section className="contact-layout section-wrap"><div className="contact-copy"><span className="section-kicker">ابدأ محادثة</span><h1>أخبرنا بما<br /><em>تريد تحريكه.</em></h1><p>لا تحتاج إلى ملف تعريفي طويل. سطران عن التحدي الحالي يكفيان لنبدأ من المكان الصحيح.</p><div className="contact-notes"><a href="mailto:bussneis.owner@gmail.com"><Mail size={18} /> bussneis.owner@gmail.com</a><a href="https://www.linkedin.com" target="_blank" rel="noreferrer"><Linkedin size={18} /> تابع المعرفة على LinkedIn</a></div></div><form className="lead-form" onSubmit={submit}><label>الاسم الكامل<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اكتب اسمك" /></label><label>البريد الإلكتروني<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" /></label><label>اسم الشركة <span>(اختياري)</span><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="اسم المشروع أو الشركة" /></label><label>المسار الأقرب<select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}><option value="">اختر إن كنت تعرف</option>{services.map((service) => <option key={service.slug} value={service.title}>{service.title}</option>)}</select></label><label>ما الذي تريد أن يتحرك؟<textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="اكتب التحدي أو الفكرة في كلماتك..." rows={5} /></label>{mutation.error && <p className="cms-error" role="alert">تعذر إرسال الطلب حاليًا. حاول مرة أخرى لاحقًا أو تواصل معنا بالبريد الإلكتروني.</p>}<button className="primary-btn form-submit" type="submit" disabled={mutation.isPending}>إرسال الرسالة <Send size={17} /></button><small>لن نرسل لك رسائل عامة. نستخدم بياناتك فقط للرد على طلبك.</small></form></section>; }

type CmsTab = "overview" | "articles" | "services" | "leads";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(response.status === 503 ? "لم يتم إعداد حساب الإدارة على الخادم بعد." : "بيانات الدخول غير صحيحة أو تم تقييد المحاولات.");
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تسجيل الدخول."); }
    finally { setLoading(false); }
  };
  return <section className="admin-wrap section-wrap"><form className="admin-access" onSubmit={submit} autoComplete="on">
    <span className="section-kicker">BUSINESS OWNER / ADMIN</span>
    <h1>تسجيل دخول الإدارة</h1>
    <p>الدخول متاح لحساب المالك المصرّح له فقط.</p>
    <label>البريد الإلكتروني<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label>كلمة المرور<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
    {error && <p className="cms-error" role="alert">{error}</p>}
    <button type="submit" className="primary-btn" disabled={loading}>{loading ? "جاري التحقق..." : "دخول لوحة التحكم"}</button>
  </form></section>;
}

function AdminPage() {
  const [tab, setTab] = useState<CmsTab>("overview");
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<"article" | "service">("article");
  const [editing, setEditing] = useState<{ kind: "article" | "service"; id: number } | null>(null);
  const [publish, setPublish] = useState(false);
  const [draft, setDraft] = useState({ title: "", slug: "", summary: "", body: "", category: "إدارة الأعمال" });
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const authorized = me.data?.role === "admin";
  const dashboard = trpc.admin.dashboard.useQuery(undefined, { enabled: authorized });
  const createArticle = trpc.admin.createArticle.useMutation({ onSuccess: async () => { await utils.admin.dashboard.invalidate(); setShowForm(false); setDraft({title:"", slug:"", summary:"", body:"", category:"إدارة الأعمال"}); } });
  const createService = trpc.admin.createService.useMutation({ onSuccess: async () => { await utils.admin.dashboard.invalidate(); setShowForm(false); setDraft({title:"", slug:"", summary:"", body:"", category:"إدارة الأعمال"}); } });
  const leadStatus = trpc.admin.updateLeadStatus.useMutation({ onSuccess: () => utils.admin.dashboard.invalidate() });
  const resetEditor = () => { setShowForm(false); setEditing(null); setPublish(false); setDraft({title:"", slug:"", summary:"", body:"", category:"إدارة الأعمال"}); utils.admin.dashboard.invalidate(); };
  const editArticle = trpc.admin.updateArticle.useMutation({ onSuccess: resetEditor });
  const editService = trpc.admin.updateService.useMutation({ onSuccess: resetEditor });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const base = { title: draft.title.trim(), slug: draft.slug.trim(), body: draft.body.trim(), status: (publish ? "published" : "draft") as "published" | "draft" };
    if (kind === "article") {
      const data = { ...base, excerpt: draft.summary.trim(), category: draft.category.trim(), readTime: 5 };
      if (editing) editArticle.mutate({ id: editing.id, data });
      else createArticle.mutate(data);
    } else {
      const data = { ...base, summary: draft.summary.trim(), sortOrder: 0 };
      if (editing) editService.mutate({ id: editing.id, data });
      else createService.mutate(data);
    }
  };

  const startArticleEdit = (a: { id: number; title: string; slug: string; excerpt: string; body: string; category: string; status: string }) => {
    setKind("article"); setEditing({ kind: "article", id: a.id });
    setDraft({title:a.title, slug:a.slug, summary:a.excerpt, body:a.body, category:a.category});
    setPublish(a.status === "published"); setShowForm(true);
  };
  const startServiceEdit = (a: { id: number; title: string; slug: string; summary: string; body: string; status: string }) => {
    setKind("service"); setEditing({kind:"service",id:a.id});
    setDraft({title:a.title, slug:a.slug, summary:a.summary, body:a.body, category:"إدارة الأعمال"});
    setPublish(a.status === "published"); setShowForm(true);
  };
  if (me.isLoading) return <section className="admin-wrap section-wrap"><p>جاري التحقق من صلاحيات الدخول...</p></section>;
  if (!authorized) return <AdminLogin />;
  const articles = dashboard.data?.articles ?? [];
  const servicesData = dashboard.data?.services ?? [];
  const leadsData = dashboard.data?.leads ?? [];
  const statusLabel: Record<string, string> = { new: "جديد", contacted: "تم التواصل", closed: "مغلق" };
  return <section className="admin-wrap section-wrap">
    <div className="admin-head"><div><span className="section-kicker">BUSINESS OWNER CMS</span><h1>إدارة <em>المعرفة والنمو.</em></h1></div><button className="primary-btn" onClick={() => { setEditing(null); setPublish(false); setDraft({title:"",slug:"",summary:"",body:"",category:"إدارة الأعمال"}); setShowForm(true); }}><Plus size={17} /> إضافة محتوى</button></div>
    <div className="admin-shell">
      <aside className="admin-sidebar"><div className="admin-user"><div className="avatar">BO</div><div><strong>{me.data?.name || "مدير النظام"}</strong><small>Administrator</small></div></div>
        {([["overview", <LayoutDashboard size={16} />, "نظرة عامة"], ["articles", <FileText size={16} />, "المقالات"], ["services", <BriefcaseBusiness size={16} />, "الخدمات"], ["leads", <Inbox size={16} />, "العملاء المحتملون"]] as const).map(([key, icon, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{icon}{label}</button>)}
      </aside>
      <div className="admin-main">
        <div className="admin-toolbar"><span>بيانات فعلية من قاعدة البيانات</span><button onClick={() => dashboard.refetch()}>تحديث البيانات</button></div>
        {dashboard.isLoading && <p>جاري تحميل البيانات...</p>}
        {dashboard.error && <p role="alert" className="cms-error">تعذر تحميل بيانات لوحة التحكم: {dashboard.error.message}</p>}
        {!dashboard.isLoading && !dashboard.error && <>
          {tab === "overview" && <div className="stat-grid"><div><small>المقالات المنشورة</small><strong>{articles.filter(a => a.status === "published").length}</strong><span>{articles.length} إجمالي المقالات</span></div><div><small>الخدمات المنشورة</small><strong>{servicesData.filter(x => x.status === "published").length}</strong><span>{servicesData.length} إجمالي الخدمات</span></div><div><small>طلبات جديدة</small><strong>{leadsData.filter(x => x.status === "new").length}</strong><span>{leadsData.length} إجمالي الطلبات</span></div></div>}
          {tab === "articles" && <div className="content-list"><div className="list-heading"><FileText/><h2>المقالات</h2><span>{articles.length} عناصر</span></div>{articles.length === 0 && <p className="cms-empty">لا توجد مقالات محفوظة حتى الآن.</p>}{articles.map((a) => <div className="content-item" key={a.id}><span>#{a.id}</span><strong>{a.title}</strong><small>{a.status === "published" ? "منشور" : "مسودة"}</small><button type="button" aria-label="تعديل المقال" onClick={() => startArticleEdit(a)}><PenLine size={16}/></button></div>)}</div>}
          {tab === "services" && <div className="content-list"><div className="list-heading"><BriefcaseBusiness/><h2>الخدمات</h2><span>{servicesData.length} عناصر</span></div>{servicesData.length === 0 && <p className="cms-empty">لا توجد خدمات محفوظة حتى الآن.</p>}{servicesData.map((item) => <div className="content-item" key={item.id}><span>#{item.id}</span><strong>{item.title}</strong><small>{item.status === "published" ? "منشور" : "مسودة"}</small><button type="button" aria-label="تعديل الخدمة" onClick={() => startServiceEdit(item)}><PenLine size={16}/></button></div>)}</div>}
          {tab === "leads" && <div className="content-list"><div className="list-heading"><Inbox/><h2>العملاء المحتملون</h2><span>{leadsData.length} طلبات</span></div>{leadsData.length === 0 && <p className="cms-empty">لا توجد طلبات حالياً.</p>}{leadsData.map((lead) => <div key={lead.id} className="cms-lead"><div><strong>{lead.name}</strong><p><a href={`mailto:${lead.email}`}>{lead.email}</a> · {lead.company || "فرد"}</p><p>{lead.message}</p><small>{lead.service || "طلب عام"}</small></div><label>حالة الطلب<select value={lead.status} disabled={leadStatus.isPending} onChange={e => leadStatus.mutate({ id: lead.id, status: e.target.value as "new" | "contacted" | "closed" })}><option value="new">{statusLabel.new}</option><option value="contacted">{statusLabel.contacted}</option><option value="closed">{statusLabel.closed}</option></select></label></div>)}</div>}
        </>}
      </div>
    </div>
    {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="cms-modal" onSubmit={submit} onClick={e => e.stopPropagation()}><button className="modal-close" type="button" onClick={() => setShowForm(false)} aria-label="إغلاق"><X /></button><span className="section-kicker">محتوى جديد</span><h2>{editing ? "تعديل المحتوى" : "إنشاء محتوى"}</h2><label>نوع المحتوى<select value={kind} disabled={!!editing} onChange={e => setKind(e.target.value as "article" | "service")}><option value="article">مقال</option><option value="service">خدمة</option></select></label><label>العنوان<input required minLength={3} value={draft.title} onChange={e => setDraft({...draft,title:e.target.value})}/></label><label>Slug باللغة الإنجليزية<input required minLength={2} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" value={draft.slug} onChange={e => setDraft({...draft,slug:e.target.value.toLowerCase()})}/></label><label>الوصف المختصر<textarea required minLength={10} rows={2} value={draft.summary} onChange={e => setDraft({...draft,summary:e.target.value})}/></label>{kind === "article" && <label>التصنيف<input required minLength={2} value={draft.category} onChange={e => setDraft({...draft,category:e.target.value})}/></label>}<label>المحتوى<textarea required minLength={10} rows={7} value={draft.body} onChange={e => setDraft({...draft,body:e.target.value})}/></label><label className="cms-publish"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} /> نشر المحتوى مباشرة</label>
      {(createArticle.error || createService.error || editArticle.error || editService.error) && <p role="alert" className="cms-error">{(createArticle.error || createService.error || editArticle.error || editService.error)?.message}</p>}<button className="primary-btn" type="submit" disabled={createArticle.isPending || createService.isPending || editArticle.isPending || editService.isPending}>{editing ? "حفظ التعديلات" : publish ? "نشر المحتوى" : "حفظ مسودة"} <Check size={16}/></button></form></div>}
  </section>;
}
function Router() { return <Switch><Route path="/" component={Home} /><Route path="/services" component={ServicesPage} /><Route path="/services/:slug">{(params) => <ServiceDetail slug={params.slug} />}</Route><Route path="/articles" component={ArticlesPage} /><Route path="/articles/:slug">{(params) => <ArticleDetail slug={params.slug} />}</Route><Route path="/about" component={AboutPage} /><Route path="/contact" component={ContactPage} /><Route path="/admin" component={AdminPage} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }

function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Shell><Router /></Shell></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
