import { useEffect,useMemo,useState } from "react";
import { trpc } from "../lib/trpc";
import { Image as ImageIcon, UploadCloud,Copy,ExternalLink,RefreshCw,ShieldCheck,LogOut, Save,AlertTriangle,Download } from "lucide-react";
import type { ProLanguage } from "../ProfessionalCMS";
const tx=(locale:ProLanguage,ar:string,en:string)=>locale==="ar"?ar:en;
type SettingKey=
  "site_name_ar"|"site_name_en"|"site_description_ar"|"site_description_en"|"contact_email"|"favicon_url"|"brand_tagline_ar"|"brand_tagline_en"
  |"seo_default_title_ar"|"seo_default_title_en"|"seo_default_description_ar"|"seo_default_description_en"
  |"default_og_image"|"global_schema_json"|"ga4_id"|"gtm_id"|"google_site_verification"
  |"gsc_verification_file_name"|"gsc_verification_file_content"|"robots_txt"|"head_embed"|"footer_embed";
type InputDef={key:SettingKey;ar:string;en:string;rows?:number;hint?:string};
const sections:{key:string;ar:string;en:string;fields:InputDef[]}[]=[
 {key:"general",ar:"الهوية والبيانات العامة",en:"Business & identity",fields:[
  {key:"site_name_ar",ar:"اسم الموقع بالعربية",en:"Arabic site name"},
  {key:"site_name_en",ar:"اسم الموقع بالإنجليزية",en:"English site name"},
  {key:"site_description_ar",ar:"وصف الموقع بالعربية",en:"Arabic description",rows:3},
  {key:"site_description_en",ar:"وصف الموقع بالإنجليزية",en:"English description",rows:3},
  {key:"brand_tagline_ar",ar:"شعار نصّي بالعربية",en:"Arabic tagline"},
  {key:"brand_tagline_en",ar:"شعار نصّي بالإنجليزية",en:"English tagline"},
  {key:"contact_email",ar:"بريد التواصل",en:"Contact email"},
  {key:"favicon_url",ar:"مسار أيقونة الموقع",en:"Favicon URL",hint:"/business-owner-transparent.png"},
 ]},
 {key:"seo",ar:"SEO العام",en:"Global SEO",fields:[
  {key:"seo_default_title_ar",ar:"عنوان SEO الافتراضي عربي",en:"Default Arabic SEO title"},
  {key:"seo_default_title_en",ar:"عنوان SEO الافتراضي إنجليزي",en:"Default English SEO title"},
  {key:"seo_default_description_ar",ar:"Meta Description الافتراضي عربي",en:"Default Arabic meta description",rows:3},
  {key:"seo_default_description_en",ar:"Meta Description الافتراضي إنجليزي",en:"Default English meta description",rows:3},
  {key:"default_og_image",ar:"صورة المشاركة الافتراضية",en:"Default OG image URL"},
  {key:"ga4_id",ar:"معرف GA4",en:"GA4 Measurement ID"},
  {key:"gtm_id",ar:"معرف Google Tag Manager",en:"GTM container ID"},
  {key:"global_schema_json",ar:"Global JSON-LD Schema",en:"Global JSON-LD Schema",rows:6},
 ]},
 {key:"robots",ar:"robots.txt وأدوات الزحف",en:"robots.txt & crawling",fields:[
  {key:"robots_txt",ar:"محتوى robots.txt",en:"robots.txt content",rows:13}
 ]},
 {key:"advanced",ar:"إعدادات متقدمة",en:"Advanced settings",fields:[
  {key:"head_embed",ar:"Head Embed — حفظ فقط",en:"Head embed — stored only",rows:6,hint:"لا يتم تنفيذ أكواد مخصّصة على الموقع بدون مراجعة أمنية."},
  {key:"footer_embed",ar:"Footer Embed — حفظ فقط",en:"Footer embed — stored only",rows:6,hint:"Custom script execution is disabled for security."}
 ]},
];
export function ProSettings({locale}:{locale:ProLanguage}){
 const settings=trpc.cms.settings.useQuery();
 const save=trpc.cms.saveSetting.useMutation();
 const [tab,setTab]=useState("general");
 const [values,setValues]=useState<Partial<Record<SettingKey,string>>>({});
 const [dirty,setDirty]=useState<SettingKey[]>([]);
 const [notice,setNotice]=useState("");
 const [file,setFile]=useState<{name:string;content:string}|null>(null);
 useEffect(()=>{if(settings.data){setValues(Object.fromEntries(settings.data.map(x=>[x.key,x.value])));setDirty([]);}},[settings.data]);
 const update=(key:SettingKey,value:string)=>{setValues(v=>({...v,[key]:value}));setDirty(d=>d.includes(key)?d:[...d,key]);};
 const section=sections.find(x=>x.key===tab);
 const saveGroup=async(keys:SettingKey[])=>{
  setNotice("");
  try{
   for(const key of keys)await save.mutateAsync({key,value:values[key]||""});
   setDirty(d=>d.filter(x=>!keys.includes(x)));
   await settings.refetch();
   setNotice(tx(locale,"تم حفظ الإعدادات في قاعدة البيانات.","Settings saved to the database."));
  }catch(error){setNotice(tx(locale,"تعذر الحفظ: ","Save failed: ")+(error instanceof Error?error.message:String(error)));}
 };
 const parseGscFile=async(f:File)=>{
  if(f.size>10000){setNotice(tx(locale,"ملف التحقق أكبر من 10KB.","Google verification file exceeds 10KB."));return;}
  const content=(await f.text()).trim();
  const match=/^google-site-verification:\s*(google[a-z0-9_-]{8,90}\.html)$/i.exec(content);
  if(!match){setNotice(tx(locale,"محتوى الملف ليس بصيغة Google الرسمية.","The file does not contain a valid Google verification directive."));return;}
  const canonicalName=match[1];
  setFile({name:canonicalName,content:`google-site-verification: ${canonicalName}`});
  setNotice(f.name===canonicalName
    ?tx(locale,"ملف التحقق جاهز للحفظ.","Verification file is ready to save.")
    :tx(locale,`تم اكتشاف أن الهاتف غيّر اسم الملف إلى «${f.name}». سيتم استخدام اسم Google الأصلي «${canonicalName}» تلقائيًا.`,`Your device renamed the download to “${f.name}”. The original Google filename “${canonicalName}” will be used automatically.`));
 };
 const saveGsc=async()=>{
  setNotice("");
  try{
   await save.mutateAsync({key:"google_site_verification",value:(values.google_site_verification||"").trim().replace(/^<meta[^>]+content=["']([^"']+)["'][^>]*>$/i,"$1")});
   if(file){await save.mutateAsync({key:"gsc_verification_file_name",value:file.name});await save.mutateAsync({key:"gsc_verification_file_content",value:file.content});}
   await settings.refetch();
   setNotice(tx(locale,"تم حفظ إعدادات Google Search Console.","Google Search Console settings saved."));
  }catch(error){setNotice(String(error));}
 };
 return <div className="pro-form-stack">
  {notice&&<div className={"pro-notice "+(/فشل|تعذر|fail|Invalid/.test(notice)?"error":"")} role="status">{notice}</div>}
  <div className="pro-tabs">{sections.map(s=><button key={s.key} className={tab===s.key?"active":""} onClick={()=>setTab(s.key)}>{tx(locale,s.ar,s.en)}</button>)}<button className={tab==="gsc"?"active":""} onClick={()=>setTab("gsc")}>Google Search Console</button></div>
  {settings.isError&&<div className="pro-notice error">{settings.error.message}</div>}
  {section&&<section className="pro-card"><h2>{tx(locale,section.ar,section.en)}</h2><div className="pro-form-grid">{section.fields.map(f=><label key={f.key} className={"pro-field "+(f.key.includes("url")||f.key.includes("schema")||f.key==="robots_txt"?"ltr":"")} style={f.rows?{gridColumn:"1/-1"}:{}}><span>{tx(locale,f.ar,f.en)}</span>
     {f.rows?<textarea rows={f.rows} value={values[f.key]||""} onChange={e=>update(f.key,e.target.value)}/>:<input value={values[f.key]||""} onChange={e=>update(f.key,e.target.value)} placeholder={f.hint||""}/>}
     {f.hint&&<small>{f.hint}</small>}
    </label>)}</div>
    <div className="pro-actions"><button className="pro-btn primary" disabled={save.isPending||!section.fields.some(f=>dirty.includes(f.key))} onClick={()=>saveGroup(section.fields.map(x=>x.key))}><Save size={16}/>{tx(locale,"حفظ الإعدادات","Save settings")}</button>
    {section.key==="robots"&&<><a className="pro-btn" href="/robots.txt" target="_blank" rel="noreferrer"><ExternalLink size={15}/>robots.txt</a><a className="pro-btn" href="/sitemap.xml" target="_blank" rel="noreferrer"><ExternalLink size={15}/>sitemap.xml</a></>}</div></section>}
  {tab==="advanced"&&<section className="pro-card"><h2>Cache Flush</h2><p className="pro-hint">{tx(locale,"يمسح Cache Storage لهذا الموقع على هذا الجهاز ويعيد تحميل بيانات لوحة التحكم. لا يمسح كاش محركات البحث أو CDN.","Clears this site's browser Cache Storage on your device, then reloads the CMS. It does not invalidate external CDN or search engine caches.")}</p><button className="pro-btn" onClick={async()=>{try{if("caches" in window){const keys=await window.caches.keys();await Promise.all(keys.map(k=>window.caches.delete(k)));}window.location.reload();}catch(e){setNotice(String(e));}}}>{tx(locale,"مسح الكاش المحلي","Clear local cache")}</button></section>}
    {tab==="gsc"&&<><section className="pro-card"><h2>Google Search Console</h2><p className="pro-hint">{tx(locale,"التحقق باستخدام Meta Tag أو ملف HTML من Google. احفظ البيانات ثم افتح Google Search Console للتحقق.","Verify ownership using Google's meta token or verification HTML file.")}</p>
   <label className="pro-field ltr"><span>Google verification token / meta tag</span><input value={values.google_site_verification||""} onChange={e=>update("google_site_verification",e.target.value)} placeholder="google-site-verification token"/></label>
   <label className="pro-field" style={{marginTop:18}}><span>{tx(locale,"ملف HTML الرسمي للتحقق","Official HTML verification file")}</span><input type="file" accept=".html,text/html" onChange={e=>{const f=e.target.files?.[0];if(f)void parseGscFile(f);}}/></label>
   {(file||values.gsc_verification_file_name)&&<div className="pro-notice"><strong>{file?.name||values.gsc_verification_file_name}</strong> — {tx(locale,"ملف التحقق المحدد","Selected verification file")}</div>}
   <div className="pro-actions"><button className="pro-btn primary" disabled={save.isPending} onClick={saveGsc}>{tx(locale,"حفظ إعدادات التحقق","Save verification")}</button>{(file||values.gsc_verification_file_name)&&<a className="pro-btn" href={"/"+(file?.name||values.gsc_verification_file_name)} target="_blank" rel="noreferrer">HTML <ExternalLink size={14}/></a>}<a className="pro-btn" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Open Search Console</a></div>
  </section><section className="pro-card"><h2>Sitemap & Robots</h2><p className="pro-hint">{tx(locale,"خريطة الموقع تعرض صفحات ومقالات CMS المنشورة فقط؛ المسودات غير مدرجة.","The sitemap includes published CMS pages and articles, not drafts.")}</p><div className="pro-actions"><a href="/sitemap.xml" target="_blank" rel="noreferrer" className="pro-btn">↗ Sitemap</a><a href="/robots.txt" target="_blank" rel="noreferrer" className="pro-btn">↗ robots.txt</a></div></section></>}
 </div>;
}
export function ProMedia({locale}:{locale:ProLanguage}){
 const images=trpc.pro.media.useQuery();
 const update=trpc.pro.mediaAlt.useMutation({onSuccess:()=>images.refetch()});
 const [uploading,setUploading]=useState(false);
 const [notice,setNotice]=useState("");
 const [search,setSearch]=useState("");
 const upload=async(file:File)=>{
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){setNotice(tx(locale,"JPG/PNG/WebP فقط بحد أقصى 5MB","JPG/PNG/WebP only, maximum 5MB"));return;}
  setUploading(true);setNotice("");
  try{const r=await fetch("/api/admin/media",{method:"POST",credentials:"same-origin",headers:{"Content-Type":file.type},body:file});const body=await r.json();if(!r.ok)throw new Error(body.error||"Upload error");await images.refetch();setNotice(tx(locale,"تم رفع الصورة بنجاح.","Image uploaded successfully."));}
  catch(e){setNotice(String(e));}finally{setUploading(false);}
 };
 const filtered=(images.data||[]).filter(x=>[x.originalName,x.fileKey,x.alt].join(" ").toLowerCase().includes(search.toLowerCase()));
 return <div className="pro-form-stack">
 {notice&&<div className="pro-notice" role="status">{notice}</div>}
 <section className="pro-card"><h2>{tx(locale,"مكتبة الصور","Media library")}</h2><p className="pro-hint">{tx(locale,"الملفات مرفوعة إلى تخزين الموقع ومُسجلة في MySQL، ويمكن استخدام روابطها في محرر الصفحات والمقالات.","Images are stored in object storage and indexed in MySQL, ready to use in content editors.")}</p>
 <div className="pro-controls"><label className="pro-btn primary"><UploadCloud size={18}/>{uploading?tx(locale,"جاري الرفع","Uploading"):tx(locale,"رفع صورة","Upload image")}<input type="file" accept="image/png,image/jpeg,image/webp" style={{position:"absolute",width:1,height:1,opacity:0}} disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/></label><input className="pro-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder={tx(locale,"البحث عن صورة","Search images")} style={{flex:"1 1 260px"}}/><button className="pro-btn" onClick={()=>images.refetch()}><RefreshCw size={16}/></button></div>
 {images.isError&&<div className="pro-notice error">{images.error.message}</div>}
 {!filtered.length?<div className="pro-empty">{tx(locale,"لا توجد صور. ارفع أول صورة.","No images yet. Upload one to start.")}</div>:<div className="pro-media-grid">{filtered.map(img=><div key={img.id} className="pro-media-tile"><img src={img.publicUrl} alt={img.alt||img.originalName||"CMS media"} loading="lazy"/><div className="pro-media-tile-content"><small>{img.fileKey.split("/").pop()}</small><small>{Math.round(img.bytes/1024)} KB · {img.mime.split("/")[1]}</small><div className="pro-actions"><button className="pro-btn compact" onClick={async()=>{await navigator.clipboard.writeText(img.publicUrl);setNotice(tx(locale,"تم نسخ الرابط","URL copied"));}}><Copy size={14}/>{tx(locale,"نسخ","Copy")}</button><button className="pro-btn compact" onClick={()=>{const alt=prompt(tx(locale,"وصف الصورة البديل","Image ALT text"),img.alt||"");if(alt!==null)update.mutate({id:img.id,alt});}}>ALT</button></div></div></div>)}</div>}
 </section></div>;
}
export function ProSecurity({locale}:{locale:ProLanguage}){
 const user=trpc.auth.me.useQuery();
 const log=trpc.pro.security.useQuery();
 const logout=trpc.auth.logout.useMutation({onSuccess:()=>window.location.reload()});
 const [currentPassword,setCurrentPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [pending,setPending]=useState(false);
 const [notice,setNotice]=useState("");
 const changePassword=async()=>{
  setNotice("");
  if(newPassword.length<12||newPassword!==confirmPassword){setNotice(tx(locale,"يجب أن تتكون كلمة المرور من 12 حرفًا على الأقل وأن تتطابق مع التأكيد.","Use at least 12 characters and match the confirmation."));return;}
  setPending(true);
  try{
   const res=await fetch("/api/admin/change-password",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword,newPassword})});
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"Password change failed");
   setCurrentPassword("");setNewPassword("");setConfirmPassword("");
   alert(tx(locale,"تم تغيير كلمة المرور، ويجب تسجيل الدخول مجددًا.","Password changed. Please sign in again."));
   window.location.reload();
  }catch(error){setNotice(error instanceof Error?error.message:String(error));}
  finally{setPending(false);}
 };
 const revokeOthers=async()=>{
  if(!confirm(tx(locale,"سيتم إبطال الجلسات القديمة والإبقاء على جلستك الحالية. متابعة؟","Other admin sessions will be invalidated. Continue?")))return;
  setPending(true);setNotice("");
  try{
   const res=await fetch("/api/admin/logout-others",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Unable to revoke sessions");
   setNotice(tx(locale,"تم إبطال الجلسات الأخرى.","Other sessions have been invalidated."));await log.refetch();
  }catch(error){setNotice(String(error));}
  finally{setPending(false);}
 };
 return <div className="pro-form-stack">
  {notice&&<div className="pro-notice" role="status">{notice}</div>}
  <section className="pro-card"><h2>{tx(locale,"تغيير كلمة المرور","Change password")}</h2>
   <p className="pro-hint">{tx(locale,"يُطلب إدخال كلمة المرور الحالية، ثم تُحفظ الجديدة مشفّرة باستخدام scrypt. تغيير كلمة المرور يبطل الجلسات القديمة.","The old password is verified before storing a new scrypt password hash. Existing sessions are invalidated.")}</p>
   <div className="pro-form-stack" style={{maxWidth:550}}>
    <label className="pro-field"><span>{tx(locale,"كلمة المرور الحالية","Current password")}</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
    <label className="pro-field"><span>{tx(locale,"كلمة المرور الجديدة","New password")}</span><input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
    <label className="pro-field"><span>{tx(locale,"تأكيد كلمة المرور الجديدة","Confirm new password")}</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label>
    <button className="pro-btn primary" disabled={pending||!currentPassword||!newPassword||!confirmPassword} onClick={changePassword}><ShieldCheck size={16}/>{tx(locale,"تغيير كلمة المرور","Update password")}</button>
   </div></section>
  <section className="pro-card"><h2>{tx(locale,"الجلسات والأمان","Sessions & account security")}</h2>
   <div className="pro-stat" style={{maxWidth:430,marginBottom:18}}><small>{tx(locale,"جلسة المدير الحالية","Current admin session")}</small><strong style={{fontSize:24}}>1</strong><p className="pro-muted">{user.data?.email||"—"}</p></div>
   <p className="pro-hint">{tx(locale,"الجلسات محمية بـHttpOnly وSameSite Strict؛ إبطال الجلسات الأخرى يُغيّر إصدار الجلسة على الخادم.","HttpOnly / SameSite Strict session cookies; server-side version rotation invalidates earlier sessions.")}</p>
   <div className="pro-actions"><button className="pro-btn danger" disabled={pending} onClick={revokeOthers}>{tx(locale,"إبطال الجلسات الأخرى","Revoke other sessions")}</button><button className="pro-btn" disabled={logout.isPending} onClick={()=>logout.mutate()}><LogOut size={16}/>{tx(locale,"تسجيل الخروج","Log out")}</button></div>
  </section>
  <section className="pro-card"><h2>{tx(locale,"سجل محاولات الدخول","Security event log")}</h2><p className="pro-hint">{tx(locale,"عناوين IP محفوظة كبصمة مشفّرة، وليس كنص خام.","IP addresses are stored as hashes, not raw strings.")}</p>
    {log.isError&&<div className="pro-notice error">{log.error.message}</div>}
    {!log.data?.length?<div className="pro-empty">{tx(locale,"لا توجد أحداث أمنية مسجلة.","No security events recorded.")}</div>:<div className="pro-table-scroll"><table className="pro-table"><thead><tr><th>{tx(locale,"الحدث","Event")}</th><th>IP fingerprint</th><th>{tx(locale,"الوقت","Time")}</th></tr></thead><tbody>{log.data.map(x=><tr key={x.id}><td><span className="pro-tag">{x.action}</span></td><td style={{direction:"ltr"}}>{x.ipFingerprint.slice(0,12)}…</td><td>{new Date(x.createdAt).toLocaleString(locale==="ar"?"ar-SA":"en-US")}</td></tr>)}</tbody></table></div>}
  </section>
 </div>;
}
export function ProActivity({locale}:{locale:ProLanguage}){
 const log=trpc.pro.audit.useQuery();
 return <section className="pro-card"><div className="pro-section-heading" style={{marginTop:0}}><h2>{tx(locale,"سجل تغييرات CMS","CMS change history")}</h2><button className="pro-btn compact" onClick={()=>log.refetch()}><RefreshCw size={15}/>{tx(locale,"تحديث","Refresh")}</button></div>
 {log.isError&&<div className="pro-notice error">{log.error.message}</div>}
 {!log.data?.length?<div className="pro-empty">{tx(locale,"لا توجد تغييرات مسجلة.","No recorded changes.")}</div>:<div className="pro-table-scroll"><table className="pro-table"><thead><tr><th>{tx(locale,"الإجراء","Action")}</th><th>{tx(locale,"العنصر","Subject")}</th><th>{tx(locale,"الوقت","Time")}</th></tr></thead><tbody>{log.data.map(x=><tr key={x.id}><td>{x.action}</td><td>{x.subject||"—"}</td><td>{new Date(x.createdAt).toLocaleString(locale==="ar"?"ar-SA":"en-US")}</td></tr>)}</tbody></table></div>}
 </section>;
}
