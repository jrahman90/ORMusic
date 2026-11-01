const SITE_URL = 'https://ormusicevents.com';
const pages = require('../src/seo-pages.json');
const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function metadata(html, path, seo) {
  const url = SITE_URL + path;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(seo.title)}</title>`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escape(url)}" />`);
  for (const [key, value] of Object.entries({description:seo.description, robots:seo.robots || 'index, follow, max-image-preview:large', 'og:title':seo.title, 'og:description':seo.description, 'og:url':url, 'twitter:title':seo.title, 'twitter:description':seo.description})) {
    const attr = key.startsWith('og:') ? 'property' : 'name';
    html = html.replace(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*\\/?>`), `<meta ${attr}="${key}" content="${escape(value)}" />`);
  }
  const graph = {'@context':'https://schema.org','@type':'WebPage','@id':url+'#webpage',url,name:seo.title,description:seo.description,isPartOf:{'@id':SITE_URL+'/#website'}};
  if (path !== '/') graph.breadcrumb = {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE_URL+'/'},{'@type':'ListItem',position:2,name:seo.title.split('|')[0].trim(),item:url}]};
  return html.replace('</head>', `<script id="page-schema" type="application/ld+json">${JSON.stringify(graph).replace(/</g,'\\u003c')}</script></head>`);
}
module.exports = { SITE_URL, pages, escape, metadata };
