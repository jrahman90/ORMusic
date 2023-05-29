import React from "react";
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
import Login from "./Components/Login";

function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/DJMC" element={<Djmc />} />
        <Route path="/Downloads" element={<Downloads />} />
        <Route path="/MusicVideos" element={<MusicVideos />} />
        <Route path="/Music" element={<Music />} />
        <Route path="/opurahman/admin" element={<MusicVideoAdmin />} />
        <Route path="/djmcadmin/admin" element={<DjmcAdmin />} />
        <Route path='/login' element={<Login/>}/>
      </Routes>
      <div>
        <div className="line"></div>
        <Footer />
      </div>
    </div>
  );
}

export default App;
