import { originalArticles, originalServices } from "./cmsLegacyData";

const base="https://bussneis-owner.up.railway.app";
const e=(v:string)=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export function legacySearchSeo(pathname:string){
 const normalized=pathname.length>1?pathname.replace(/\/$/,""):pathname;
 const en=normalized==="/en"||normalized.startsWith("/en/");
 const locale=en?"en":"ar";
 const bits=normalized.split("/").filter(Boolean).slice(en?1:0);
 const nav=[{url:en?"/en":"/",label:en?"Home":"الرئيسية"},{url:en?"/en/business-consulting":"/business-consulting",label:en?"Business Consulting":"استشارات الأعمال"},{url:en?"/en/services":"/services",label:en?"Services":"الخدمات"},{url:en?"/en/articles":"/articles",label:en?"Insights":"المقالات"},{url:en?"/en/contact":"/contact",label:en?"Contact":"تواصل"}];
 const paragraph=(v:string)=>"<p>"+e(v)+"</p>";
 let title="",description="",heading="", paragraphs:string[]=[];
 const mainIntro=en?"Business Owner helps founders and business owners clarify strategy, understand customer demand, prioritise marketing, improve daily operations and evaluate growth opportunities. The process begins with the specific business decision and the owner's capacity to act.":"Business Owner منصة استشارات أعمال ومعرفة عملية لأصحاب المشاريع في السعودية. نساعد في التفكير في استراتيجية البيزنس، تحديد العملاء، تنظيم أولويات التشغيل، تطوير التسويق وتحسين قرارات النمو. نبدأ من تحدي صاحب العمل الحقيقي ونربط الاختيارات بالموارد المتاحة.";
 const solution=en?"Whether you manage a shop, an online store, a construction business, distribution activity, a restaurant or a professional service, the relevant business decision depends on your customers, economics, sales cycle and delivery capacity. The useful outcome is a practical next step, not a guarantee of revenue.":"سواء كنت تدير متجرًا أو تجارة إلكترونية أو نشاط مقاولات ومواد بناء أو مطعمًا أو نشاط توزيع أو خدمة مهنية، تختلف طريقة التحسين حسب العميل ودورة البيع وهيكل التشغيل. الهدف الوصول إلى خطوات قابلة للتنفيذ، لا وعود بمبيعات أو أرباح مضمونة.";
 if(bits.length===0){
   title=en?"Business Consulting in Saudi Arabia | Business Owner":"استشارات أعمال واستشارة بيزنس في السعودية | Business Owner";
   description=en?"Business consulting for founders and companies: strategy, new projects, growth, marketing and operational improvement across sectors.":"استشارة بيزنس لأصحاب الأعمال في السعودية: استشارات استراتيجية ونمو المشاريع الصغيرة والتسويق والتشغيل وتحليل نموذج العمل حسب القطاع.";
   heading=en?"Business consulting and practical advice for owners":"استشارات بيزنس لأصحاب الأعمال ورواد المشاريع";
   paragraphs=[mainIntro,solution,en?"Explore advice for new ventures, SMEs, strategic decisions, marketing challenges and operational performance through dedicated consultation pages.":"ابدأ باستشارة أعمال تحدد المشكلة: هل ضعف الطلب من عرض غير واضح؟ هل الشركة بحاجة إلى خطة نمو؟ هل لديك مشروع جديد لم تختبر فكرته؟ ستجد لكل محور صفحة تناقش التحديات المناسبة وأسئلة البدء."];
 }else if(bits.length===1&&bits[0]==="services"){
   title=en?"Business Consulting Services for SMEs | Business Owner":"خدمات استشارات الأعمال وتطوير المشاريع | Business Owner";
   description=en?"Services for business strategy, brand positioning, growth systems, small business development and commercial decisions.":"خدمات استشارة بيزنس لأصحاب المشاريع: استراتيجية العمل، تأسيس المشروع، التسويق، زيادة المبيعات، تحسين التشغيل وتطوير العلامة.";
   heading=en?"Services for business owners and growing companies":"خدمات استشارات الأعمال وتنمية المشاريع";
   paragraphs=[mainIntro,solution,en?"Browse strategic planning, commercial positioning, growth consulting and operational improvement. Each service starts from the needs of your business rather than a generic package.":"تشمل خدماتنا مراجعة التمركز والعرض التجاري، وضوح نموذج العمل، أولويات النمو، تحسين متابعة العملاء، والتنسيق بين التسويق والمبيعات والتشغيل. يختلف نطاق كل استشارة حسب حجم الشركة ومرحلتها."];
 }else if(bits.length===2&&bits[0]==="services"){
   const svc=originalServices.find(s=>s.locale===locale&&s.slug===bits[1]);
   if(!svc)return null;
   title=svc.title+" | "+(en?"Business Consulting":"استشارات الأعمال")+" | Business Owner";
   description=svc.summary;heading=svc.title;
   paragraphs=[svc.summary,svc.body,svc.bullets.join(en?". ":". ")+".",solution];
 }else if(bits.length===1&&bits[0]==="articles"){
   title=en?"Business Strategy Insights & Consulting Articles | Business Owner":"مقالات استشارات الأعمال وإدارة المشاريع | Business Owner";
   description=en?"Insights about practical business strategy, customer offers, commercial growth and decisions for founders and company owners.":"مقالات عن استشارة البيزنس ونمو المشاريع الصغيرة واستراتيجية الأعمال والعلامة التجارية وجذب العملاء.";
   heading=en?"Business consulting insights and useful decisions":"مقالات وتوجيهات لأصحاب المشاريع والشركات";
   paragraphs=[mainIntro,solution,en?"Read practical ideas about offers, leadership priorities and sustainable growth, then choose a consultation focused on your situation.":"تصفح مقالات عن تطوير العرض التجاري وتخطيط النمو وقرارات المدير أو المؤسس، ثم انتقل إلى صفحة الاستشارة التي تعالج تحدي نشاطك الحالي."];
 }else if(bits.length===2&&bits[0]==="articles"){
   const article=originalArticles.find(a=>a.locale===locale&&a.slug===bits[1]);
   if(!article)return null;
   title=article.title+" | Business Owner";
   description=article.excerpt;
   heading=article.title;
   paragraphs=[article.excerpt,...article.body,mainIntro];
 }else if(bits.length===1&&bits[0]==="about"){
   title=en?"About Business Owner | Business Advisory":"عن Business Owner | استشارات أعمال";
   description=en?"Learn about Business Owner's practical approach to strategy, business decisions and commercial growth.":"تعرف على Business Owner ومنهج استشارات الأعمال القائم على تشخيص التحدي والقرارات العملية.";
   heading=en?"About Business Owner":"عن Business Owner";
   paragraphs=[mainIntro,solution];
 }else if(bits.length===1&&bits[0]==="contact"){
   title=en?"Contact Business Owner for a Business Consultation":"اطلب استشارة بيزنس | تواصل مع Business Owner";
   description=en?"Contact Business Owner about business consulting, growth strategy, marketing and commercial decision-making.":"تواصل مع Business Owner لطلب استشارة أعمال أو مناقشة تحديات تأسيس مشروع أو نمو المبيعات والتسويق والتشغيل.";
   heading=en?"Request a business consultation":"اطلب استشارة بيزنس تناسب تحدي مشروعك";
   paragraphs=[mainIntro,en?"Tell us your sector, stage, city and biggest challenge. Use the enquiry form or email bussneis.owner@gmail.com to describe the decision you need help making.":"اذكر قطاع نشاطك ومرحلة الشركة والمدينة وأهم تحدٍّ تواجهه. يمكنك تعبئة نموذج التواصل أو مراسلة bussneis.owner@gmail.com لشرح ما تحتاجه."];
 } else return null;
 const links=nav.map(x=>'<a href="'+x.url+'">'+e(x.label)+'</a>').join(" · ");
 const contents='<main id="seo-prerender" dir="'+(en?"ltr":"rtl")+'" lang="'+locale+'" style="padding:22px;max-width:1050px;margin:auto;font:16px/1.9 system-ui,sans-serif"><nav aria-label="'+(en?"Site navigation":"التنقل")+'">'+links+'</nav><h1>'+e(heading)+'</h1>'+paragraphs.map(paragraph).join("")+'<section><h2>'+(en?"Which business needs can we explore?":"متى تحتاج استشارة أعمال؟")+'</h2><p>'+e(en?"Discuss how to validate a business idea, improve operations, build a realistic strategy, choose marketing priorities or diagnose why sales growth has stalled. The right answer depends on industry, customer journey and execution capacity.":"يمكنك مناقشة جدوى اختبار فكرة تجارية، وضع خطة عمل عملية، تحسين إدارة الوقت والطلبات، تصميم استراتيجية تسويق، أو فهم أسباب تباطؤ المبيعات. يتم تحديد الأولويات حسب القطاع والعملاء وحجم المشروع.")+'</p><a href="'+(en?"/en/business-consulting":"/business-consulting")+'">'+(en?"Explore business consulting":"اكتشف خدمات استشارات البيزنس")+'</a></section></main>';
 return {title,description,html:contents,canonical:base+normalized,locale};
}
