// App.js
import React, { useState, useEffect, lazy, Suspense } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "./Components/Css/components.css";
import AppNavbar from "./Components/Navbar";
import { Routes, Route, useLocation, matchPath, Navigate, useParams } from "react-router-dom";
import Home from "./Components/Home";
import ContactUs from "./Components/ContactUs";
import Djmc from "./Components/Djmc";
import TeamMemberDetails from "./Components/TeamMemberDetails";
import Downloads from "./Components/Downloads";
import MusicVideos from "./Components/MusicVideos";
import Music from "./Components/Music";
import Footer from "./Components/Footer";
import Rentals from "./Components/UserComponents/Rentals";
import PageNotFound from "./Components/404";
import { getAuth, onAuthStateChanged } from "@firebase/auth";
import { getDoc, doc } from "@firebase/firestore";
import firestore from "./api/firestore/firestore";
import EventureTermsAndConditions from "./Components/EventureTerms";
import { captureItemPricing } from "./utils/pricing";

const MusicVideoAdmin = lazy(() => import("./Components/Admin/MusicVideoAdmin"));
const Cart = lazy(() => import("./Components/UserComponents/Cart"));
const UserInquiries = lazy(() => import("./Components/UserComponents/UserInquiries"));
const RentalsAdmin = lazy(() => import("./Components/Admin/RentalsAdmin"));
const DjmcAdmin = lazy(() => import("./Components/Admin/DjmcAdmin"));
const Inquiries = lazy(() => import("./Components/Admin/Inquiries"));
const EventureAdmin = lazy(() => import("./Components/Admin/EventureAdmin"));
const AdminDashboard = lazy(() => import("./Components/Admin/AdminDashboard"));
const AdminEventDetails = lazy(() => import("./Components/Admin/AdminEventDetails"));
const AdminYearReport = lazy(() => import("./Components/Admin/AdminYearReport"));
const ItineraryEditorPage = lazy(() => import("./Components/Itineraries/ItineraryEditorPage"));
const ItineraryPrintPage = lazy(() => import("./Components/Itineraries/ItineraryPrintPage"));

const SITE_URL = "https://ormusicevents.com";
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_SHARE_IMAGE_ALT =
  "OR Music Events DJ and lighting setup at a New York City event";
const PUBLIC_ROBOTS = "index, follow, max-image-preview:large";
const PRIVATE_ROBOTS = "noindex, nofollow";

const SEO_CONFIG = require("./seo-pages.json");

const SEO_ROUTES = Object.entries(SEO_CONFIG).map(([pattern, config]) => ({
  pattern,
  config,
}));

const upsertMeta = ({ selector, attrs }) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
};

