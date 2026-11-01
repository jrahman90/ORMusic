# SEO implementation and audit — November 1, 2026

## Public pages and rendering

The canonical origin is `https://ormusicevents.com`. Indexable routes are `/`, `/services`, `/team`, `/team/:artistId`, `/music-videos`, and `/contact`.

`src/seo-pages.json` is the route metadata registry. `npm run build` compiles React and runs `scripts/build-seo.cjs`, which server-renders the five static public pages and generates their initial titles, descriptions, canonical URLs, social metadata, and page/breadcrumb JSON-LD. The generated static pages use flat HTML filenames so Netlify serves their canonical paths without adding trailing-slash redirects. React hydrates their initial HTML, retaining the first rendered content, and maintains metadata on client navigation. Public team profiles receive live Firestore content and metadata through the `team-profile` Netlify function. Artist IDs remain case-sensitive stable database keys; changing their spelling would break existing profiles.

Netlify permanently redirects the original mixed-case marketing routes to their lowercase replacements, including old profile links. All source links now use canonical routes. Canonicals exclude tracking parameters without removing application query parameters needed for user workflows. The `page` function supplies route-specific initial metadata for private/utility routes and real HTTP 404 responses for unknown pages. Private responses have an `X-Robots-Tag` header in addition to client metadata.

Music and Downloads remain thin placeholder pages and intentionally are not indexed. Cart, inquiries, admin, terms, and tokenized event itinerary pages retain their existing noindex policy. Customer information and bearer-token itinerary URLs never enter the sitemap. Robots.txt permits crawling so crawlers can see noindex directives.

## Sitemap and hosting

`/sitemap.xml` is rewritten to the `sitemap` function. It includes all five static public pages plus all current artist profiles, paginates Firestore results, and emits XML-escaped URLs and W3C `lastmod` timestamps. Static page timestamps derive from source changes/Git history; profile timestamps use Firestore update times. The shared sitemap is cached for five minutes. Upstream failures return 503 with Retry-After rather than serving a deceptively complete sitemap.

The Netlify build is pinned to Node 22. Netlify uses the public Firestore REST API, with exactly the same unauthenticated artist visibility as the existing public team page. No administrative credential or new public database permission is needed. Function templates and modification dates are generated under ignored `.seo/` during the build. The deploy must include both the configured Netlify functions and static build output; uploading only `build/` is insufficient.

`netlify.toml` includes explicit primary-domain HTTP → HTTPS and www → apex 301 redirects and a one-year HSTS header. Existing production HTTPS and HSTS were already working at audit time. Firebase configuration remains for the existing backend functions; the new frontend hosting rules target the repository's existing Netlify deployment model.

## Content, assets, and performance

Public pages have unique titles under 60 characters, descriptions under 160, one keyword-relevant H1, sequential heading levels, and contextual service/team/media/contact links. The footer copyright is a paragraph, avoiding a skipped heading level. Nested-route asset paths are root-relative. Meaningful images have descriptive alt text; social icon links now have accessible names.

Eight served image variants were converted to WebP, with large background photographs resized to 1920px wide. Combined source payload fell from 7,843,453 to 884,394 bytes (89%). Originals remain available to preserve existing external references; the existing 1200 × 630 social JPEG remains compatible with social scrapers. The logo's intrinsic aspect ratio, carousel dimensions, and existing profile/media containers reserve image space. Below-fold images load lazily and videos do not preload media. Private/admin screens and the account form load in separate JavaScript chunks. A 26 KB mobile hero variant is preloaded at high priority; the desktop variant is preloaded at larger viewports. The logo was further reduced from 40,402 to 18,628 bytes. Immutable cache headers apply to hashed build assets. Email/password authentication preserves the default IndexedDB/local/session persistence order while omitting the unused popup/redirect iframe initialization, following Firebase’s [custom dependency guidance](https://firebase.google.com/docs/auth/web/custom-dependencies). Public page hydration avoids clearing and rebuilding server-rendered content on startup. The service worker now prefers fresh server navigation responses, retains an offline shell fallback, and still waits for existing tabs to close before activating an update to avoid interrupting editing sessions. Mobile typography, wrapping, footer touch targets, and reduced-motion behavior were improved.

## Verification performed

