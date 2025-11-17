// App.js
import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "./Components/Css/components.css";
import AppNavbar from "./Components/Navbar";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./Components/Home";
import ContactUs from "./Components/ContactUs";
import Djmc from "./Components/Djmc";
import Downloads from "./Components/Downloads";
import MusicVideos from "./Components/MusicVideos";
import Music from "./Components/Music";
import Footer from "./Components/Footer";
import MusicVideoAdmin from "./Components/Admin/MusicVideoAdmin";
import Cart from "./Components/UserComponents/Cart";
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

function App() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [userData, setUserData] = useState(null);
  const auth = getAuth();
  const db = firestore;
  const location = useLocation();

  // basic SEO config per route
  const seoConfig = {
    "/": {
      title:
        "OR Music Events | DJ, MC, Lighting and Event Production in New York City",
      description:
        "OR Music Events provides professional DJ, MC, lighting, stage design and event production services for weddings, corporate events and private parties in New York City.",
    },
    "/contact": {
      title: "Contact OR Music Events | Book Your DJ and Event Production",
      description:
        "Get in touch with OR Music Events to book professional DJ, MC, lighting and event production services for your wedding, corporate event or private party.",
    },
    "/DJMC": {
      title: "DJ and MC Services | OR Music Events New York City",
      description:
        "High energy DJ and professional MC services for weddings, corporate events and private parties in New York City and surrounding states.",
    },
    "/RentalItems": {
      title: "Event Rentals | Sound, Lighting and Screens | OR Music Events",
      description:
        "Rent speakers, microphones, projectors, screens, lighting and more from OR Music Events for your next event.",
    },
    "/MusicVideos": {
      title: "Music Videos | OR Music Events",
      description:
        "Watch music videos and creative projects produced by OR Music Events.",
    },
    "/Music": {
      title: "Music by OR Music Events",
      description:
        "Listen to music and mixes by OR Music Events and discover the sounds behind our events.",
    },
    "/Cart": {
      title: "Your Cart | OR Music Events Rentals",
      description:
        "Review and update your rental cart for event equipment from OR Music Events.",
    },
    "/eventure-terms-conditions": {
      title: "Eventure Terms and Conditions | OR Music Events",
      description:
        "Read the Eventure terms and conditions for using the platform and working with OR Music Events.",
    },
  };

  // update title and meta description when route changes
  useEffect(() => {
    const seo = seoConfig[location.pathname];
    if (seo) {
      document.title = seo.title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", seo.description);
      }
    } else {
      // fallback to a sensible default
      document.title = "OR Music Events | New York City";
    }
  }, [location.pathname]);

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
      {location.pathname !== "/eventure-terms-conditions" && <AppNavbar />}
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
        {isAdmin && <Route path="/inquiries-admin" element={<Inquiries />} />}
        <Route
          path="/eventure-terms-conditions"
          element={<EventureTermsAndConditions />}
        />
        <Route path="/*" element={<PageNotFound />} />
      </Routes>
      {location.pathname !== "/eventure-terms-conditions" && (
        <div>
          <div className="line"></div>
          <Footer />
        </div>
      )}
    </div>
  );
}

export default App;
