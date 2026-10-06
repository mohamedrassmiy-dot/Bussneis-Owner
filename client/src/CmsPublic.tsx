import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { trpc } from "./lib/trpc";
type Locale="ar"|"en";
const site="Business Owner";
function Seo({item,locale}:{item:any;locale:Locale}){
 useEffect(()=>{
  const prevTitle=document.title;
  document.title=item.seoTitle||item.title+" | "+site;
  const html=document.documentElement;const prevLang=html.lang;const prevDir=html.dir;
  html.lang=locale;html.dir=locale==="ar"?"rtl":"ltr";
  const setMeta=(name:string,content:string,attr:"name"|"property"="name")=>{
   let el=document.head.querySelector<HTMLMetaElement>('meta['+attr+'="'+name+'"]');
   if(!el){el=document.createElement("meta");el.setAttribute(attr,name);document.head.appendChild(el)}
   const prev=el.content;el.content=content;return()=>{el!.content=prev};
  };
  const cleanups=[setMeta("description",item.seoDescription||item.summary||item.excerpt||""),setMeta("robots",item.robots||"index,follow"),setMeta("og:title",item.seoTitle||item.title,"property"),setMeta("og:description",item.seoDescription||item.summary||item.excerpt||"","property")];
  if(item.ogImage||item.featuredImage)cleanups.push(setMeta("og:image",item.ogImage||item.featuredImage,"property"));
  let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if(!canonical){canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical)}
  const prevCanonical=canonical.href;canonical.href=item.canonicalUrl||window.location.href;
  let schema:HTMLScriptElement|null=null;
  if(item.schemaJson){try{JSON.parse(item.schemaJson);schema=document.createElement("script");schema.type="application/ld+json";schema.textContent=item.schemaJson;document.head.appendChild(schema)}catch{}}
  return()=>{document.title=prevTitle;html.lang=prevLang;html.dir=prevDir;cleanups.forEach(fn=>fn());if(canonical)canonical.href=prevCanonical;schema?.remove()};
 },[item,locale]);return null;
}
const safeEmbed=(url:string)=>{
 try{const u=new URL(url);return u.protocol==="https:"&&["www.youtube.com","youtube.com","www.youtube-nocookie.com","player.vimeo.com","www.google.com","maps.google.com","www.figma.com"].includes(u.hostname.toLowerCase())?u.href:null}catch{return null}
};
function Section({section}:{section:any}){
 if(section.type==="embed"){const url=safeEmbed(section.url||"");return url?<section className="public-cms-section"><iframe src={url} title={section.title||"Embedded content"} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation" referrerPolicy="strict-origin-when-cross-origin"/></section>:null}
 return <section className={"public-cms-section public-cms-"+section.type}>
 {section.title&&<h2>{section.title}</h2>}
 {section.image&&<img src={section.image} alt={section.alt||section.title||""} loading="lazy"/>}
 {section.body&&<p>{section.body}</p>}
 {section.type==="cta"&&section.buttonUrl&&<a className="public-cms-cta" href={section.buttonUrl}>{section.buttonLabel||"Contact us"}</a>}
 </section>;
}
export function CmsPage({slug,locale}:{slug:string;locale:Locale}){
 const {data,isLoading,isError}=trpc.cms.publishedPage.useQuery({slug,locale});
 if(isLoading)return <div className="public-cms-wrap">Loading…</div>;
 if(isError||!data)return <div className="public-cms-wrap"><h1>{locale==="ar"?"الصفحة غير متاحة":"Page not found"}</h1><Link href={locale==="ar"?"/":"/en"}>{locale==="ar"?"الرئيسية":"Home"}</Link></div>;
 return <article className="public-cms-wrap" lang={locale} dir={locale==="ar"?"rtl":"ltr"}><Seo item={data} locale={locale}/><header><h1>{data.title}</h1>{data.summary&&<p>{data.summary}</p>}</header>{data.featuredImage&&<img className="public-cms-cover" src={data.featuredImage} alt={data.imageAlt||data.title}/>} {(data.sections||[]).map((section:any)=><Section key={section.id} section={section}/>)}</article>;
}
export function CmsPost({slug,locale}:{slug:string;locale:Locale}){
 const {data,isLoading,isError}=trpc.cms.publishedPost.useQuery({slug,locale});
 if(isLoading)return <div className="public-cms-wrap">Loading…</div>;
 if(isError||!data)return <div className="public-cms-wrap"><h1>{locale==="ar"?"المقال غير متاح":"Article not found"}</h1><Link href={locale==="ar"?"/":"/en"}>{locale==="ar"?"الرئيسية":"Home"}</Link></div>;
 return <article className="public-cms-wrap public-cms-post" lang={locale} dir={locale==="ar"?"rtl":"ltr"}><Seo item={data} locale={locale}/><header><span>{data.category}</span><h1>{data.title}</h1><p>{data.excerpt}</p></header>{data.featuredImage&&<img className="public-cms-cover" src={data.featuredImage} alt={data.imageAlt||data.title}/>}<div className="public-cms-body">{data.body.split(/\n\n+/).map((p:string,i:number)=><p key={i}>{p}</p>)}</div>{(data.embeds||[]).map((embed:any,i:number)=>{const url=safeEmbed(embed.url);return url?<Section key={i} section={{type:"embed",url,title:embed.title}}/>:null})}</article>;
}

/** Existing routes can be edited by publishing a CMS page with the matching slug.
 * Until then, the original route stays visible and is never silently deleted. */
export function CmsOverride({slug,locale,children}:{slug:string;locale:Locale;children:ReactNode}){
 const result=trpc.cms.publishedPage.useQuery({slug,locale},{retry:false});
 if(result.data)return slug==="contact"?<><CmsPage slug={slug} locale={locale}/>{children}</>:<CmsPage slug={slug} locale={locale}/>;
 return <>{children}</>;
}

/** Existing article URL remains unchanged while published CMS edits take priority. */
export function CmsPostOverride({slug,locale,children}:{slug:string;locale:Locale;children:ReactNode}){
 const result=trpc.cms.publishedPost.useQuery({slug,locale},{retry:false});
 if(result.data)return <CmsPost slug={slug} locale={locale}/>;
 return <>{children}</>;
}
