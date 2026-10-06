import {cmsList,cmsSavePage,cmsSavePost} from "./db";
/** Non-destructive import of original public content into editable CMS drafts.
 * Publishing a draft overrides its original route; existing site remains live until then. */
const pageData=[
 {slug:"home",title:"الرئيسية — Business Owner",summary:"الفكرة الجيدة تحتاج مالكاً يعرف كيف يحرّكها.",sections:[["hero","الفكرة الجيدة تحتاج مالكاً يعرف كيف يحرّكها.","نساعد أصحاب الأعمال على تحويل الخبرة إلى عرض واضح، ونظام نمو قابل للإدارة، ومحتوى يبني الثقة قبل أن يطلب البيع."],["cta","احكِ لنا عن مشروعك","ابدأ محادثة حول مشروعك."]]},
 {slug:"services",title:"خدمات Business Owner",summary:"ما يحتاجه عملك ليتحرك بثقة.",sections:[["hero","ما يحتاجه عملك ليتحرك بثقة.","نبدأ من السؤال الصحيح، ثم نبني ما يساعدك على الإجابة عنه في السوق: عرض، علامة، ومسار نمو قابل للقياس."],["text","استراتيجية الأعمال","نحوّل التشتت إلى قرار واضح: أين تقف، ماذا تبيع، وما الخطوة التي تستحق الاستثمار الآن."],["text","هوية وعرض العلامة","نصوغ قصة العلامة وعرضها بطريقة تجعل العميل المناسب يرى نفسه داخل الحل."],["text","نظام النمو","نبني مساراً قابلاً للقياس يحول الاهتمام إلى فرص تجارية."]]},
 {slug:"articles",title:"المقالات والمعرفة",summary:"ملاحظات من طاولة العمل.",sections:[["hero","ملاحظات من طاولة العمل.","معرفة قصيرة وعملية لأصحاب الأعمال الذين يريدون قرارات أهدأ، عروضاً أوضح، ونمواً لا يعتمد على الصدفة."]]},
 {slug:"about",title:"عن Business Owner",summary:"نحن نؤمن أن الوضوح ميزة.",sections:[["hero","نحن نؤمن أن الوضوح ميزة.","Business Owner مساحة عملية لصاحب العمل: نضع المعرفة في سياقها، ونحوّلها إلى قرارات تقدر على تحريك مشروع حقيقي."],["text","فضول عملي","نسأل قبل أن نقترح، ونبحث عن السبب قبل أن نجمّل النتيجة."],["text","تركيز تجاري","كل فكرة يجب أن تساعد على قرار أو تقرّب العميل من الثقة."],["text","حركة قابلة للاستمرار","نترك وراءنا نظاماً تستطيع مواصلته، لا اعتماداً جديداً علينا."]]},
 {slug:"contact",title:"تواصل معنا",summary:"ابدأ محادثة عن مشروعك.",sections:[["hero","تواصل معنا","شاركنا تفاصيل مشروعك وسنتواصل معك."],["cta","البريد الإلكتروني","bussneis.owner@gmail.com"]]},
] as const;
const postData=[
 {slug:"growth-needs-a-system",title:"النمو لا يحتاج ضجيجاً أكثر؛ يحتاج نظاماً أوضح",category:"نمو الأعمال",excerpt:"حين تتوقف عن مطاردة كل فرصة وتبدأ في بناء مسار يمكن تكراره، يصبح النمو نتيجة مفهومة لا مفاجأة.",body:["كثير من أصحاب الأعمال يصفون مشكلتهم بأنها نقص في العملاء. لكن بعد أول محادثة نكتشف غالباً أن المشكلة ليست في الاهتمام؛ بل في غياب المسار الذي يحوّل الاهتمام إلى قرار.","النظام يبدأ بثلاثة أسئلة: من العميل الذي تستطيع خدمته فعلاً؟ ما المشكلة التي تقدر على شرحها ببساطة؟ وما الدليل الذي يجعل الخطوة التالية آمنة؟ عندما تجتمع هذه الإجابات، يصبح المحتوى امتداداً للفكرة وليس بديلاً عنها.","لا تحتاج أن تنشر أكثر. تحتاج أن تكرر فكرة نافعة بطرق مختلفة، وتربطها بدعوة واضحة، ثم تراجع ما الذي فتح محادثة حقيقية. هذا هو الفرق بين نشاط تسويقي ونظام نمو."]},
 {slug:"offer-before-logo",title:"قبل أن تسأل: كيف يبدو الشعار؟ اسأل: ماذا يفهم العميل؟",category:"العلامة والعرض",excerpt:"الهوية القوية لا تكتفي بأن تكون جميلة؛ هي تختصر على العميل مسافة الشك وتوضح لماذا يختارك.",body:["الهوية ليست طبقة تزيين فوق العمل. هي وعد مختصر يجيب عن سؤال العميل: لماذا هذا الخيار مناسب لي الآن؟ لذلك نبدأ دائماً بالعرض قبل الألوان."]},
 {slug:"the-90-day-decision",title:"قرار الـ90 يوماً: كيف تختار ما لن تفعله؟",category:"إدارة",excerpt:"خطة النمو ليست قائمة أمنيات. هي اتفاق شجاع على ترك بعض الأشياء حتى تعطي الأشياء المهمة فرصة حقيقية.",body:["خطة النمو ليست قائمة أمنيات؛ بل اختيار واضح للأولويات التي تستحق التنفيذ والمتابعة خلال تسعين يوماً."]},
] as const;
export async function importExistingContent(){
 const [pages,posts]=await Promise.all([cmsList("page"),cmsList("post")]);
 const existingPages=new Set(pages.map(x=>x.locale+":"+x.slug));
 const existingPosts=new Set(posts.map(x=>x.locale+":"+x.slug));
 let addedPages=0,addedPosts=0;
 for(const page of pageData){
  if(existingPages.has("ar:"+page.slug))continue;
  await cmsSavePage({contentKey:page.slug,locale:"ar",slug:page.slug,title:page.title,summary:page.summary,status:"draft",sections:page.sections.map(([type,title,body],i)=>({id:page.slug+"-"+i,type,title,body,...(type==="cta"?{buttonLabel:"تواصل معنا",buttonUrl:"/contact"}:{})})),seoTitle:page.title+" | Business Owner",seoDescription:page.summary,robots:"index,follow"});
  addedPages++;
 }
 for(const post of postData){
  if(existingPosts.has("ar:"+post.slug))continue;
  await cmsSavePost({contentKey:post.slug,locale:"ar",slug:post.slug,title:post.title,excerpt:post.excerpt,body:post.body.join("\n\n"),category:post.category,status:"draft",seoTitle:post.title+" | Business Owner",seoDescription:post.excerpt,robots:"index,follow",embeds:[]});
  addedPosts++;
 }
 return {addedPages,addedPosts,existingPages:pages.length,existingPosts:posts.length,note:"Imported as drafts; publishing replaces the original route only after review."};
}
