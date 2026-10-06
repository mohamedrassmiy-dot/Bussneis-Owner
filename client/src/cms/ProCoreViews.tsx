import { useMemo,useState } from "react";
import { trpc } from "../lib/trpc";
import { FileText,Files,Users,Image as ImageIcon,SearchCheck,ArrowLeftRight,RefreshCw,Plus,Download,Search,Trash2,Pencil,CheckCircle2,AlertTriangle,ExternalLink } from "lucide-react";
import type { ProLanguage,ProTab } from "../ProfessionalCMS";

const txt=(loc:ProLanguage,ar:string,en:string)=>loc==="ar"?ar:en;
const statusNames:Record<string,{ar:string;en:string}>={
 new:{ar:"جديد",en:"New"},contacted:{ar:"تم التواصل",en:"Contacted"},qualified:{ar:"مؤهل",en:"Qualified"},
 proposal:{ar:"عرض سعر",en:"Proposal"},won:{ar:"مكتمل",en:"Won"},lost:{ar:"خاسر",en:"Lost"},closed:{ar:"مغلق",en:"Closed"}
};
const csvSafe=(value:unknown)=>{let v=String(value??"");if(/^[\s]*[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};

export function ProDashboard({locale,navigate}:{locale:ProLanguage;navigate:(tab:ProTab)=>void}){
 const summary=trpc.pro.summary.useQuery(undefined,{refetchInterval:120000});
 const error=summary.error?.message;
 const d=summary.data;
 const cards=[
  {label:txt(locale,"الصفحات","Pages"),value:d?.pages,icon:Files,to:"pages" as const,note:txt(locale,`${d?.publishedPages??0} منشورة`,`${d?.publishedPages??0} published`)},
  {label:txt(locale,"المقالات","Articles"),value:d?.posts,icon:FileText,to:"posts" as const,note:txt(locale,`${d?.publishedPosts??0} منشورة`,`${d?.publishedPosts??0} published`)},
  {label:txt(locale,"طلبات العملاء","Leads"),value:d?.contactCount,icon:Users,to:"leads" as const,note:txt(locale,`${d?.newLeads??0} جديد`,`${d?.newLeads??0} new`)},
  {label:txt(locale,"الصور","Media files"),value:d?.images,icon:ImageIcon,to:"media" as const,note:txt(locale,"في مكتبة الوسائط","In media library")}
 ];
 return <div className="pro-form-stack">
  {error&&<div className="pro-notice error" role="alert">{error}</div>}
  <div className="pro-grid">{cards.map(item=><button type="button" className="pro-stat" key={item.to} onClick={()=>navigate(item.to)} style={{textAlign:"start"}}><item.icon size={22}/><small>{item.label}</small><strong>{item.value??"—"}</strong><span className="pro-muted">{item.note}</span></button>)}</div>
  <div className="pro-section-heading"><h2>{txt(locale,"إدارة سريعة","Quick actions")}</h2><button className="pro-btn compact" onClick={()=>summary.refetch()}><RefreshCw size={14}/>{txt(locale,"تحديث","Refresh")}</button></div>
  <div className="pro-card"><div className="pro-actions" style={{marginTop:0}}>
   <button className="pro-btn primary" onClick={()=>navigate("posts")}><Plus size={17}/>{txt(locale,"مقال جديد","New article")}</button>
   <button className="pro-btn" onClick={()=>navigate("pages")}><Plus size={17}/>{txt(locale,"صفحة جديدة","New page")}</button>
   <button className="pro-btn" onClick={()=>navigate("seo")}><SearchCheck size={17}/>{txt(locale,"فحص SEO","SEO review")}</button>
   <button className="pro-btn" onClick={()=>navigate("redirects")}><ArrowLeftRight size={17}/>{txt(locale,"إدارة الروابط","Redirects")}</button>
  </div></div>
  <div className="pro-section-heading"><h2>{txt(locale,"آخر التغييرات","Recent changes")}</h2><button className="pro-btn compact" onClick={()=>navigate("activity")}>{txt(locale,"عرض السجل","View log")}</button></div>
  <div className="pro-card">{!d?.recent?.length?<div className="pro-empty">{txt(locale,"لم تُسجّل تغييرات بعد.","No changes recorded yet.")}</div>:
   <div className="pro-table-scroll"><table className="pro-table"><thead><tr><th>{txt(locale,"الإجراء","Action")}</th><th>{txt(locale,"العنصر","Item")}</th><th>{txt(locale,"الوقت","Time")}</th></tr></thead><tbody>{d.recent.map(row=><tr key={row.id}><td><span className="pro-tag">{row.action}</span></td><td style={{direction:"ltr"}}>{row.subject||"—"}</td><td>{new Date(row.createdAt).toLocaleString(locale==="ar"?"ar-SA":"en-US")}</td></tr>)}</tbody></table></div>}
  </div>
 </div>;
}

export function ProLeads({locale}:{locale:ProLanguage}){
 const all=trpc.pro.leads.useQuery();
 const save=trpc.pro.updateLead.useMutation({onSuccess:()=>{all.refetch();setFeedback(txt(locale,"تم تحديث بيانات العميل.","Lead updated."));},onError:e=>setFeedback(e.message)});
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState("all");
 const [selected,setSelected]=useState<number|null>(null);
 const [notes,setNotes]=useState("");
 const [feedback,setFeedback]=useState("");
 const rows=all.data||[];
 const filtered=useMemo(()=>rows.filter(row=>(filter==="all"||row.status===filter)&&[row.name,row.email,row.company,row.service,row.source].join(" ").toLowerCase().includes(search.toLowerCase())),[rows,filter,search]);
 const active=rows.find(x=>x.id===selected);
 const exportCsv=()=>{
  const cols=["ID","Name","Email","Company","Service","Source","Status","Message","Notes","Created"];
  const content=[cols.map(csvSafe).join(","),...filtered.map(x=>[x.id,x.name,x.email,x.company,x.service,x.source,x.status,x.message,x.notes,x.createdAt].map(csvSafe).join(","))].join("\r\n");
  const url=URL.createObjectURL(new Blob(["\ufeff",content],{type:"text/csv;charset=utf-8;"}));
  const link=document.createElement("a");link.href=url;link.download="business-owner-leads.csv";link.click();URL.revokeObjectURL(url);
 };
 return <div className="pro-form-stack">
  {feedback&&<div className={"pro-notice "+(save.isError?"error":"")}>{feedback}</div>}
  <div className="pro-grid">{["new","qualified","proposal","won"].map(status=><div className="pro-stat" key={status}><Users size={20}/><small>{txt(locale,statusNames[status].ar,statusNames[status].en)}</small><strong>{rows.filter(x=>x.status===status).length}</strong></div>)}</div>
  <div className="pro-card"><div className="pro-section-heading" style={{marginTop:0}}><h2>{txt(locale,"قائمة العملاء","Leads list")}</h2><button className="pro-btn" onClick={exportCsv}><Download size={16}/>CSV</button></div>
  <div className="pro-controls"><input className="pro-input" placeholder={txt(locale,"بحث بالاسم أو البريد أو الشركة...","Search name, email or company...")} value={search} onChange={e=>setSearch(e.target.value)} style={{flex:"1 1 250px"}}/>
   <select className="pro-input" aria-label={txt(locale,"فلترة المرحلة","Filter stage")} value={filter} onChange={e=>setFilter(e.target.value)} style={{flex:"0 1 180px"}}><option value="all">{txt(locale,"كل المراحل","All stages")}</option>{Object.entries(statusNames).map(([status,item])=><option key={status} value={status}>{txt(locale,item.ar,item.en)}</option>)}</select>
   <button className="pro-btn" onClick={()=>all.refetch()}><RefreshCw size={15}/></button>
  </div>
  {all.isError&&<div className="pro-notice error">{all.error.message}</div>}
  {!filtered.length?<div className="pro-empty">{txt(locale,"لا توجد طلبات مطابقة.","No matching leads.")}</div>:
  <div className="pro-table-scroll"><table className="pro-table"><thead><tr><th>{txt(locale,"العميل","Lead")}</th><th>{txt(locale,"التواصل","Contact")}</th><th>{txt(locale,"المرحلة","Stage")}</th><th>{txt(locale,"المصدر","Source")}</th><th></th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td><strong>{row.name}</strong><small>{row.company||"—"}</small></td><td><a href={"mailto:"+row.email} style={{color:"#0866ef"}}>{row.email}</a></td><td><span className="pro-tag">{txt(locale,statusNames[row.status]?.ar||row.status,statusNames[row.status]?.en||row.status)}</span></td><td>{row.source||"website"}</td><td><button className="pro-btn compact" onClick={()=>{setSelected(row.id);setNotes(row.notes||"");}}>{txt(locale,"تفاصيل","Details")}</button></td></tr>)}</tbody></table></div>}
  </div>
  {active&&<section className="pro-card" aria-label={txt(locale,"تفاصيل العميل","Lead details")}><div className="pro-section-heading" style={{marginTop:0}}><h2>{active.name}</h2><button className="pro-btn compact" onClick={()=>setSelected(null)}>{txt(locale,"إغلاق","Close")}</button></div>
   <p>{active.message}</p><p className="pro-muted">{active.email} · {active.service||"—"}</p>
   <div className="pro-form-grid"><label className="pro-field"><span>{txt(locale,"المرحلة","Stage")}</span><select value={active.status} onChange={e=>save.mutate({id:active.id,status:e.target.value as any})}>{Object.entries(statusNames).map(([status,n])=><option key={status} value={status}>{txt(locale,n.ar,n.en)}</option>)}</select></label><label className="pro-field"><span>{txt(locale,"مصدر الطلب","Lead source")}</span><input value={active.source||"website"} readOnly/></label></div>
   <label className="pro-field" style={{marginTop:15}}><span>{txt(locale,"ملاحظات داخلية","Internal notes")}</span><textarea rows={4} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={txt(locale,"ملاحظات لا تظهر للعميل","Private notes, not visible to the customer")}/></label>
   <div className="pro-actions"><button className="pro-btn primary" disabled={save.isPending} onClick={()=>save.mutate({id:active.id,notes})}>{txt(locale,"حفظ المتابعة","Save notes")}</button><a className="pro-btn" href={"mailto:"+active.email}>{txt(locale,"إرسال بريد","Email lead")}</a></div>
  </section>}
 </div>;
}