- Production build compiles successfully. Existing toolchain notices remain: stale Browserslist data and Node's punycode deprecation.
- `CI=true npm test -- --watchAll=false --watchman=false`: 3 suites, 8 tests pass, including on-demand login form loading and signup switching. Watchman is disabled because the local sandbox cannot access its socket.
- `npm run test:seo`: 5 checks pass, covering static rendered metadata/headings/assets/links/schema, escaping, paginated dynamic sitemap/failure behavior, private noindex and HTTP 404s, and profile metadata/404s.
- Live public Firestore integration returns 9 sitemap URLs (5 public pages plus 4 team profiles).
- Existing production HTTP redirects with 301 to HTTPS; HTTPS sends `Strict-Transport-Security: max-age=31536000`.
- Existing production robots.txt, sitemap.xml, and social JPEG return HTTP 200 with appropriate content types.
- Facebook, Instagram, YouTube, and TikTok destination links returned HTTP 200. Database-managed remote media URLs can change independently and are not exhaustively certified by the static source audit.
- Chrome production-preview smoke checks cover public page headings and horizontal layout at desktop and narrow mobile sizes. No form, booking, payment, or inquiry was submitted during testing.

## Google Search Console

The `https://ormusicevents.com/` URL-prefix property was successfully auto-verified in the signed-in Google account using the existing domain-name-provider record. No new DNS record or HTML token was necessary. Keep the existing DNS-CNAME verification record intact.

`sitemap.xml` was submitted and Google displayed “Sitemap submitted successfully.” The report subsequently showed “Success,” with a last-read date of November 1, 2026 and 5 discovered pages from the currently deployed sitemap. The deployed live generator now exposes 9 URLs. It was resubmitted after deployment; Search Console still shows Success with 5 discovered pages from its earlier crawl, pending processing of the updated sitemap. Search Console overview reports were still processing, with no field performance data available.

## Production deployment and validation

Production is deployed from GitHub `main`. The final code release is commit `a10707c`, published successfully by [Netlify](https://app.netlify.com/projects/ormusicevents/deploys/6ae767b34c6c91f6804f843a) on November 1, 2026. Three server functions, generated public pages, redirects, and headers were published together. The GitHub source includes the implementation and audit tests.

The live verification suite passed after the final release:

- All 9 sitemap URLs return HTTP 200, including all four dynamic team profiles.
- All five static public pages return directly without extra redirects, with matching canonical URLs and one H1.
- The six legacy marketing/utility routes redirect with HTTP 301 to lowercase URLs. HTTP and www requests redirect with HTTP 301 to canonical HTTPS.
- Cart, inquiries, and admin responses include noindex headers and self-referencing canonical metadata.
- Missing pages and missing team profiles return HTTP 404.
- Sitemap XML includes valid lastmod dates; robots.txt and the social image return HTTP 200.
- Chrome confirms all five static public routes hydrate their server HTML, with no console errors or warnings observed. The existing signed-in session persisted across the update. No inquiry, booking, contract, payment, or account creation was submitted.

See [machine-readable production results](seo-production-verification.json).

### Final PageSpeed Insights measurement

[Report, November 1, 2026 at 11:25 AM EST](https://pagespeed.web.dev/analysis/https-ormusicevents-com/ek5ntyw4ne?form_factor=mobile):

| Metric | Mobile | Desktop |
| --- | --- | --- |
| Performance | 99 | 100 |
| SEO | 100 | 100 |
| Best Practices | 100 | 100 |
| Accessibility | 96 | 92 |
| First Contentful Paint | 1.1 s | 0.5 s |
| Largest Contentful Paint | 1.7 s | 0.6 s |
| Total Blocking Time | 70 ms | 0 ms |
| Cumulative Layout Shift | 0 | 0 |

The initial mobile run measured 69 Performance and LCP 5.1 s. Subsequent work addressed image discovery/delivery, account code loading, server HTML hydration, and unnecessary mobile auth iframe startup. The final mobile run achieved the results above on emulated slow 4G.

These are lab measurements, not field Core Web Vitals certification. PageSpeed currently reports no real-user data, so field INP cannot yet be evaluated. Lighthouse still flags contrast differences, unused CSS/JavaScript, and further image/cache opportunities; its SEO score does not certify search ranking or the absence of every possible regression.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
