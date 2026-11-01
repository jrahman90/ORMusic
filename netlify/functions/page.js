const fs = require('fs');
const {pages,metadata} = require('../../scripts/seo-utils.cjs');
exports.handler = async (event) => {
  const pathname = event.queryStringParameters?.path || event.path;
  const match = Object.entries(pages).find(([route])=>new RegExp('^'+route.replace(/:[^/]+/g,'[^/]+')+'/?$').test(pathname));
  const seo = match?.[1] || {title:'Page Not Found | OR Music Events',description:'The OR Music Events page you are looking for could not be found.',robots:'noindex, follow'};
  const template = fs.readFileSync('.seo/template.html','utf8');
  return {statusCode:match?200:404,headers:{'Strict-Transport-Security':'max-age=31536000','X-Content-Type-Options':'nosniff','Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',...(seo.robots?{'X-Robots-Tag':seo.robots}:{})},body:metadata(template,pathname,seo)};
};
