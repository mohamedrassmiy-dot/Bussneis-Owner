import {cmsList,cmsSavePage,cmsSavePost} from "./db";
import {originalArticles,originalServices} from "./cmsLegacyData";
/** Non-destructive import of original public content into editable CMS drafts.
 * Publishing a draft overrides its original route; existing site remains live until then. */
const pageData=[
 {slug:"home",title:"الرئيسية — Business Owner",summary:"الفكرة الجيدة تحتاج مالكاً يعرف كيف يحرّكها.",sections:[["hero","الفكرة الجيدة تحتاج مالكاً يعرف كيف يحرّكها.","نساعد أصحاب الأعمال على تحويل الخبرة إلى عرض واضح، ونظام نمو قابل للإدارة، ومحتوى يبني الثقة قبل أن يطلب البيع."],["cta","احكِ لنا عن مشروعك","ابدأ محادثة حول مشروعك."]]},
 {slug:"services",title:"خدمات Business Owner",summary:"ما يحتاجه عملك ليتحرك بثقة.",sections:[["hero","ما يحتاجه عملك ليتحرك بثقة.","نبدأ من السؤال الصحيح، ثم نبني ما يساعدك على الإجابة عنه في السوق: عرض، علامة، ومسار نمو قابل للقياس."],["text","استراتيجية الأعمال","نحوّل التشتت إلى قرار واضح: أين تقف، ماذا تبيع، وما الخطوة التي تستحق الاستثمار الآن."],["text","هوية وعرض العلامة","نصوغ قصة العلامة وعرضها بطريقة تجعل العميل المناسب يرى نفسه داخل الحل."],["text","نظام النمو","نبني مساراً قابلاً للقياس يحول الاهتمام إلى فرص تجارية."]]},
 {slug:"articles",title:"المقالات والمعرفة",summary:"ملاحظات من طاولة العمل.",sections:[["hero","ملاحظات من طاولة العمل.","معرفة قصيرة وعملية لأصحاب الأعمال الذين يريدون قرارات أهدأ، عروضاً أوضح، ونمواً لا يعتمد على الصدفة."]]},
 {slug:"about",title:"عن Business Owner",summary:"نحن نؤمن أن الوضوح ميزة.",sections:[["hero","نحن نؤمن أن الوضوح ميزة.","Business Owner مساحة عملية لصاحب العمل: نضع المعرفة في سياقها، ونحوّلها إلى قرارات تقدر على تحريك مشروع حقيقي."],["text","فضول عملي","نسأل قبل أن نقترح، ونبحث عن السبب قبل أن نجمّل النتيجة."],["text","تركيز تجاري","كل فكرة يجب أن تساعد على قرار أو تقرّب العميل من الثقة."],["text","حركة قابلة للاستمرار","نترك وراءنا نظاماً تستطيع مواصلته، لا اعتماداً جديداً علينا."]]},
 {slug:"contact",title:"تواصل معنا",summary:"ابدأ محادثة عن مشروعك.",sections:[["hero","تواصل معنا","شاركنا تفاصيل مشروعك وسنتواصل معك."],["cta","البريد الإلكتروني","bussneis.owner@gmail.com"]]},
] as const;
const englishPages=[
 {slug:"home",title:"Home — Business Owner",summary:"Good ideas need owners who know how to move them.",sections:[["hero","Good ideas need owners who know how to move them.","We help business owners turn experience into a clear offer, a manageable growth system and content that earns trust."],["cta","Tell us about your business","Start a conversation about your project."]]},
 {slug:"services",title:"Business Owner Services",summary:"What your business needs to move forward with confidence.",sections:[["hero","Services that move your business forward","We start with the right questions and build clear offers, positioning and measurable growth paths."]]},
 {slug:"articles",title:"Insights and Articles",summary:"Practical thinking for business owners.",sections:[["hero","Notes from the workbench","Practical knowledge for better decisions, clearer offers and sustainable growth."]]},
 {slug:"about",title:"About Business Owner",summary:"We believe clarity is an advantage.",sections:[["hero","Clarity is an advantage","Business Owner turns practical business knowledge into decisions that move real projects forward."]]},
 {slug:"contact",title:"Contact Us",summary:"Start a conversation about your business.",sections:[["hero","Let's talk about your business","Share your goals and challenges with us."]]},
] as const;
export async function importExistingContent(){
 const [pages,posts]=await Promise.all([cmsList("page"),cmsList("post")]);
 const existingPages=new Set(pages.map(x=>x.locale+":"+x.slug));
 const existingPosts=new Set(posts.map(x=>x.locale+":"+x.slug));
 let addedPages=0,addedPosts=0;
 for(const [locale,list] of [["ar",pageData],["en",englishPages]] as const){
   for(const page of list){
     if(existingPages.has(locale+":"+page.slug))continue;
     const sections=page.sections.map(([type,title,body],i)=>({
       id:page.slug+"-"+locale+"-"+i,type,title,body,
       ...(type==="cta"?{buttonLabel:locale==="ar"?"تواصل معنا":"Contact us",buttonUrl:locale==="ar"?"/contact":"/en/contact"}:{})
     }));
     await cmsSavePage({contentKey:page.slug,locale,slug:page.slug,title:page.title,summary:page.summary,status:"draft",sections,
       seoTitle:page.title+" | Business Owner",seoDescription:page.summary,robots:"index,follow"});
     existingPages.add(locale+":"+page.slug);addedPages++;
   }
 }
 for(const service of originalServices){
   const slug="service-"+service.slug;
   if(existingPages.has(service.locale+":"+slug))continue;
   const sections=[
     {id:slug+"-hero",type:"hero" as const,title:service.title,body:service.summary},
     {id:slug+"-body",type:"text" as const,title:service.eyebrow,body:service.body},
     ...service.bullets.map((point,i)=>({id:slug+"-point-"+i,type:"text" as const,title:point,body:point})),
     {id:slug+"-cta",type:"cta" as const,title:service.locale==="ar"?"لنتحدث عن هذا المسار":"Discuss this service",
       body:service.summary,buttonLabel:service.locale==="ar"?"راسلنا":"Contact us",
       buttonUrl:service.locale==="ar"?"/contact":"/en/contact"}
   ];
   await cmsSavePage({contentKey:slug,locale:service.locale,slug,title:service.title,summary:service.summary,status:"draft",sections,
     seoTitle:service.title+" | Business Owner",seoDescription:service.summary,robots:"index,follow"});
   existingPages.add(service.locale+":"+slug);addedPages++;
 }
 for(const post of originalArticles){
   if(existingPosts.has(post.locale+":"+post.slug))continue;
   await cmsSavePost({contentKey:post.slug,locale:post.locale,slug:post.slug,title:post.title,excerpt:post.excerpt,
     body:post.body.join("\n\n"),category:post.category,status:"draft",seoTitle:post.title+" | Business Owner",
     seoDescription:post.excerpt,robots:"index,follow",embeds:[]});
   existingPosts.add(post.locale+":"+post.slug);addedPosts++;
 }
 return {addedPages,addedPosts,totalPages:existingPages.size,totalPosts:existingPosts.size,
   note:"Content added as editable drafts. Existing CMS records are never overwritten."};
}
