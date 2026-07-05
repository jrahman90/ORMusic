# SEO Notes

This app is a client-rendered React single-page app. Google can render JavaScript, but the initial HTML response still matters for social scrapers, non-Google crawlers, and fast indexing.

Reference guidance:

- Google JavaScript SEO basics: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google title link guidance: https://developers.google.com/search/docs/appearance/title-link
- Google snippet/meta description guidance: https://developers.google.com/search/docs/appearance/snippet
- Google canonical guidance: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google structured data intro: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Google robots meta guidance: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag

## Current SEO Setup

- `public/index.html` provides the default home page title, description, canonical URL, Open Graph/Twitter tags, and business JSON-LD.
- `src/App.js` updates titles, descriptions, canonical URLs, robots meta, and social metadata when React Router changes routes.
- `public/sitemap.xml` lists the core indexable public routes.
- `public/robots.txt` allows crawling and points to the sitemap.
- Private/customer/admin screens use `noindex, nofollow`.

## Indexable Public Routes

These routes are intended to be discoverable:

- `/`
- `/contact`
- `/DJMC`
- `/RentalItems`
- `/MusicVideos`

Thin or private routes are intentionally noindexed until they have enough public content:

- `/Music`
- `/Downloads`
- `/Cart`
- `/inquiries`
- admin routes
- itinerary routes
- unknown/404 routes

## Important Rules

- Every new public route should have a unique title and description in `SEO_CONFIG` inside `src/App.js`.
- Every private, account, admin, cart, contract, or customer-specific route should use `noindex, nofollow`.
- Keep sitemap URLs aligned with canonical URLs.
- Do not add a route to `sitemap.xml` unless it is indexable and has meaningful public content.
- Keep structured data accurate and consistent with visible site content.

## Best Next SEO Upgrade

The biggest technical upgrade would be prerendering or server-side rendering for public routes. Right now, Netlify serves the same `index.html` for every path and React updates metadata after JavaScript runs. Google can handle that, but prerendered public route HTML would help social sharing, non-Google crawlers, and indexing consistency.

Reasonable options:

- Move public pages to a static framework such as Next.js or Astro.
- Add a prerender step for known public routes.
- Keep the admin/customer app client-rendered and prerender only public marketing pages.

## Content Opportunities

Technical metadata is only part of SEO. The public pages would benefit from more crawlable, specific content:

- Add service detail sections on `/RentalItems` for DJ/MC, lighting, staging, screens, sound, photography/video, and event packages.
- Add location/service-area copy for NYC, New Jersey, Connecticut, Massachusetts, and Pennsylvania if those are accurate service areas.
- Add real testimonials, venue/event examples, and FAQs.
- Build out `/Music` and `/Downloads` before indexing them.
- Give every important image descriptive alt text.
