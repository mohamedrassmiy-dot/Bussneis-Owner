import { useState } from "react";
import type { ReactNode } from "react";
import { trpc } from "./lib/trpc";
import { LayoutDashboard, Files, FileText, Images, Users, SearchCheck, ArrowLeftRight, Settings2, ShieldCheck, Activity, Menu, X, Globe, LogOut, ExternalLink, PanelRightClose, ChevronLeft } from "lucide-react";
import { ProDashboard, ProLeads, ProRedirects, ProSeo } from "./cms/ProCoreViews";
import { ProSettings, ProMedia, ProSecurity, ProActivity } from "./cms/ProSettingsViews";
import { ProContent } from "./cms/ProContent";
import "./cms/pro-cms.css";
export type ProTab="dashboard"|"pages"|"posts"|"media"|"leads"|"seo"|"redirects"|"settings"|"security"|"activity";
export type ProLanguage="ar"|"en";
export const siteDomain="https://bussneis-owner-production.up.railway.app";
const menuEntries=[
  {id:"dashboard" as const,ar:"الرئيسية",en:"Dashboard",Icon:LayoutDashboard,group:"main"},
  {id:"pages" as const,ar:"الصفحات",en:"Pages",Icon:Files,group:"content"},
  {id:"posts" as const,ar:"المقالات",en:"Articles",Icon:FileText,group:"content"},
  {id:"media" as const,ar:"مكتبة الوسائط",en:"Media Library",Icon:Images,group:"content"},
  {id:"leads" as const,ar:"العملاء المحتملون",en:"Leads CRM",Icon:Users,group:"growth"},
  {id:"seo" as const,ar:"إدارة SEO",en:"SEO Manager",Icon:SearchCheck,group:"growth"},
  {id:"redirects" as const,ar:"إعادة التوجيه",en:"Redirect Manager",Icon:ArrowLeftRight,group:"growth"},
  {id:"settings" as const,ar:"إعدادات الموقع",en:"Site Settings",Icon:Settings2,group:"system"},
  {id:"security" as const,ar:"الأمان والجلسات",en:"Security",Icon:ShieldCheck,group:"system"},
  {id:"activity" as const,ar:"سجل النشاط",en:"Activity Log",Icon:Activity,group:"system"},
];
const groups:{id:string;ar:string;en:string}[]=[
 {id:"main",ar:"نظرة عامة",en:"Overview"},
 {id:"content",ar:"إدارة المحتوى",en:"Content"},
 {id:"growth",ar:"العملاء والظهور",en:"Growth & SEO"},
 {id:"system",ar:"إدارة المنصة",en:"Administration"},
];
export default function ProfessionalCMS(){
 const [tab,setTab]=useState<ProTab>("dashboard");
 const [locale,setLocale]=useState<ProLanguage>("ar");
 const [drawer,setDrawer]=useState(false);
 const [editTarget,setEditTarget]=useState<{kind:"page"|"post";id:number}|null>(null);
 const logout=trpc.auth.logout.useMutation({onSuccess:()=>location.reload()});
 const label=(ar:string,en:string)=>locale==="ar"?ar:en;
 const navigate=(t:ProTab)=>{setTab(t);setEditTarget(null);setDrawer(false);window.scrollTo({top:0,behavior:"smooth"});};
 const current=menuEntries.find(x=>x.id===tab)!;
 const title=label(current.ar,current.en);
 const goToEditor=(kind:"page"|"post",id:number)=>{setEditTarget({kind,id});setTab(kind==="page"?"pages":"posts");window.scrollTo({top:0,behavior:"smooth"});};
 let main:ReactNode;
 switch(tab){
 case "dashboard":main=<ProDashboard locale={locale} navigate={navigate}/>;break;
 case "pages":main=<ProContent kind="page" locale={locale} editTarget={editTarget} clearTarget={()=>setEditTarget(null)}/>;break;
 case "posts":main=<ProContent kind="post" locale={locale} editTarget={editTarget} clearTarget={()=>setEditTarget(null)}/>;break;
 case "media":main=<ProMedia locale={locale}/>;break;
 case "leads":main=<ProLeads locale={locale}/>;break;
 case "seo":main=<ProSeo locale={locale} edit={goToEditor}/>;break;
 case "redirects":main=<ProRedirects locale={locale}/>;break;
 case "settings":main=<ProSettings locale={locale}/>;break;
 case "security":main=<ProSecurity locale={locale}/>;break;
 case "activity":main=<ProActivity locale={locale}/>;break;
 }
 return <div className="pro-root" lang={locale} dir={locale==="ar"?"rtl":"ltr"}>
  <header className="pro-topbar">
   <div className="pro-topbar-title"><button className="pro-mobile-menu" aria-label={label("فتح القائمة","Open menu")} onClick={()=>setDrawer(true)}><Menu size={22}/></button><div className="pro-mini-logo"><img src="/business-owner-transparent.png" alt="Business Owner"/></div><div><strong>{title}</strong><small>BUSINESS OWNER CMS</small></div></div>
   <div className="pro-topbar-actions"><button className="pro-language" onClick={()=>setLocale(x=>x==="ar"?"en":"ar")}><Globe size={16}/>{locale==="ar"?"EN":"عربي"}</button><a className="pro-site-link" href="/" target="_blank" rel="noreferrer"><ExternalLink size={16}/><span>{label("عرض الموقع","View website")}</span></a><button className="pro-logout" onClick={()=>logout.mutate()} disabled={logout.isPending} title={label("تسجيل الخروج","Log out")}><LogOut size={18}/></button></div>
  </header>
  {drawer&&<button className="pro-overlay" aria-label={label("إغلاق القائمة","Close menu")} onClick={()=>setDrawer(false)}/>}
  <aside className={"pro-sidebar "+(drawer?"is-open":"")}>
   <div className="pro-sidebar-head"><img src="/business-owner-transparent.png" alt="Business Owner"/><button className="pro-close-drawer" aria-label={label("إغلاق القائمة","Close menu")} onClick={()=>setDrawer(false)}><X size={20}/></button></div>
   <div className="pro-sidebar-caption"><strong>BUSINESS OWNER</strong><span>CONTENT MANAGEMENT SYSTEM</span></div>
   <nav aria-label={label("أقسام لوحة التحكم","CMS navigation")}>
    {groups.map(group=><div className="pro-nav-group" key={group.id}><span className="pro-nav-group-label">{label(group.ar,group.en)}</span>
      {menuEntries.filter(x=>x.group===group.id).map(item=><button key={item.id} className={"pro-nav-item "+(tab===item.id?"active":"")} onClick={()=>navigate(item.id)} aria-current={tab===item.id?"page":undefined}><item.Icon size={18}/><span>{label(item.ar,item.en)}</span>{tab===item.id&&<ChevronLeft className="pro-active-arrow" size={14}/>}</button>)}
    </div>)}
   </nav>
   <div className="pro-side-footer"><span className="pro-side-status"/><span>{label("لوحة مرتبطة بقاعدة البيانات","Database-connected CMS")}</span></div>
  </aside>
  <main className="pro-main" id="main-content"><div className="pro-page-heading"><span className="pro-kicker">BUSINESS OWNER CMS</span><h1>{title}</h1><p>{tab==="dashboard"?label("إدارة حقيقية للمحتوى والعملاء وظهور الموقع من مكان واحد.","Manage content, leads and organic visibility in one place."):label("كل التغييرات تُحفظ في قاعدة البيانات بعد التأكيد.","Changes are saved to the database when confirmed.")}</p></div>{main}</main>
 </div>;
}
