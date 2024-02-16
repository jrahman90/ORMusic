import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "./Components/Css/components.css";
import AppNavbar from "./Components/Navbar";
import { Routes, Route } from "react-router-dom";
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

function App() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [userData, setUserData] = useState(null);
  const auth = getAuth();
  const db = firestore;

  const [cartItems, setCartItems] = useState([]);

  const addToCart = (item) => {
    const existingItemIndex = cartItems.findIndex(
      (cartItem) => cartItem.id === item.id
    );

    if (existingItemIndex !== -1) {
      const updatedCartItems = [...cartItems];
      updatedCartItems[existingItemIndex] = {
        ...updatedCartItems[existingItemIndex],
        quantity: updatedCartItems[existingItemIndex].quantity + 1,
      };
      setCartItems(updatedCartItems);
    } else {
      setCartItems([...cartItems, { ...item, quantity: 1 }]);
    }
  };

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
          setIsAdmin(docSnap.data()?.isAdmin);
        } else {
          console.log("Document does not exist");
        }
      } else {
        console.log("User is not logged in.");
      }
    });
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <AppNavbar />
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
        <Route exact path="/rental-items-admin" element={<RentalsAdmin />} />
        <Route exact path="/music-video-admin" element={<MusicVideoAdmin />} />
        <Route exact path="/dj-mc-admin" element={<DjmcAdmin />} />
        <Route exact path="/inquiries-admin" element={<Inquiries />} />
        {/* <Route exact path='/RentalItems' element={userData?.isAdmin?<RentalsAdmin/>:<Rentals addToCart={addToCart} />}/> */}
        <Route path="/*" element={<PageNotFound />} />
      </Routes>
      <div>
        <div className="line"></div>
        <Footer />
      </div>
    </div>
  );
}

export default App;
