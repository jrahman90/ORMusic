import React, {useContext} from "react";
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

function App() {

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
      </Routes>
      <div>
        <div className="line"></div>
        <Footer />
      </div>
    </div>
  );
}

export default App;
