const { SITE_URL, pages, escape } = require('../../scripts/seo-utils.cjs');
const modified = require('../../.seo/modified.json');
const { listArtists } = require('../../scripts/public-data.cjs');
exports.handler = async () => {
  try {
    const artists = await listArtists();
    const entries = Object.entries(pages).filter(([route,seo])=>!route.includes(':') && !seo.robots)
      .map(([route])=>({url:SITE_URL+route,date:modified[route]}));
    for (const artist of artists) entries.push({url:`${SITE_URL}/team/${encodeURIComponent(artist.name.split('/').pop())}`,date:artist.updateTime});
    return {statusCode:200,headers:{'Strict-Transport-Security':'max-age=31536000','X-Content-Type-Options':'nosniff','Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=300'},body:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(({url,date})=>`<url><loc>${escape(url)}</loc><lastmod>${escape(date)}</lastmod></url>`).join('')}</urlset>`};
  } catch (error) {
    console.error('Sitemap generation failed',error.message);
    return {statusCode:503,headers:{'Strict-Transport-Security':'max-age=31536000','X-Content-Type-Options':'nosniff','Retry-After':'300'},body:'Sitemap temporarily unavailable'};
  }
};
