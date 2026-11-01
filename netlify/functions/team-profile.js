const fs = require('fs');
const {metadata,escape} = require('../../scripts/seo-utils.cjs');
const {getArtist} = require('../../scripts/public-data.cjs');
exports.handler = async (event) => {
  try {
    const id=event.queryStringParameters?.artistId || decodeURIComponent(event.path.split('/').filter(Boolean).pop());
    const artist=await getArtist(id);
    const template=fs.readFileSync('.seo/template.html','utf8');
    if(!artist) return {statusCode:404,headers:{'Strict-Transport-Security':'max-age=31536000','X-Content-Type-Options':'nosniff','Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex'},body:metadata(template,`/team/${encodeURIComponent(id)}`,{title:'Team Profile Not Found | OR Music Events',description:'This team profile could not be found.',robots:'noindex, follow'}).replace('<div id="root"></div>','<div id="root"><main><h1>Team profile not found</h1><a href="/team">Meet our DJs and MCs</a></main></div>')};
    const name=artist.fields?.name?.stringValue || 'Event specialist';
    const title=`${name} | OR Music Events`.slice(0,59);
    const description=`Meet ${name}, part of the OR Music Events team for NYC weddings, corporate events and private celebrations.`.slice(0,155);
    const bio=artist.fields?.description?.stringValue || description;
    const body=metadata(template,`/team/${encodeURIComponent(id)}`,{title,description}).replace('<div id="root"></div>',`<div id="root"><main><h1>${escape(name)}</h1><p>${escape(bio)}</p><a href="/team">Meet the team</a><a href="/services">Explore event services</a></main></div>`);
    return {statusCode:200,headers:{'Strict-Transport-Security':'max-age=31536000','X-Content-Type-Options':'nosniff','Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=300'},body};
  } catch(error) {console.error(error.message);return {statusCode:503,headers:{'Strict-Transport-Security':'max-age=31536000','X-Content-Type-Options':'nosniff','Retry-After':'60'},body:'Team profile temporarily unavailable'};}
};
