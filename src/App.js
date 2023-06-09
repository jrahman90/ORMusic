import React, { useState, useEffect} from "react";
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
import PageNotFound from "./Components/404";
import { getAuth, onAuthStateChanged } from "@firebase/auth";
import { getDoc, doc } from "@firebase/firestore";
import firestore from "./api/firestore/firestore";

function App() {
  const [isAdmin, setIsAdmin] = useState(null)
  const [userData, setUserData] = useState(null)
  const auth = getAuth()
  const db = firestore
 
  useEffect(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in, see docs for a list of available properties
      // https://firebase.google.com/docs/reference/js/auth.user
      const uid = user.uid;
      const docRef = doc(db, "users", uid);const docSnap = await getDoc(docRef);
        if(docSnap.exists()) {
            setUserData(docSnap.data());
            setIsAdmin(userData?.isAdmin)
        } else {
            console.log("Document does not exist")
        }
      } else {
        console.log('User is not logged in.')
      }
    // eslint-disable-next-line
  }, [])
})

  return (
    <div>
      <Navbar />
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route exact path="/contact" element={<ContactUs />} />
        <Route exact path="/DJMC" element={isAdmin ? <DjmcAdmin /> : <Djmc />} />
        <Route exact path="/Downloads" element={<Downloads />} />
        <Route exact path="/MusicVideos" element={isAdmin?<MusicVideoAdmin/>:<MusicVideos />} />
        <Route exact path="/Music" element={<Music />} />
        {/* <Route exact path="/Cart" element={<Cart items={cartItems} setItems={setCartItems}/>}/> */}
        {/* <Route exact path='/RentalItems' element={isLoggedIn?<RentalsAdmin/>:<Rentals addToCart={addToCart}/>}/> */}
        {/* <Route exact path='/RentalItems' element={userData?.isAdmin?<RentalsAdmin/>:<Rentals addToCart={addToCart} />}/> */}
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