export function ProRedirects({locale}:{locale:ProLanguage}){
 const list=trpc.pro.redirects.useQuery();
 const save=trpc.pro.saveRedirect.useMutation({onSuccess:()=>{list.refetch();reset();setFeedback(txt(locale,"تم حفظ التحويل.","Redirect saved."));},onError:e=>setFeedback(e.message)});
 const remove=trpc.pro.deleteRedirect.useMutation({onSuccess:()=>list.refetch()});
 const [form,setForm]=useState({id:undefined as number|undefined,sourcePath:"",destination:"",type:"301" as "301"|"302",active:true});
 const [feedback,setFeedback]=useState("");
 const reset=()=>setForm({id:undefined,sourcePath:"",destination:"",type:"301",active:true});
 return <div className="pro-form-stack">
  {feedback&&<div className={"pro-notice "+(save.isError?"error":"")}>{feedback}</div>}
  <section className="pro-card"><h2>{txt(locale,form.id?"تعديل تحويل":"إضافة تحويل 301/302",form.id?"Edit redirect":"Add a 301/302 redirect")}</h2>
   <p className="pro-hint">{txt(locale,"التحويلات داخل Business Owner فقط. الروابط /Admin و/api محمية.","Only internal Business Owner URLs are accepted. Admin and API paths are protected.")}</p>
   <div className="pro-form-grid"><label className="pro-field ltr"><span>From</span><input placeholder="/old-page" value={form.sourcePath} onChange={e=>setForm(v=>({...v,sourcePath:e.target.value}))}/></label><label className="pro-field ltr"><span>To</span><input placeholder="/new-page" value={form.destination} onChange={e=>setForm(v=>({...v,destination:e.target.value}))}/></label>
    <label className="pro-field"><span>Type</span><select value={form.type} onChange={e=>setForm(v=>({...v,type:e.target.value as "301"|"302"}))}><option value="301">301 — Permanent</option><option value="302">302 — Temporary</option></select></label><label className="pro-field"><span>{txt(locale,"الحالة","Status")}</span><select value={form.active?"1":"0"} onChange={e=>setForm(v=>({...v,active:e.target.value==="1"}))}><option value="1">{txt(locale,"مفعّل","Active")}</option><option value="0">{txt(locale,"معطّل","Disabled")}</option></select></label></div>
   <div className="pro-actions"><button className="pro-btn primary" disabled={save.isPending} onClick={()=>save.mutate(form)}>{txt(locale,"حفظ التحويل","Save redirect")}</button>{form.id&&<button className="pro-btn" onClick={reset}>{txt(locale,"إلغاء التعديل","Cancel edit")}</button>}</div>
  </section>
  <section className="pro-card"><h2>{txt(locale,"التحويلات المسجلة","Saved redirects")}</h2>{list.isError&&<div className="pro-notice error">{list.error.message}</div>}
    {!list.data?.length?<div className="pro-empty">{txt(locale,"لا توجد تحويلات.","No redirects yet.")}</div>:<div className="pro-table-scroll"><table className="pro-table"><thead><tr><th>From</th><th>To</th><th>Type</th><th>{txt(locale,"الحالة","Status")}</th><th></th></tr></thead><tbody>{list.data.map(r=><tr key={r.id}><td style={{direction:"ltr"}}>{r.sourcePath}</td><td style={{direction:"ltr"}}>{r.destination}</td><td>{r.type}</td><td><span className={"pro-tag "+(r.active?"green":"grey")}>{r.active?txt(locale,"مفعّل","Active"):txt(locale,"معطّل","Disabled")}</span></td><td><div className="pro-inline"><button className="pro-btn compact" onClick={()=>setForm({id:r.id,sourcePath:r.sourcePath,destination:r.destination,type:r.type,active:!!r.active})}><Pencil size={14}/></button><button className="pro-btn compact danger" disabled={remove.isPending} onClick={()=>{if(confirm(txt(locale,"حذف التحويل؟","Delete this redirect?")))remove.mutate({id:r.id});}}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div>}</section>
 </div>;
}
export function ProSeo({locale,edit}:{locale:ProLanguage;edit:(kind:"page"|"post",id:number)=>void}){
 const query=trpc.pro.seoAudit.useQuery();
 const rows=query.data||[];
 const [search,setSearch]=useState("");
 const filtered=rows.filter(x=>[x.title,x.slug,x.locale].join(" ").toLowerCase().includes(search.toLowerCase()));
 const avg=rows.length?Math.round(rows.reduce((a,b)=>a+b.score,0)/rows.length):null;
 const missing=rows.filter(x=>!x.metaOk).length;
 const noindex=rows.filter(x=>x.robots?.startsWith("noindex")).length;
 const needsReview=rows.filter(x=>x.score<75).length;
 return <div className="pro-form-stack">
  <div className="pro-grid">{[
   {label:txt(locale,"متوسط اكتمال SEO","Average SEO completion"),val:avg===null?"—":avg+"%"},
   {label:txt(locale,"بيانات Meta ناقصة","Missing meta"),val:missing},
   {label:"Noindex",val:noindex},
   {label:txt(locale,"تحتاج مراجعة","Needs review"),val:needsReview},
  ].map(x=><div className="pro-stat" key={x.label}><SearchCheck size={20}/><small>{x.label}</small><strong>{x.val}</strong></div>)}</div>
  <div className="pro-card"><h2>{txt(locale,"فحص SEO للصفحات والمقالات","SEO content audit")}</h2><p className="pro-hint">{txt(locale,"درجة استكمال الحقول والمحتوى داخل CMS، وليست ترتيبًا في Google أو نتيجة Lighthouse.","This measures CMS content completeness, not Google rankings or Lighthouse scores.")}</p><input className="pro-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder={txt(locale,"ابحث عن صفحة أو مقال","Search a page or article")}/>
  {query.isError&&<div className="pro-notice error">{query.error.message}</div>}
  {!filtered.length?<div className="pro-empty">{txt(locale,"لا يوجد محتوى مطابق.","No matching content.")}</div>:<div className="pro-table-scroll" style={{marginTop:16}}><table className="pro-table"><thead><tr><th>{txt(locale,"المحتوى","Content")}</th><th>{txt(locale,"اللغة","Language")}</th><th>{txt(locale,"الدرجة","Score")}</th><th>{txt(locale,"مطلوب","To improve")}</th><th></th></tr></thead><tbody>{filtered.map(r=><tr key={r.kind+r.id}><td><strong>{r.title}</strong><small>{r.kind} · {r.slug}</small></td><td>{r.locale.toUpperCase()}</td><td><span className={"pro-tag "+(r.score>=75?"green":r.score<45?"red":"amber")}>{r.score}/100</span></td><td><small>{r.warnings.slice(0,3).join(" · ")||"—"}</small></td><td><button className="pro-btn compact" onClick={()=>edit(r.kind,r.id)}>{txt(locale,"تحسين","Edit")}</button></td></tr>)}</tbody></table></div>}</div>
 </div>;
}
