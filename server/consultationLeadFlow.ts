import type { Express, Request, Response } from "express";
import { createLead } from "./db";
import { assertLeadRateLimit } from "./_core/leadRateLimit";

const ROOT = "https://bussneis-owner.up.railway.app";
const EMAIL = "bussneis.owner@gmail.com";
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const field=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
const sectors=["retail","ecommerce","distribution","contracting","restaurants","services","manufacturing","technology","other"] as const;
const stages=["idea","startup","operating","expanding"] as const;
const timelines=["urgent","30-days","90-days","exploring"] as const;
const serviceLabels:Record<string,{ar:string;en:string}>={
 "business-consulting":{ar:"استشارة أعمال عامة",en:"General business consultation"},
 "small-business":{ar:"تطوير مشروع صغير أو متوسط",en:"Small / medium business"},
 "startups":{ar:"تأسيس مشروع جديد",en:"Startup and business model"},
 "strategy":{ar:"استراتيجية وتخطيط أعمال",en:"Strategy and planning"},
 "growth":{ar:"نمو الأعمال وزيادة المبيعات",en:"Growth and sales"},
 "operations":{ar:"تحسين التشغيل",en:"Operations improvement"},
 "marketing":{ar:"استشارة تسويق",en:"Marketing consulting"},
 "industries":{ar:"استشارة حسب القطاع",en:"Industry-specific advice"}
};
const localeOf=(path:string)=>path.startsWith("/en/")?"en":"ar";
function layout(locale:"ar"|"en",inner:string,title:string,success=false){
 const ar=locale==="ar";
 const styles="*{box-sizing:border-box}body{font:16px/1.8 system-ui,-apple-system,Arial,sans-serif;color:#141f32;background:#f8f7f3;margin:0}header,main,footer{max-width:880px;padding:22px;margin:auto}header{display:flex;justify-content:space-between;gap:18px;border-bottom:1px solid #dde2ea;flex-wrap:wrap}a{color:#0759c8}header a{text-decoration:none}h1{font-size:clamp(27px,4vw,42px);line-height:1.35}main{min-height:65vh}.lead-card{background:white;padding:clamp(18px,4vw,36px);border-radius:16px;box-shadow:0 12px 40px #152b4c12}label{display:block;font-weight:600;margin:14px 0 5px}input,select,textarea{display:block;width:100%;font:inherit;border:1px solid #abb5c5;border-radius:7px;padding:9px 12px;background:white;color:#131d2d}input:focus,select:focus,textarea:focus{outline:3px solid #acd0ff}textarea{min-height:130px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}button,.cta{display:inline-block;background:#0759de;color:white;border:0;border-radius:7px;padding:12px 22px;font:600 16px/1.4 inherit;cursor:pointer;margin-top:20px;text-decoration:none}.hint{color:#4c5f70;font-size:14px}.error{color:#9a1e1e;border:1px solid #d98d8d;padding:12px;border-radius:8px}.bot-field{position:absolute;left:-99999px;width:1px;height:1px;overflow:hidden}footer{border-top:1px solid #dde2ea;margin-top:25px}.privacy{font-size:13px;color:#526375}@media(max-width:660px){.cols{grid-template-columns:1fr}}";
 const analytics=success?'<script src="/api/consultation-event.js" defer></script>':"";
 const html='<!doctype html><html lang="'+locale+'" dir="'+(ar?"rtl":"ltr")+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+esc(title)+'</title><link rel="icon" href="/brand-logo.png"><style>'+styles+'</style>'+analytics+'</head><body><header><strong><a href="/">Business Owner</a></strong><nav><a href="'+(ar?"/business-consulting":"/en/business-consulting")+'">'+(ar?"استشارات الأعمال":"Business consulting")+'</a> · <a href="'+(ar?"/consultation":"/en/consultation")+'">'+(ar?"طلب استشارة":"Consultation form")+'</a></nav></header><main>'+inner+'</main><footer><p>'+esc(ar?"Business Owner — استشارات عملية لأصحاب المشاريع في السعودية.":"Business Owner — practical business advice for Saudi companies.")+'</p><a href="mailto:'+EMAIL+'">'+EMAIL+'</a></footer></body></html>';
 return html;
}
function renderForm(locale:"ar"|"en",service:string,origin:string,error=""){
 const ar=locale==="ar";
 const options=(vals:readonly string[], labels:{ar:string[];en:string[]})=>vals.map((value,i)=>'<option value="'+esc(value)+'">'+esc(labels[locale][i])+'</option>').join("");
 const industryLabels={ar:["تجارة التجزئة","التجارة الإلكترونية","الجملة والتوزيع","المقاولات ومواد البناء","المطاعم والمقاهي","الخدمات المهنية والصيانة","التصنيع والمنتجات","التقنية","قطاع آخر"],en:["Retail","E-commerce","Wholesale and distribution","Construction and building materials","Restaurants and cafés","Professional services and maintenance","Manufacturing","Technology","Other"]};
 const stageLabels={ar:["فكرة لم تبدأ بعد","مشروع جديد","نشاط قائم","توسع أو فتح فروع"],en:["Idea stage","New business","Operating business","Expansion"]};
 const timeLabels={ar:["خلال أسبوعين","خلال 30 يومًا","خلال 90 يومًا","استكشاف الخيارات"],en:["Within two weeks","Within 30 days","Within 90 days","Exploring options"]};
 const leadTitle=ar?"اطلب استشارة بيزنس تناسب مشروعك":"Request a business consultation";
 const serviceName=serviceLabels[service]?.[locale]||serviceLabels["business-consulting"][locale];
 const body='<div class="lead-card"><h1>'+leadTitle+'</h1><p>'+(ar?"اخبرنا عن نشاطك والتحدي الأكثر إلحاحًا. تصل البيانات إلى لوحة متابعة العملاء داخل Business Owner، ونراجع ملاءمة الخدمة قبل تحديد الخطوة التالية.":"Tell us about your business and the decision you need help with. Your enquiry is saved in the Business Owner lead dashboard, where we can assess the most relevant next step.")+'</p>'+(error?'<p class="error" role="alert">'+esc(error)+'</p>':"")+
 '<form method="post" action="/api/consultation-request" accept-charset="UTF-8">'+
 '<input type="hidden" name="locale" value="'+locale+'"><input type="hidden" name="service" value="'+esc(service)+'"><input type="hidden" name="landing" value="'+esc(origin)+'"><div class="bot-field" aria-hidden="true"><label for="company_website">Website</label><input id="company_website" type="text" tabindex="-1" name="company_website" autocomplete="off"></div>'+
 '<div class="cols"><div><label for="lead-name">'+(ar?"الاسم الكامل":"Full name")+' *</label><input id="lead-name" name="name" autocomplete="name" required minlength="2" maxlength="120"></div><div><label for="lead-email">'+(ar?"البريد الإلكتروني":"Email address")+' *</label><input id="lead-email" name="email" type="email" autocomplete="email" required maxlength="254"></div></div>'+
 '<div class="cols"><div><label for="lead-company">'+(ar?"اسم الشركة / المشروع":"Company / project name")+'</label><input id="lead-company" name="company" maxlength="150" autocomplete="organization"></div><div><label for="lead-city">'+(ar?"المدينة":"City")+'</label><input id="lead-city" name="city" maxlength="100" placeholder="'+(ar?"مثل الرياض أو جدة":"Riyadh, Jeddah, etc.")+'"></div></div>'+
 '<div class="cols"><div><label for="lead-sector">'+(ar?"قطاع النشاط":"Business sector")+' *</label><select id="lead-sector" name="sector" required><option value="">'+(ar?"اختر القطاع":"Select sector")+'</option>'+options(sectors,industryLabels)+'</select></div><div><label for="lead-stage">'+(ar?"مرحلة النشاط":"Business stage")+' *</label><select id="lead-stage" name="stage" required><option value="">'+(ar?"اختر المرحلة":"Select stage")+'</option>'+options(stages,stageLabels)+'</select></div></div>'+
 '<div class="cols"><div><label for="lead-timeline">'+(ar?"متى تحتاج المساعدة؟":"When do you need support?")+' *</label><select id="lead-timeline" name="timeline" required><option value="">'+(ar?"اختر التوقيت":"Select timeline")+'</option>'+options(timelines,timeLabels)+'</select></div><div><label for="lead-service">'+(ar?"نوع الاستشارة":"Consultation type")+'</label><input id="lead-service" readonly value="'+esc(serviceName)+'"></div></div>'+
 '<label for="lead-challenge">'+(ar?"ما أهم مشكلة أو قرار تحتاج مساعدة بشأنه؟":"What business problem or decision do you need help with?")+' *</label><textarea id="lead-challenge" name="challenge" required minlength="8" maxlength="2400" placeholder="'+(ar?"اشرح التحدي الحالي وتأثيره على مشروعك.":"Explain your challenge and how it affects your business.")+'"></textarea>'+
 '<button type="submit">'+(ar?"إرسال طلب الاستشارة":"Submit consultation request")+'</button><p class="privacy">'+(ar?"بالإرسال توافق على استخدام بياناتك للرد على طلب الاستشارة فقط. لا نقدم وعودًا بنتائج أو أرباح مضمونة.":"By submitting, you agree that the details you provide may be used to respond to this enquiry. We cannot guarantee revenue outcomes.")+'</p></form><p class="hint">'+(ar?"للتواصل البديل: ":"Alternative contact: ")+'<a href="mailto:'+EMAIL+'">'+EMAIL+'</a></p></div>';
 return layout(locale,body,leadTitle);
}
function renderSuccess(locale:"ar"|"en"){
 const ar=locale==="ar";
 return layout(locale,'<div class="lead-card"><h1>'+(ar?"تم استلام طلب الاستشارة":"Your consultation request was received")+'</h1><p>'+(ar?"تم حفظ الطلب في نظام متابعة Business Owner. سيتم مراجعته حسب ملاءمة نطاق الخدمة، دون وعد بموعد رد محدد.":"Your request was saved in the Business Owner lead pipeline and will be reviewed for fit; a response time is not guaranteed.")+'</p><a class="cta" href="'+(ar?"/business-consulting":"/en/business-consulting")+'">'+(ar?"العودة للاستشارات":"Back to consulting services")+'</a><div id="consultation-success" data-event="consultation_submit" data-source="consulting-form"></div></div>',ar?"تم استلام طلب الاستشارة":"Consultation request received",true);
}
export function registerConsultationLeadFlow(app:Express){
 for(const locale of ["ar","en"] as const){
  const prefix=locale==="en"?"/en":"";
  app.get([prefix+"/consultation",prefix+"/consultation/"],(req,res)=>{
   const service=field(req.query.service,35);
   const allowed=Object.prototype.hasOwnProperty.call(serviceLabels,service)?service:"business-consulting";
   const landing=field(req.query.from,160);
   const safeLanding=/^\/[a-zA-Z0-9/_-]{0,150}$/.test(landing)?landing:prefix+"/business-consulting";
   res.set("Cache-Control","no-store").type("html").send(renderForm(locale,allowed,safeLanding));
  });
  app.get(prefix+"/consultation/success",(_req,res)=>res.set("Cache-Control","no-store").type("html").send(renderSuccess(locale)));
 }
 app.get("/api/consultation-event.js",(_req,res)=>{
  res.set("Cache-Control","no-store").type("application/javascript").send('if(document.getElementById("consultation-success")){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:"consultation_submit",form_type:"business_consulting"});}');
 });
 app.post("/api/consultation-request",async(req:Request,res:Response)=>{
  res.set("Cache-Control","no-store");
  const locale: "ar"|"en"=req.body?.locale==="en"?"en":"ar";
  const back=locale==="en"?"/en/consultation":"/consultation";
  const fail=(status:number,messageAr:string,messageEn:string)=>res.status(status).type("html").send(renderForm(locale,field(req.body?.service,35),field(req.body?.landing,160),locale==="ar"?messageAr:messageEn));
  const origin=req.get("origin");
  const referer=req.get("referer");
  const fetchSite=req.get("sec-fetch-site");
  // This endpoint is for the public same-origin web form, not external API clients.
  if(fetchSite && !["same-origin","none"].includes(fetchSite))return fail(403,"يرجى فتح الاستمارة من الموقع مباشرة.","Please open the form on this website.");
  try{
   const h=req.get("host")||"";
   for(const val of [origin,referer].filter(Boolean) as string[])if(new URL(val).host!==h)return fail(403,"يرجى فتح الاستمارة من الموقع مباشرة.","Please open the form on this website.");
  }catch{return fail(403,"تعذر التحقق من مصدر الطلب.","Cannot verify request origin.");}
  if(field(req.body?.company_website,200))return res.redirect(303,locale==="ar"?"/consultation/success":"/en/consultation/success");
  const name=field(req.body?.name,121),email=field(req.body?.email,255).toLowerCase(),company=field(req.body?.company,151),challenge=field(req.body?.challenge,2401);
  const service=field(req.body?.service,40),sector=field(req.body?.sector,40),stage=field(req.body?.stage,40),timeline=field(req.body?.timeline,40),city=field(req.body?.city,101),landing=field(req.body?.landing,180);
  if(name.length<2||name.length>120||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||company.length>150||challenge.length<8||challenge.length>2400||!sectors.some(x=>x===sector)||!stages.some(x=>x===stage)||!timelines.some(x=>x===timeline)||city.length>100)
   return fail(400,"راجع الحقول المطلوبة وأعد المحاولة.","Please review the required fields and try again.");
  const validService=Object.prototype.hasOwnProperty.call(serviceLabels,service)?service:"business-consulting";
  const safeLanding=/^\/[a-zA-Z0-9/_-]{0,150}$/.test(landing)?landing:back;
  try{
   assertLeadRateLimit(req.ip||"unknown");
   const notes=JSON.stringify({sector,stage,timeline,city,landing:safeLanding,locale,channel:"consulting_form"});
   await createLead({name,email,company:company||null,service:serviceLabels[validService][locale],message:challenge,status:"new",source:"organic-consulting-site",notes});
   res.redirect(303,locale==="ar"?"/consultation/success":"/en/consultation/success");
  }catch(err){
   const code=err && typeof err==="object" && "code" in err && err.code==="TOO_MANY_REQUESTS"?429:503;
   console.warn("[Consultation] Could not persist request:",err instanceof Error?err.message:String(err));
   return fail(code,"تعذر حفظ الطلب حاليًا. جرّب لاحقًا أو تواصل عبر البريد.","We could not save your request. Please try later or email us.");
  }
 });
}
