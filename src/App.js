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

  // hydrate cart from localStorage once
  const [cartItems, setCartItems] = useState(() => {
    try {
      const raw = localStorage.getItem("cartItems");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // persist cart and notify listeners when it changes
  useEffect(() => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
      window.dispatchEvent(new Event("cart:update"));
    } catch {}
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
        // avoid stale state churn
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
        <Route exact path="/" element={<Home />} />
        <Route exact path="/contact" element={<ContactUs />} />
        <Route exact path="/DJMC" element={<Djmc />} />
        <Route exact path="/Downloads" element={<Downloads />} />
        <Route exact path="/MusicVideos" element={<MusicVideos />} />
        <Route exact path="/Music" element={<Music />} />
        <Route
          exact
          path="/Cart"
          element={<Cart items={cartItems} setItems={setCartItems} />}
        />
        <Route
          exact
          path="/RentalItems"
          element={<Rentals addToCart={addToCart} />}
        />
        {isAdmin && (
          <Route exact path="/rental-items-admin" element={<RentalsAdmin />} />
        )}
        {isAdmin && (
          <Route
            exact
            path="/music-video-admin"
            element={<MusicVideoAdmin />}
          />
        )}
        {isAdmin && <Route exact path="/dj-mc-admin" element={<DjmcAdmin />} />}
        {isAdmin && (
          <Route exact path="/eventure-admin" element={<EventureAdmin />} />
        )}
        {isAdmin && (
          <Route exact path="/inquiries-admin" element={<Inquiries />} />
        )}
        <Route
          exact
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