const upsertCanonical = (href) => {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const canonicalUrlForPath = (path = "/") => {
  const cleanPath = path === "/" ? "/" : path.replace(/\/+$/, "");
  return `${SITE_URL}${cleanPath || "/"}`;
};

const routeSeoForPath = (pathname) => {
  const match = SEO_ROUTES.find(({ pattern }) =>
    matchPath({ path: pattern, end: true }, pathname)
  );

  if (match) return match.config;

  return {
    title: "Page Not Found | OR Music Events",
    description:
      "The OR Music Events page you are looking for could not be found.",
    path: pathname,
    robots: PRIVATE_ROBOTS,
  };
};

const LEGACY_ROUTES = { "/DJMC": "/team", "/RentalItems": "/services", "/MusicVideos": "/music-videos", "/Music": "/music", "/Downloads": "/downloads", "/Cart": "/cart" };
function LegacyTeamRedirect() {
  const { artistId } = useParams();
  return <Navigate to={`/team/${encodeURIComponent(artistId)}`} replace />;
}

function App() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [, setUserData] = useState(null);
  const auth = getAuth();
  const db = firestore;
  const location = useLocation();

  // update title and meta description when route changes
  useEffect(() => {
    const seo = routeSeoForPath(location.pathname);

    if (seo) {
      document.title = seo.title;
      const canonicalUrl = canonicalUrlForPath(location.pathname);
      const shareImage = seo.image || DEFAULT_SHARE_IMAGE;
      const shareImageAlt = seo.imageAlt || DEFAULT_SHARE_IMAGE_ALT;
      upsertCanonical(canonicalUrl);
      let schema = document.getElementById("page-schema");
      if (!schema) {
        schema = document.createElement("script");
        schema.id = "page-schema";
        schema.type = "application/ld+json";
        document.head.appendChild(schema);
      }
      schema.textContent = JSON.stringify({
        "@context": "https://schema.org", "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`, url: canonicalUrl,
        name: seo.title, description: seo.description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        ...(location.pathname !== "/" && !seo.robots ? { breadcrumb: {
          "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: seo.title.split("|")[0].trim(), item: canonicalUrl }
          ]
        }} : {})
      });
      upsertMeta({
        selector: 'meta[name="description"]',
        attrs: { name: "description", content: seo.description },
      });
      upsertMeta({
        selector: 'meta[name="robots"]',
        attrs: { name: "robots", content: seo.robots || PUBLIC_ROBOTS },
      });
      upsertMeta({
        selector: 'meta[property="og:type"]',
        attrs: { property: "og:type", content: "website" },
      });
      upsertMeta({
        selector: 'meta[property="og:site_name"]',
        attrs: { property: "og:site_name", content: "OR Music Events" },
      });
      upsertMeta({
        selector: 'meta[property="og:title"]',
        attrs: { property: "og:title", content: seo.title },
      });
      upsertMeta({
        selector: 'meta[property="og:description"]',
        attrs: { property: "og:description", content: seo.description },
      });
      upsertMeta({
        selector: 'meta[property="og:url"]',
        attrs: { property: "og:url", content: canonicalUrl },
      });
      upsertMeta({
        selector: 'meta[property="og:image"]',
        attrs: { property: "og:image", content: shareImage },
      });
      upsertMeta({
        selector: 'meta[property="og:image:alt"]',
        attrs: { property: "og:image:alt", content: shareImageAlt },
      });
      upsertMeta({
        selector: 'meta[property="og:image:width"]',
        attrs: { property: "og:image:width", content: "1200" },
      });
      upsertMeta({
        selector: 'meta[property="og:image:height"]',
        attrs: { property: "og:image:height", content: "630" },
      });
      upsertMeta({
        selector: 'meta[name="twitter:card"]',
        attrs: { name: "twitter:card", content: "summary_large_image" },
      });
      upsertMeta({
        selector: 'meta[name="twitter:title"]',
        attrs: { name: "twitter:title", content: seo.title },
      });
      upsertMeta({
        selector: 'meta[name="twitter:description"]',
        attrs: { name: "twitter:description", content: seo.description },
      });
      upsertMeta({
        selector: 'meta[name="twitter:image"]',
        attrs: { name: "twitter:image", content: shareImage },
      });
      upsertMeta({
        selector: 'meta[name="twitter:image:alt"]',
        attrs: { name: "twitter:image:alt", content: shareImageAlt },
      });
    }
  }, [location.pathname]);

  const hideSiteChrome =
    location.pathname === "/eventure-terms-conditions" ||
    location.pathname.endsWith("/itinerary/print") ||
    location.pathname.startsWith("/itinerary/public/");

  // hydrate cart from localStorage once
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem("cartItems");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // persist cart and notify listeners when it really changed
  useEffect(() => {
    try {
      const cur = localStorage.getItem("cartItems");
      const next = JSON.stringify(cartItems);
      if (cur !== next) {
        localStorage.setItem("cartItems", next);
        window.dispatchEvent(new Event("cart:update"));
      }
    } catch {
      /* ignore */
    }
  }, [cartItems]);

  // add to cart, merge quantities
  const addToCart = (item) => {
    const pricingFields = captureItemPricing(item);
    setCartItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx > -1) {
        return prev.map((p, i) =>
          i === idx ? { ...p, quantity: Number(p.quantity || 0) + 1 } : p
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          ...pricingFields,
          description: item.description || "",
          media: Array.isArray(item.media) ? item.media : [],
          quantity: 1,
          categories: Array.isArray(item.categories) ? item.categories : [],
        },
      ];
    });
  };

  // subscribe to auth once, clean up on unmount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserData((s) => (s !== null ? null : s));
        setIsAdmin((s) => (s !== null ? null : s));
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserData((prev) =>
            JSON.stringify(prev) !== JSON.stringify(data) ? data : prev
          );
          const nextIsAdmin = !!data?.isAdmin;
          setIsAdmin((prev) => (prev !== nextIsAdmin ? nextIsAdmin : prev));
        } else {
          setUserData((s) => (s !== null ? null : s));
          setIsAdmin((s) => (s !== null ? null : s));
        }
      } catch {
        // keep current state
      }
    });
    return () => unsub();
  }, [auth, db]);

  return (
    <div>
      {!hideSiteChrome && <AppNavbar />}
      <Suspense fallback={<main className="container py-5" role="status">Loading page…</main>}>
      <Routes>
        {Object.entries(LEGACY_ROUTES).map(([from, to]) => (
          <Route key={from} caseSensitive path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route caseSensitive path="/DJMC/:artistId" element={<LegacyTeamRedirect />} />
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/team" element={<Djmc />} />
        <Route path="/team/:artistId" element={<TeamMemberDetails />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/music-videos" element={<MusicVideos />} />
        <Route path="/music" element={<Music />} />
        <Route
          path="/cart"
          element={<Cart items={cartItems} setItems={setCartItems} />}
        />
        <Route path="/inquiries" element={<UserInquiries />} />
        <Route
          path="/inquiries/:inquiryId/events/:eventId/itinerary"
          element={<ItineraryEditorPage />}
        />
        <Route
          path="/inquiries/:inquiryId/events/:eventId/itinerary/print"
          element={<ItineraryPrintPage />}
        />
        <Route
          path="/itinerary/public/:inquiryId/:eventId/:token"
          element={<ItineraryPrintPage publicView />}
        />
        <Route
          path="/services"
          element={<Rentals addToCart={addToCart} />}
        />
        {isAdmin && (
          <Route path="/rental-items-admin" element={<RentalsAdmin />} />
        )}
        {isAdmin && (
          <Route path="/music-video-admin" element={<MusicVideoAdmin />} />
        )}
        {isAdmin && <Route path="/dj-mc-admin" element={<DjmcAdmin />} />}
        {isAdmin && (
          <Route path="/eventure-admin" element={<EventureAdmin />} />
        )}
        {isAdmin && (
          <Route path="/dashboard-admin" element={<AdminDashboard />} />
        )}
        {isAdmin && (
          <Route
            path="/dashboard-admin/events/:inquiryId/:eventId"
            element={<AdminEventDetails />}
          />
        )}
        {isAdmin && <Route path="/reports-admin" element={<AdminYearReport />} />}
        {isAdmin && <Route path="/inquiries-admin" element={<Inquiries />} />}
        <Route
          path="/eventure-terms-conditions"
          element={<EventureTermsAndConditions />}
        />
        <Route path="/*" element={<PageNotFound />} />
      </Routes>
      </Suspense>
      {!hideSiteChrome && (
        <div>
          <div className="line"></div>
          <Footer />
        </div>
      )}
    </div>
  );
}

export default App;
