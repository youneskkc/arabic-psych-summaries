// ============================================================
// قل المستجدات في علم النفس بالعربية
// يجلب أحدث المقالات من ScienceDaily Psychology و PsyPost
// يترجم العناوين والملخصات إلى العربية باستخدام Lingva (مجاني، بدون مفتاح)
// العنوان والملخص قابلان للنسخ
// ============================================================

const RSS_FEEDS = [
    {
        name: "ScienceDaily Psychology",
        url: "https://www.sciencedaily.com/rss/health_medicine/psychology.xml"
    },
    {
        name: "PsyPost",
        url: "https://www.psypost.org/feed/"
    }
];

// جلب الخلاصة وتحويلها إلى JSON عبر rss2json (يتعامل مع CORS)
async function fetchFeed(feed) {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
    try {
        const response = await fetch(proxyUrl);
        const data = await response.json();
        if (data.status === "ok") {
            return data.items.map(item => ({
                title: item.title,
                summary: item.description || item.content?.substring(0, 300) || "لا يوجد ملخص",
                link: item.link,
                pubDate: new Date(item.pubDate),
                source: feed.name
            }));
        } else {
            console.error(`فشل في جلب ${feed.name}:`, data);
            return [];
        }
    } catch (err) {
        console.error(`خطأ في جلب ${feed.name}:`, err);
        return [];
    }
}

// ترجمة النص إلى العربية باستخدام Lingva (مجاني، بدون مفتاح)
async function translateToArabic(text) {
    if (!text || text.length === 0) return text;
    try {
        // استخدام واجهة Lingva العامة
        const apiUrl = `https://lingva.ml/api/v1/en/ar/${encodeURIComponent(text.slice(0, 1000))}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        return data.translation || text;
    } catch (err) {
        console.warn("فشلت الترجمة، سيتم عرض النص الأصلي:", err);
        return text;
    }
}

// الوظيفة الرئيسية: جلب الأخبار، ترتيبها، ترجمتها، عرضها
async function loadAndDisplayNews() {
    const container = document.getElementById("newsContainer");
    container.innerHTML = "🔄 جاري تحميل الأخبار وترجمتها...";

    // 1. جلب جميع الخلاصات بالتوازي
    const allArticles = (await Promise.all(RSS_FEEDS.map(fetchFeed))).flat();

    if (allArticles.length === 0) {
        container.innerHTML = "❌ لم يتم العثور على أخبار. تحقق من اتصالك أو حاول مرة أخرى.";
        return;
    }

    // 2. ترتيب من الأحدث إلى الأقدم
    allArticles.sort((a, b) => b.pubDate - a.pubDate);
    const latest6 = allArticles.slice(0, 6);

    // 3. ترجمة كل مقال (العنوان والملخص)
    container.innerHTML = "🌍 جاري الترجمة إلى العربية...";
    const translatedArticles = [];
    for (const article of latest6) {
        const translatedTitle = await translateToArabic(article.title);
        const translatedSummary = await translateToArabic(article.summary);
        translatedArticles.push({
            ...article,
            titleAr: translatedTitle,
            summaryAr: translatedSummary
        });
    }

    // 4. عرض النتائج مع إمكانية نسخ العنوان والملخص
    renderNews(translatedArticles);
}

function renderNews(articles) {
    const container = document.getElementById("newsContainer");
    if (articles.length === 0) {
        container.innerHTML = "⚠️ لا توجد مقالات لعرضها.";
        return;
    }

    let html = "";
    for (const art of articles) {
        html += `
            <div class="news-item">
                <div class="news-title">📌 ${escapeHtml(art.titleAr)}</div>
                <div class="news-summary">${escapeHtml(art.summaryAr)}</div>
                <div class="news-meta">
                    المصدر: ${escapeHtml(art.source)} | 
                    ${art.pubDate.toLocaleDateString("ar-EG")}
                </div>
                <a href="${art.link}" target="_blank" rel="noopener noreferrer">🔗 اقرأ الأصل (English)</a>
            </div>
        `;
    }
    container.innerHTML = html;
}

// منع هجمات XSS مع الحفاظ على قابلية النسخ
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ربط زر التحديث بالوظيفة
document.getElementById("refreshBtn").addEventListener("click", loadAndDisplayNews);

// تحميل الأخبار تلقائياً عند فتح الصفحة
loadAndDisplayNews();
