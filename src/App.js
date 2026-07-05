// App.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "./Components/Css/components.css";
import AppNavbar from "./Components/Navbar";
import { Routes, Route, useLocation, matchPath } from "react-router-dom";
import Home from "./Components/Home";
import ContactUs from "./Components/ContactUs";
import Djmc from "./Components/Djmc";
import Downloads from "./Components/Downloads";
import MusicVideos from "./Components/MusicVideos";
import Music from "./Components/Music";
import Footer from "./Components/Footer";
import MusicVideoAdmin from "./Components/Admin/MusicVideoAdmin";
import Cart from "./Components/UserComponents/Cart";
import UserInquiries from "./Components/UserComponents/UserInquiries";
import RentalsAdmin from "./Components/Admin/RentalsAdmin";
import Rentals from "./Components/UserComponents/Rentals";
import DjmcAdmin from "./Components/Admin/DjmcAdmin";
import PageNotFound from "./Components/404";
import { getAuth, onAuthStateChanged } from "@firebase/auth";
import { getDoc, doc } from "@firebase/firestore";
import firestore from "./api/firestore/firestore";
import Inquiries from "./Components/Admin/Inquiries";
import EventureTermsAndConditions from "./Components/EventureTerms";
import EventureAdmin from "./Components/Admin/EventureAdmin";
import AdminDashboard from "./Components/Admin/AdminDashboard";
import AdminEventDetails from "./Components/Admin/AdminEventDetails";
import ItineraryEditorPage from "./Components/Itineraries/ItineraryEditorPage";
import ItineraryPrintPage from "./Components/Itineraries/ItineraryPrintPage";

const SITE_URL = "https://ormusicevents.com";
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_SHARE_IMAGE_ALT =
  "OR Music Events DJ and lighting setup at a New York City event";
const PUBLIC_ROBOTS = "index, follow, max-image-preview:large";
const PRIVATE_ROBOTS = "noindex, nofollow";

