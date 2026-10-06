import { cmsList, cmsSavePost } from "./db";
import { originalArticles } from "./cmsLegacyData";

// Only expand text on known, untouched initial drafts. Never overwrite editorial changes.
const previousSeedBodies: Record<string,string> = {
  "offer-before-logo": "الهوية ليست طبقة تزيين فوق العمل. هي وعد مختصر يجيب عن سؤال العميل: لماذا هذا الخيار مناسب لي الآن؟ لذلك نبدأ دائماً بالعرض قبل الألوان.",
  "the-90-day-decision": "خطة النمو ليست قائمة أمنيات؛ بل اختيار واضح للأولويات التي تستحق التنفيذ والمتابعة خلال تسعين يوماً.",
};
export async function restoreOriginalArticleDrafts() {
  const current = await cmsList("post");
  let expanded = 0;
  for(const original of originalArticles){
    if(original.locale !== "ar") continue;
    const row=current.find(x=>x.locale==="ar" && x.slug===original.slug);
    if(!row || !("body" in row) || row.status!=="draft" || row.title!==original.title) continue;
    if(row.body!==previousSeedBodies[original.slug]) continue;
    await cmsSavePost({ id:row.id, contentKey:row.contentKey, locale:row.locale,
      slug:row.slug, title:row.title, excerpt:row.excerpt, body:original.body.join("\n\n"), status:row.status });
    expanded++;
  }
  return {expanded};
}
