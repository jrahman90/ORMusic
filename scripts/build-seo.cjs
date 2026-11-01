const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {pages, metadata} = require('./seo-utils.cjs');
// Compile only application modules for server rendering; browser assets have no server side effects.
const original = require.extensions['.js'];
require.extensions['.css'] = () => {};
require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(path.resolve('src') + path.sep)) return original(module, filename);
  const code = require('@babel/core').transformFileSync(filename, {babelrc:false,configFile:false,presets:[['@babel/preset-env',{targets:{node:'current'}}],['@babel/preset-react',{runtime:'automatic'}]]}).code;
  module._compile(code, filename);
};
const React = require('react');
const {renderToString} = require('react-dom/server');
const {StaticRouter} = require('react-router-dom/server');
const App = require('../src/App').default;
const template = fs.readFileSync('build/index.html','utf8');
const assets = require('../build/asset-manifest.json').files;
fs.mkdirSync('.seo', {recursive:true});
fs.writeFileSync('.seo/template.html',template);
const routes = Object.entries(pages).filter(([route,seo])=>!route.includes(':') && !seo.robots);
const modified = {};
for (const [route, seo] of routes) {
  const markup = renderToString(React.createElement(StaticRouter,{location:route},React.createElement(App)));
  let pageTemplate = template;
  if (route === '/') {
    const heroPreloads = [
      ['djimg.webp', '(min-width: 576px)'],
      ['djimg-mobile.webp', '(max-width: 575px)']
    ].map(([file, media]) => `<link rel="preload" as="image" type="image/webp" href="${assets['static/media/' + file]}" media="${media}" fetchpriority="high" />`).join('');
    pageTemplate = pageTemplate.replace('<head>', '<head>' + heroPreloads);
  }
  const html = metadata(pageTemplate,route,seo).replace('<div id="root"></div>',`<div id="root">${markup}</div>`);
  const destination = route === '/' ? 'build/index.html' : `build${route}.html`;
  fs.mkdirSync(path.dirname(destination),{recursive:true}); fs.writeFileSync(destination,html);
  // Git dates represent content changes; a dirty checkout must use its current source mtime.
  let date;
  try { date=execFileSync('git',['log','-1','--format=%cI','--','src','public/index.html'],{encoding:'utf8'}).trim(); } catch {}
  const dirty=execFileSync('git',['status','--porcelain','--','src','public/index.html'],{encoding:'utf8'}).trim();
  modified[route] = dirty || !date ? new Date(Math.max(...fs.readdirSync('src', {recursive:true}).map(file=>path.join('src',file)).filter(file=>fs.statSync(file).isFile()).map(file=>fs.statSync(file).mtimeMs), fs.statSync('public/index.html').mtimeMs)).toISOString() : new Date(date).toISOString();
}
fs.writeFileSync('.seo/modified.json',JSON.stringify(modified));
console.log(`Generated server-readable HTML for ${routes.length} public routes.`);