const SEO_CONFIG = {
  "/": {
    title:
      "OR Music Events | DJ, MC, Lighting and Event Production in New York City",
    description:
      "OR Music Events provides professional DJ, MC, lighting, stage design and event production services for weddings, corporate events and private parties in New York City.",
    path: "/",
  },
  "/contact": {
    title: "Contact OR Music Events | Book Your DJ and Event Production",
    description:
      "Get in touch with OR Music Events to book professional DJ, MC, lighting and event production services for your wedding, corporate event or private party.",
    path: "/contact",
  },
  "/DJMC": {
    title: "Team | OR Music Events New York City",
    description:
      "Meet the OR Music Events team behind weddings, corporate events and private parties in New York City and surrounding states.",
    path: "/DJMC",
  },
  "/RentalItems": {
    title: "Event Rentals | Sound, Lighting and Screens | OR Music Events",
    description:
      "Rent speakers, microphones, projectors, screens, lighting and more from OR Music Events for your next event.",
    path: "/RentalItems",
  },
  "/MusicVideos": {
    title: "Music Videos | OR Music Events",
    description:
      "Watch music videos and creative projects produced by OR Music Events.",
    path: "/MusicVideos",
  },
  "/Music": {
    title: "Music by OR Music Events",
    description:
      "Listen to music and mixes by OR Music Events and discover the sounds behind our events.",
    path: "/Music",
    robots: PRIVATE_ROBOTS,
  },
  "/Downloads": {
    title: "Downloads | OR Music Events",
    description:
      "Download available OR Music Events resources and event planning materials.",
    path: "/Downloads",
    robots: PRIVATE_ROBOTS,
  },
  "/Cart": {
    title: "Your Cart | OR Music Events Rentals",
    description:
      "Review and update your rental cart for event equipment from OR Music Events.",
    path: "/Cart",
    robots: PRIVATE_ROBOTS,
  },
  "/inquiries": {
    title: "Your Inquiries | OR Music Events",
    description:
      "Review your OR Music Events inquiries, contracts, deposits, and status updates.",
    path: "/inquiries",
    robots: PRIVATE_ROBOTS,
  },
  "/inquiries/:inquiryId/events/:eventId/itinerary": {
    title: "Event Itinerary | OR Music Events",
    description:
      "Create and edit your OR Music Events itinerary for a confirmed event.",
    path: "/inquiries",
    robots: PRIVATE_ROBOTS,
  },
  "/inquiries/:inquiryId/events/:eventId/itinerary/print": {
    title: "Printable Event Itinerary | OR Music Events",
    description:
      "View, print, or save a PDF copy of your OR Music Events itinerary.",
    path: "/inquiries",
    robots: PRIVATE_ROBOTS,
  },
  "/itinerary/public/:inquiryId/:eventId/:token": {
    title: "Live Event Itinerary | OR Music Events",
    description:
      "View the current public itinerary for an OR Music Events event.",
    path: "/itinerary/public",
    robots: PRIVATE_ROBOTS,
  },
  "/dashboard-admin": {
    title: "Admin Dashboard | OR Music Events",
    description: "Admin dashboard for OR Music Events.",
    path: "/dashboard-admin",
    robots: PRIVATE_ROBOTS,
  },
  "/dashboard-admin/events/:inquiryId/:eventId": {
    title: "Admin Event Details | OR Music Events",
    description: "Admin event details for OR Music Events.",
    path: "/dashboard-admin",
    robots: PRIVATE_ROBOTS,
  },
  "/inquiries-admin": {
    title: "Admin Inquiries | OR Music Events",
    description: "Admin inquiry management for OR Music Events.",
    path: "/inquiries-admin",
    robots: PRIVATE_ROBOTS,
  },
  "/rental-items-admin": {
    title: "Rental Items Admin | OR Music Events",
    description: "Admin rental and service catalog editor for OR Music Events.",
    path: "/rental-items-admin",
    robots: PRIVATE_ROBOTS,
  },
  "/music-video-admin": {
    title: "Music Video Admin | OR Music Events",
    description: "Admin music video editor for OR Music Events.",
    path: "/music-video-admin",
    robots: PRIVATE_ROBOTS,
  },
  "/dj-mc-admin": {
    title: "Team Admin | OR Music Events",
    description: "Admin team editor for OR Music Events.",
    path: "/dj-mc-admin",
    robots: PRIVATE_ROBOTS,
  },
  "/eventure-admin": {
    title: "Eventure Admin | OR Music Events",
    description: "Admin Eventure contact management for OR Music Events.",
    path: "/eventure-admin",
    robots: PRIVATE_ROBOTS,
  },
  "/eventure-terms-conditions": {
    title: "Eventure Terms and Conditions | OR Music Events",
    description:
      "Read the Eventure terms and conditions for using the platform and working with OR Music Events.",
    path: "/eventure-terms-conditions",
    robots: PRIVATE_ROBOTS,
  },
};

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
      const canonicalUrl = canonicalUrlForPath(seo.path || location.pathname);
      const shareImage = seo.image || DEFAULT_SHARE_IMAGE;
      const shareImageAlt = seo.imageAlt || DEFAULT_SHARE_IMAGE_ALT;
      upsertCanonical(canonicalUrl);
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
          price: item.price,
          description: item.description || "",
          media: Array.isArray(item.media) ? item.media : [],
          quantity: 1,
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/DJMC" element={<Djmc />} />
        <Route path="/Downloads" element={<Downloads />} />
        <Route path="/MusicVideos" element={<MusicVideos />} />
        <Route path="/Music" element={<Music />} />
        <Route
          path="/Cart"
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
          path="/RentalItems"
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
        {isAdmin && <Route path="/inquiries-admin" element={<Inquiries />} />}
        <Route
          path="/eventure-terms-conditions"
          element={<EventureTermsAndConditions />}
        />
        <Route path="/*" element={<PageNotFound />} />
      </Routes>
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
