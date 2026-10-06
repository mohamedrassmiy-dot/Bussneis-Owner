import { useEffect,useMemo,useState } from "react";
import { trpc } from "../lib/trpc";
import { FilePlus2,Search,RefreshCw,ExternalLink,Languages,Save,Eye,Trash2,Image as ImageIcon,ArrowUp,ArrowDown,Plus,ChevronRight,CheckCircle2,AlertTriangle } from "lucide-react";
import type {ProLanguage} from "../ProfessionalCMS";
const t=(locale:ProLanguage,ar:string,en:string)=>locale==="ar"?ar:en;
type Locale="ar"|"en";
type SectionType="hero"|"text"|"image"|"embed"|"cta"|"faq";
type Section={id:string;type:SectionType;title?:string;body?:string;image?:string;alt?:string;url?:string;buttonLabel?:string;buttonUrl?:string};
type Embed={type:"video"|"iframe";url:string;title?:string};
type RecordType={
 id?:number;contentKey:string;locale:Locale;slug:string;title:string;summary:string;excerpt:string;body:string;category:string;
 featuredImage:string;imageAlt:string;ogImage:string;seoTitle:string;seoDescription:string;canonicalUrl:string;
 robots:"index,follow"|"noindex,follow"|"noindex,nofollow";schemaJson:string;
 status:"draft"|"published";sections:Section[];embeds:Embed[];
};
const initial=(locale:Locale="ar"):RecordType=>({
 contentKey:"",locale,slug:"",title:"",summary:"",excerpt:"",body:"",category:"",featuredImage:"",imageAlt:"",
 ogImage:"",seoTitle:"",seoDescription:"",canonicalUrl:"",robots:"index,follow",schemaJson:"",
 status:"draft",sections:[],embeds:[],
});
const newSection=(type:SectionType):Section=>({id:"section-"+crypto.randomUUID(),type,title:"",body:""});
function pathFor(record:RecordType,kind:"page"|"post"){
 const prefix=record.locale==="ar"?"":"/en";
 if(kind==="post"){
  if(["growth-needs-a-system","offer-before-logo","the-90-day-decision"].includes(record.slug))return prefix+"/articles/"+record.slug;
  return prefix+"/blog/"+record.slug;
 }
 if(record.slug==="home")return prefix||"/";
 if(["services","articles","about","contact"].includes(record.slug))return prefix+"/"+record.slug;
 if(record.slug.startsWith("service-"))return prefix+"/services/"+record.slug.slice(8);
 return prefix+"/p/"+record.slug;
}
function translateDraft(item:RecordType):RecordType{
 return {...item,id:undefined,locale:item.locale==="ar"?"en":"ar",status:"draft",title:"",summary:"",excerpt:"",body:"",
  seoTitle:"",seoDescription:"",sections:item.sections.map(x=>({...x,id:"section-"+crypto.randomUUID()}))};
}
const str=(value:string)=>value.trim()||null;
function ContentEditor({kind,locale,entry,close,afterSave}:{kind:"page"|"post";locale:ProLanguage;entry:RecordType;close:()=>void;afterSave:()=>void}){
 const [value,setValue]=useState<RecordType>(entry);
 const [editorTab,setEditorTab]=useState<"content"|"sections"|"media"|"seo">("content");
 const [notice,setNotice]=useState("");
 const [uploading,setUploading]=useState(false);
 const utilities=trpc.useUtils();
 const savePage=trpc.cms.savePage.useMutation();
 const savePost=trpc.cms.savePost.useMutation();
 const remove=trpc.cms.deleteContent.useMutation();
 const set=<K extends keyof RecordType>(key:K,v:RecordType[K])=>setValue(x=>({...x,[key]:v}));
 const updateSection=(i:number,prop:keyof Section,nextValue:string)=>set("sections",value.sections.map((s,j)=>j===i?{...s,[prop]:nextValue}:s));
 const move=(from:number,to:number)=>{if(to<0||to>=value.sections.length)return;const next=[...value.sections];const item=next.splice(from,1)[0];next.splice(to,0,item);set("sections",next);};
 const upload=async(file:File,target:"featuredImage"|"ogImage"|number)=>{
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5*1024*1024){setNotice(t(locale,"يجب أن تكون الصورة PNG/JPEG/WebP وبحد أقصى 5MB","Only PNG/JPEG/WebP images up to 5MB allowed."));return;}
  setUploading(true);
  try{
   const resp=await fetch("/api/admin/media",{method:"POST",credentials:"same-origin",headers:{"Content-Type":file.type},body:file});
   const data=await resp.json();if(!resp.ok||!data.url)throw new Error(data.error||"Upload failed");
   if(typeof target==="number")set("sections",value.sections.map((section,i)=>i===target?{...section,image:data.url}:section));
   else set(target,data.url);
   setNotice(t(locale,"تم رفع الصورة إلى مكتبة الوسائط.","Image uploaded to Media Library."));
  }catch(e){setNotice(String(e));}
  finally{setUploading(false);}
 };
 const save=async(status:"draft"|"published")=>{
  setNotice("");
  if(!/^[a-z0-9-]{2,180}$/.test(value.slug)){setNotice(t(locale,"Slug غير صالح؛ استخدم أحرفًا إنجليزية وأرقامًا وشرطة فقط.","Slug must use lowercase letters, numbers and hyphens."));return;}
  if(!/^[a-z0-9-]{2,120}$/.test(value.contentKey)){setNotice("Content Key must use lowercase a-z, numbers and hyphens.");return;}
  if(value.title.trim().length<3){setNotice(t(locale,"أدخل عنوانًا من 3 أحرف على الأقل.","Title must contain at least 3 characters."));return;}
  try{
   const common={id:value.id,contentKey:value.contentKey,locale:value.locale,slug:value.slug,title:value.title,status,
    featuredImage:str(value.featuredImage),imageAlt:str(value.imageAlt),ogImage:str(value.ogImage),
    seoTitle:str(value.seoTitle),seoDescription:str(value.seoDescription),canonicalUrl:str(value.canonicalUrl),robots:value.robots,schemaJson:str(value.schemaJson)};
   const saved=kind==="page"?await savePage.mutateAsync({...common,summary:str(value.summary),sections:value.sections}):await savePost.mutateAsync({...common,excerpt:value.excerpt,body:value.body,category:str(value.category),embeds:value.embeds});
   setValue(prev=>({...prev,id:saved.id,status}));
   await Promise.all([utilities.cms.pages.invalidate(),utilities.cms.posts.invalidate(),utilities.pro.seoAudit.invalidate(),utilities.pro.summary.invalidate()]);
   setNotice(status==="published"?t(locale,"تم حفظ المحتوى ونشره على الموقع.","Content saved and published.") :t(locale,"تم حفظ المسودة.","Draft saved."));
   afterSave();
  }catch(e){setNotice(t(locale,"فشل الحفظ: ","Save failed: ")+(e instanceof Error?e.message:String(e)));}
 };
 const del=async()=>{
  if(!value.id||!confirm(t(locale,"هل تريد حذف هذا المحتوى نهائيًا؟","Permanently delete this content?")))return;
  try{await remove.mutateAsync({kind,id:value.id});await utilities.cms.pages.invalidate();await utilities.cms.posts.invalidate();close();}
  catch(e){setNotice(String(e));}
 };
 const bind=(label:string,key:keyof Pick<RecordType,"contentKey"|"slug"|"title"|"summary"|"excerpt"|"body"|"category"|"seoTitle"|"seoDescription"|"canonicalUrl"|"schemaJson"|"imageAlt"|"featuredImage"|"ogImage">,rows=0)=><label className={"pro-field "+(["slug","contentKey","canonicalUrl","featuredImage","ogImage","schemaJson"].includes(key)?"ltr":"")}>
   <span>{label}</span>{rows?<textarea rows={rows} value={String(value[key])} onChange={e=>set(key,e.target.value)}/>:<input value={String(value[key])} onChange={e=>set(key,e.target.value)}/>}
  </label>;
 return <div className="pro-form-stack">
  <div className="pro-section-heading" style={{marginTop:0}}><h2>{value.id?t(locale,"تعديل المحتوى","Edit content"):t(locale,"إنشاء محتوى جديد","Create content")}</h2><div className="pro-inline"><a className="pro-btn compact" href={pathFor(value,kind)} target="_blank" rel="noreferrer"><Eye size={15}/>{t(locale,"فتح الرابط","Open URL")}</a><button className="pro-btn compact" onClick={close}>{t(locale,"رجوع","Back")}</button></div></div>
  {notice&&<div className={"pro-notice "+(/فشل|error|fail|must|غير صالح/.test(notice)?"error":"")} role="status">{notice}</div>}
  <div className="pro-editor-grid">
   <div className="pro-form-stack">
    <div className="pro-card">
     <div className="pro-tabs">{(["content",...(kind==="page"?["sections"]:[]),"media","seo"] as const).map(view=><button key={view} className={editorTab===view?"active":""} onClick={()=>setEditorTab(view as typeof editorTab)}>{({content:t(locale,"المحتوى","Content"),sections:t(locale,"الأقسام","Sections"),media:t(locale,"الصور","Media"),seo:"SEO"})[view]}</button>)}</div>
     {editorTab==="content"&&<div className="pro-form-stack">
      <div className="pro-form-grid"><label className="pro-field"><span>{t(locale,"اللغة","Language")}</span><select value={value.locale} onChange={e=>set("locale",e.target.value as Locale)}><option value="ar">العربية</option><option value="en">English</option></select></label><label className="pro-field"><span>{t(locale,"الحالة","Status")}</span><select value={value.status} onChange={e=>set("status",e.target.value as "draft"|"published")}><option value="draft">{t(locale,"مسودة","Draft")}</option><option value="published">{t(locale,"منشور","Published")}</option></select></label></div>
      {bind("Content Key — shared by both translations","contentKey")}{bind("Slug","slug")}{bind(t(locale,"العنوان","Title"),"title")}
      {kind==="page"?bind(t(locale,"مقدمة الصفحة","Page summary"),"summary",4):<>{bind(t(locale,"مقتطف المقال","Excerpt"),"excerpt",3)}{bind(t(locale,"نص المقال (فقرات مفصولة بسطر فارغ)","Article body (separate paragraphs with blank lines)"),"body",15)}{bind(t(locale,"التصنيف","Category"),"category")}</>}
     </div>}
     {editorTab==="sections"&&kind==="page"&&<div className="pro-form-stack">
      <p className="pro-hint">{t(locale,"غيّر ترتيب الأقسام أو أضف قسمًا جديدًا؛ النصوص تظهر في النسخة المنشورة بعد الحفظ.","Reorder, edit and add sections. Published changes appear after saving.")}</p>
      {value.sections.map((sec,i)=><div className="pro-section-editor" key={sec.id}>
       <div className="pro-section-heading" style={{marginTop:0}}><strong>{i+1}. {sec.type.toUpperCase()}</strong><div className="pro-inline">
       <button className="pro-btn compact" aria-label="Move section up" onClick={()=>move(i,i-1)} disabled={i===0}><ArrowUp size={14}/></button>
       <button className="pro-btn compact" aria-label="Move section down" onClick={()=>move(i,i+1)} disabled={i===value.sections.length-1}><ArrowDown size={14}/></button>
       <button className="pro-btn compact danger" aria-label="Remove section" onClick={()=>set("sections",value.sections.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></div></div>
       <div className="pro-form-stack">
       <label className="pro-field"><span>{t(locale,"نوع القسم","Section type")}</span><select value={sec.type} onChange={e=>updateSection(i,"type",e.target.value)}>{(["hero","text","image","embed","cta","faq"] as const).map(type=><option value={type} key={type}>{type.toUpperCase()}</option>)}</select></label>
       <label className="pro-field"><span>{t(locale,"العنوان","Title")}</span><input value={sec.title||""} onChange={e=>updateSection(i,"title",e.target.value)}/></label>
       {sec.type!=="embed"&&<label className="pro-field"><span>{t(locale,"المحتوى","Body")}</span><textarea rows={4} value={sec.body||""} onChange={e=>updateSection(i,"body",e.target.value)}/></label>}
       {(sec.type==="hero"||sec.type==="image"||sec.type==="text")&&<><label className="pro-field ltr"><span>Image URL</span><input value={sec.image||""} onChange={e=>updateSection(i,"image",e.target.value)}/></label><label className="pro-field"><span>Image ALT</span><input value={sec.alt||""} onChange={e=>updateSection(i,"alt",e.target.value)}/></label><label className="pro-field"><span>{t(locale,"رفع صورة للقسم","Upload section image")}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f,i);}}/></label>{sec.image&&<img src={sec.image} style={{maxWidth:260,maxHeight:160,objectFit:"contain"}} alt={sec.alt||""}/>}</>}
       {sec.type==="embed"&&<label className="pro-field ltr"><span>HTTPS Embed URL (YouTube/Vimeo/Google/Figma)</span><input value={sec.url||""} onChange={e=>updateSection(i,"url",e.target.value)}/></label>}
       {sec.type==="cta"&&<><label className="pro-field"><span>{t(locale,"نص الزر","Button label")}</span><input value={sec.buttonLabel||""} onChange={e=>updateSection(i,"buttonLabel",e.target.value)}/></label><label className="pro-field ltr"><span>Destination URL (internal)</span><input value={sec.buttonUrl||""} onChange={e=>updateSection(i,"buttonUrl",e.target.value)}/></label></>}
       </div></div>)}
      <div className="pro-actions">{(["hero","text","image","embed","cta","faq"] as const).map(type=><button className="pro-btn compact" key={type} onClick={()=>set("sections",[...value.sections,newSection(type)])}><Plus size={13}/>{type.toUpperCase()}</button>)}</div>
     </div>}
     {editorTab==="media"&&<div className="pro-form-stack">
      {bind("Featured image URL","featuredImage")}<label className="pro-field"><span>{t(locale,"رفع صورة الغلاف","Upload featured image")}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f,"featuredImage");}}/></label>
      {value.featuredImage&&<img src={value.featuredImage} alt={value.imageAlt||"Preview"} style={{width:"100%",maxHeight:240,objectFit:"contain",background:"#f6f9fe",borderRadius:12}}/>}
      {bind("Image ALT","imageAlt")}
      {bind("Open Graph image URL","ogImage")}<label className="pro-field"><span>{t(locale,"رفع صورة المشاركة","Upload OG image")}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f,"ogImage");}}/></label>
      {kind==="post"&&<><h3>Embeds</h3>{value.embeds.map((em,i)=><div key={i} className="pro-section-editor"><label className="pro-field ltr"><span>Embed URL</span><input value={em.url} onChange={e=>set("embeds",value.embeds.map((a,j)=>j===i?{...a,url:e.target.value}:a))}/></label><div className="pro-actions"><button className="pro-btn compact danger" onClick={()=>set("embeds",value.embeds.filter((_,j)=>j!==i))}>{t(locale,"حذف","Remove")}</button></div></div>)}<button className="pro-btn" onClick={()=>set("embeds",[...value.embeds,{type:"iframe",url:"",title:""}])}><Plus size={16}/>Embed</button></>}
     </div>}
     {editorTab==="seo"&&<div className="pro-form-stack">
      {bind("SEO Title","seoTitle")}{bind("Meta Description","seoDescription",4)}
      <small className="pro-muted">{value.seoTitle.length} / 65 · {value.seoDescription.length} / 160</small>
      {bind("Canonical URL","canonicalUrl")}
      <label className="pro-field"><span>Robots</span><select value={value.robots} onChange={e=>set("robots",e.target.value as RecordType["robots"])}><option>index,follow</option><option>noindex,follow</option><option>noindex,nofollow</option></select></label>
      {bind("Structured Data JSON-LD","schemaJson",8)}
      <div className="pro-section-editor"><span style={{color:"#526e8b",fontSize:12}}>Google preview (approximate)</span><strong style={{display:"block",marginTop:8,color:"#1359a0",fontSize:17}}>{value.seoTitle||value.title||"Page title"}</strong><small style={{direction:"ltr",display:"block",color:"#187b5a"}}>{pathFor(value,kind)}</small><p>{value.seoDescription||value.summary||value.excerpt||"Meta description"}</p></div>
     </div>}
    </div>
   </div>
   <aside className="pro-editor-sidebar">
    <section className="pro-card"><h2>{t(locale,"النشر","Publishing")}</h2><p className="pro-hint">{value.status==="published"?t(locale,"هذه النسخة منشورة حاليًا.","Currently published."):t(locale,"المحتوى مسودة وغير ظاهر للعامة.","Draft: not visible to visitors.")}</p>
    <div className="pro-form-stack"><button className="pro-btn primary block" disabled={savePage.isPending||savePost.isPending||uploading} onClick={()=>save(value.status)}><Save size={17}/>{value.status==="published"?t(locale,"حفظ ونشر","Save & publish"):t(locale,"حفظ مسودة","Save draft")}</button>
    {value.status==="draft"&&<button className="pro-btn block" disabled={savePage.isPending||savePost.isPending} onClick={()=>save("published")}>{t(locale,"نشر الآن","Publish now")}</button>}
    {value.status==="published"&&<button className="pro-btn block" disabled={savePage.isPending||savePost.isPending} onClick={()=>save("draft")}>{t(locale,"إلغاء النشر","Unpublish")}</button>}
    {value.id&&<button className="pro-btn danger block" onClick={del}><Trash2 size={16}/>{t(locale,"حذف نهائي","Delete permanently")}</button>}</div></section>
    <section className="pro-card"><h2>SEO Checklist</h2><ul style={{margin:0,paddingInlineStart:20,color:"#566d84",lineHeight:2}}>
    <li>{value.seoTitle.length>=15&&value.seoTitle.length<=65?"✓":"○"} SEO Title</li>
    <li>{value.seoDescription.length>=70&&value.seoDescription.length<=160?"✓":"○"} Meta Description</li>
    <li>{value.featuredImage?"✓":"○"} Featured Image</li>
    <li>{!value.featuredImage||value.imageAlt?"✓":"○"} Image ALT</li>
    <li>{value.schemaJson?"✓":"○"} JSON-LD</li></ul></section>
   </aside>
  </div>
 </div>;
}
function normalizeRecord(item:any):RecordType{
 return {...initial(item?.locale==="en"?"en":"ar"),...item,
   locale:item?.locale==="en"?"en":"ar",
   status:item?.status==="published"?"published":"draft",
   robots:(["index,follow","noindex,follow","noindex,nofollow"].includes(item?.robots)?item.robots:"index,follow") as RecordType["robots"],
   featuredImage:item?.featuredImage||"",imageAlt:item?.imageAlt||"",summary:item?.summary||"",excerpt:item?.excerpt||"",body:item?.body||"",
   category:item?.category||"",ogImage:item?.ogImage||"",seoTitle:item?.seoTitle||"",seoDescription:item?.seoDescription||"",
   canonicalUrl:item?.canonicalUrl||"",schemaJson:item?.schemaJson||"",sections:item?.sections||[],embeds:item?.embeds||[]
 };
}
export function ProContent({kind,locale,editTarget,clearTarget}:{kind:"page"|"post";locale:ProLanguage;editTarget:{kind:"page"|"post";id:number}|null;clearTarget:()=>void}){
 const pages=trpc.cms.pages.useQuery();
 const posts=trpc.cms.posts.useQuery();
 const rows=kind==="page"?pages.data:posts.data;
 const [search,setSearch]=useState("");
 const [language,setLanguage]=useState("all");
 const [status,setStatus]=useState("all");
 const [editing,setEditing]=useState<RecordType|null>(null);
 const [filterError,setFilterError]=useState("");
 useEffect(()=>{
  if(editTarget&&editTarget.kind===kind&&rows){
   const item=rows.find(x=>x.id===editTarget.id);
   if(item)setEditing(normalizeRecord(item));
  }
 },[editTarget,kind,rows]);
 const open=(item:any)=>setEditing(normalizeRecord(item));
 const filtered=(rows||[]).filter(x=>(language==="all"||x.locale===language)&&(status==="all"||x.status===status)&&[x.title,x.slug,x.contentKey].join(" ").toLowerCase().includes(search.toLowerCase()));
 if(editing)return <ContentEditor kind={kind} locale={locale} entry={editing} close={()=>{setEditing(null);clearTarget();}} afterSave={()=>{kind==="page"?pages.refetch():posts.refetch();}}/>;
 return <section className="pro-card"><div className="pro-section-heading" style={{marginTop:0}}><h2>{t(locale,kind==="page"?"الصفحات العربية والإنجليزية":"المقالات العربية والإنجليزية",kind==="page"?"All pages":"All articles")}</h2><div className="pro-inline"><button className="pro-btn compact" onClick={()=>kind==="page"?pages.refetch():posts.refetch()}><RefreshCw size={15}/></button><button className="pro-btn primary" onClick={()=>setEditing(initial(locale))}><FilePlus2 size={16}/>{t(locale,"إضافة جديد","Create new")}</button></div></div>
 <div className="pro-controls"><input className="pro-input" placeholder={t(locale,"ابحث بالعنوان أو Slug","Search title or slug")} value={search} onChange={e=>setSearch(e.target.value)} style={{flex:"1 1 210px"}}/>
 <select className="pro-input" aria-label="Language" value={language} onChange={e=>setLanguage(e.target.value)} style={{flex:"0 1 160px"}}><option value="all">{t(locale,"كل اللغات","All languages")}</option><option value="ar">العربية</option><option value="en">English</option></select>
 <select className="pro-input" aria-label="Publishing status" value={status} onChange={e=>setStatus(e.target.value)} style={{flex:"0 1 160px"}}><option value="all">{t(locale,"كل الحالات","All statuses")}</option><option value="draft">{t(locale,"مسودات","Drafts")}</option><option value="published">{t(locale,"منشور","Published")}</option></select>
 </div>
 {(kind==="page"?pages:posts).isError&&<div className="pro-notice error">{(kind==="page"?pages:posts).error?.message}</div>}
 {!filtered.length?<div className="pro-empty">{t(locale,"لا توجد سجلات مطابقة؛ اضغط «إضافة جديد».","No matching records. Create a new one.")}</div>:<div className="pro-table-scroll"><table className="pro-table"><thead><tr><th>{t(locale,"العنوان","Title")}</th><th>{t(locale,"اللغة","Language")}</th><th>{t(locale,"الحالة","Status")}</th><th>AR / EN</th><th>{t(locale,"الإجراءات","Actions")}</th></tr></thead><tbody>{filtered.map(row=>{
 const other=(rows||[]).find(x=>x.contentKey===row.contentKey&&x.locale!==(row.locale));
 return <tr key={row.id}><td><strong>{row.title}</strong><small>{row.slug}</small></td><td><span className="pro-language-pill">{row.locale.toUpperCase()}</span></td><td><span className={"pro-tag "+(row.status==="published"?"green":"amber")}>{row.status==="published"?t(locale,"منشور","Published"):t(locale,"مسودة","Draft")}</span></td><td>{other?<span className="pro-tag green">AR ✓ EN</span>:<button className="pro-btn compact" onClick={()=>setEditing(translateDraft(normalizeRecord(row)))}><Languages size={13}/>{t(locale,"ترجمة","Translate")}</button>}</td><td><div className="pro-inline"><button className="pro-btn compact" onClick={()=>open(row)}>{t(locale,"تعديل","Edit")}</button><a className="pro-btn compact ghost" href={pathFor(normalizeRecord(row),kind)} target="_blank" rel="noreferrer" title="View original URL"><ExternalLink size={14}/></a></div></td></tr>})}</tbody></table></div>}
 <p className="pro-hint" style={{marginTop:16}}>{t(locale,"الصفحات القديمة المستوردة محفوظة كمسودات، ولا تغيّر الصفحة العامة حتى تنشرها من المحرر.","Imported legacy pages remain drafts and do not replace live pages until published.")}</p>
 </section>;
}
