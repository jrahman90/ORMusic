import React, {useContext, useState} from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import "./Components/Css/components.css";
import Navbar from "./Components/Navbar";
import { Routes, Route } from "react-router-dom";
import Home from "./Components/Home";
import ContactUs from "./Components/ContactUs";
import Djmc from "./Components/Djmc";
import Downloads from "./Components/Downloads";
import MusicVideos from "./Components/MusicVideos";
import Music from "./Components/Music";
import Footer from "./Components/Footer";
import MusicVideoAdmin from "./Components/Admin/MusicVideoAdmin";
import DjmcAdmin from "./Components/Admin/DjmcAdmin";

import { AuthContext } from "./api/firestore/AuthContext";
import PageNotFound from "./Components/404";
import Cart from "./Components/User Components/Cart";
import RentalsAdmin from "./Components/Admin/RentalsAdmin";
import Rentals from "./Components/User Components/Rentals";

function App() {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (item) => {
    const existingItemIndex = cartItems.findIndex((cartItem) => cartItem.id === item.id);

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

  const {isLoggedIn} = useContext(AuthContext)
  return (
    <div>
      <Navbar />
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route exact path="/contact" element={<ContactUs />} />
        <Route exact path="/DJMC" element={isLoggedIn ? <DjmcAdmin /> : <Djmc />} />
        <Route exact path="/Downloads" element={<Downloads />} />
        <Route exact path="/MusicVideos" element={isLoggedIn?<MusicVideoAdmin/>:<MusicVideos />} />
        <Route exact path="/Music" element={<Music />} />
        <Route exact path="/Cart" element={<Cart items={cartItems} setItems={setCartItems}/>}/>
        {/* <Route exact path='/RentalItems' element={isLoggedIn?<RentalsAdmin/>:<Rentals addToCart={addToCart}/>}/> */}
        <Route exact path='/RentalItems' element={<Rentals addToCart={addToCart} />}/>
        <Route path="/*" element={<PageNotFound/>}/>

      </Routes>
      <div>
        <div className="line"></div>
        <Footer />
      </div>
    </div>
  );
}

export default App;
