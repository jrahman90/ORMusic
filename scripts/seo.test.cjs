const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {pages,metadata} = require('./seo-utils.cjs');
const {JSDOM} = require('jsdom');
const publicRoutes = Object.entries(pages).filter(([path,seo])=>!path.includes(':')&&!seo.robots);
test('public HTML has unique metadata, one H1, sequential headings, valid images and internal links',()=>{
  const titles=new Set();const descriptions=new Set();
  for(const [path,seo] of publicRoutes){
    const file=path==='/'?'build/index.html':`build${path}/index.html`;
    const doc=new JSDOM(fs.readFileSync(file,'utf8')).window.document;
    assert.equal(doc.title,seo.title);assert.ok(doc.title.length<60);assert.ok(!titles.has(doc.title));titles.add(doc.title);
    const description=doc.querySelector('meta[name="description"]').content;
    assert.ok(description.length<160);assert.ok(!descriptions.has(description));descriptions.add(description);
    assert.equal(doc.querySelector('link[rel="canonical"]').href,'https://ormusicevents.com'+path);
    assert.equal(doc.querySelectorAll('h1').length,1,path);
    let level=0;for(const h of doc.querySelectorAll('h1,h2,h3,h4,h5,h6')){const next=Number(h.tagName[1]);assert.ok(next<=level+1,`${path}: heading skipped from ${level} to ${next}`);level=next;}
    for(const img of doc.querySelectorAll('img')){assert.ok(img.alt,`${path}: missing alt`);if(img.src.startsWith('/'))assert.ok(fs.existsSync('build'+img.src),img.src);}
    for(const a of doc.querySelectorAll('a[href^="/"]')){assert.ok(pages[a.getAttribute('href')],`${path}: unknown link ${a.href}`);}
    for(const script of doc.querySelectorAll('script[type="application/ld+json"]'))JSON.parse(script.textContent);
    for(const key of ['og:title','og:description','og:image','og:url']) assert.ok(doc.querySelector(`meta[property="${key}"]`).content);
  }
});
test('metadata escapes untrusted profile content',()=>{
  const doc=new JSDOM(metadata(fs.readFileSync('.seo/template.html','utf8'),'/team/example',{title:'Artist <script>alert(1)</script>',description:'Quotes " & <img src=x>'})).window.document;
  assert.equal(doc.title,'Artist <script>alert(1)</script>');assert.equal(doc.querySelector('meta[name="description"]').content,'Quotes " & <img src=x>');
  assert.equal(doc.querySelectorAll('script:not([src]):not([type="application/ld+json"])').length,0);
});
test('dynamic sitemap includes paginated artist data and does not silently omit failures',async()=>{
  const original=global.fetch;let count=0;
  global.fetch=async()=>({ok:true,status:200,json:async()=>++count===1?{documents:[{name:'artists/CaseSensitiveID',updateTime:'2026-01-01T00:00:00Z'}],nextPageToken:'next'}:{documents:[]}});
  try{const result=await require('../netlify/functions/sitemap').handler();assert.equal(result.statusCode,200);assert.match(result.body,/\/team\/CaseSensitiveID/);assert.equal(count,2);assert.match(result.body,/<lastmod>/);
    global.fetch=async()=>({ok:false,status:403});assert.equal((await require('../netlify/functions/sitemap').handler()).statusCode,503);
  }finally{global.fetch=original;}
});
test('private routes get noindex response headers and unknown URLs return HTTP 404',async()=>{
  const {handler}=require('../netlify/functions/page');
  const result=await handler({queryStringParameters:{path:'/inquiries'}});assert.equal(result.statusCode,200);assert.match(result.headers['X-Robots-Tag'],/noindex/);assert.match(result.body,/canonical" href="https:\/\/ormusicevents.com\/inquiries/);
  assert.equal((await handler({path:'/missing-page'})).statusCode,404);
});
test('dynamic team HTML has unique metadata and returns 404 for missing artists',async()=>{
  const original=global.fetch;
  global.fetch=async()=>({ok:true,status:200,json:async()=>({fields:{name:{stringValue:'DJ Example'},description:{stringValue:'Wedding DJ and MC.'}}})});
  try{const {handler}=require('../netlify/functions/team-profile');const result=await handler({queryStringParameters:{artistId:'TestID'},path:'/team/TestID'});assert.equal(result.statusCode,200);const doc=new JSDOM(result.body).window.document;assert.equal(doc.querySelectorAll('h1').length,1);assert.equal(doc.title,'DJ Example | OR Music Events');assert.equal(doc.querySelector('link[rel="canonical"]').href,'https://ormusicevents.com/team/TestID');
    global.fetch=async()=>({status:404});assert.equal((await handler({path:'/team/missing'})).statusCode,404);
  }finally{global.fetch=original;}
});
