import { cmsGetSettings, cmsSetSetting } from "./db";

const defaults:Record<string,string>={
  site_name_ar:"Business Owner",
  site_name_en:"Business Owner",
  site_url:"https://bussneis-owner.up.railway.app",
  contact_email:"bussneis.owner@gmail.com",
  location:"Riyadh, Saudi Arabia",
  timezone:"Asia/Riyadh",
  favicon_url:"/business-owner-transparent.png",
  default_og_image:"/business-owner-transparent.png",
  brand_tagline_ar:"معرفة تتحول إلى حركة",
  brand_tagline_en:"Knowledge that moves business forward.",
  site_description_ar:"منصة معرفة واستشارات عملية لأصحاب الأعمال: استراتيجية، هندسة الأعمال، التسويق، النمو، SEO والظهور في محركات البحث والذكاء الاصطناعي.",
  site_description_en:"Practical strategy, growth, marketing and business-engineering insight for founders and business owners.",
  seo_default_title_ar:"Business Owner | استراتيجية ونمو وتسويق للأعمال",
  seo_default_title_en:"Business Owner | Strategy, Growth & Marketing",
  seo_default_description_ar:"معرفة واستشارات عملية تساعد أصحاب الأعمال على بناء عرض أوضح، تسويق أقوى ونظام نمو قابل للقياس.",
  seo_default_description_en:"Practical business strategy, marketing, growth and SEO insight for owners who want clearer decisions and measurable execution.",
  global_schema_json:JSON.stringify({
    "@context":"https://schema.org","@type":"Organization","name":"Business Owner",
    "url":"https://bussneis-owner.up.railway.app/",
    "logo":"https://bussneis-owner.up.railway.app/business-owner-transparent.png",
    "email":"bussneis.owner@gmail.com",
    "sameAs":["https://www.linkedin.com/company/81373254"]
  })
};
export async function seedBusinessOwnerSettings(){
 const existing=await cmsGetSettings();
 const known=new Set(existing.map(x=>x.key));
 let inserted=0;
 for(const [key,value] of Object.entries(defaults)){
   if(known.has(key))continue;
   await cmsSetSetting(key,value);inserted++;
 }
 return {inserted,totalDefaults:Object.keys(defaults).length};
}
