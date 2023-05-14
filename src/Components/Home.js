import React from "react";
import "./Css/components.css";
import Pictures from "./SubElements/Pictures";
import Celebrate from "./HomeComponents/Intro";

export default function Home() {
  return (
    <div className="homePage">
      <div className="header">
        <div className="header-content">
          {/* <h1 className="phone">
            <a href="tel:646-926-2503">
              <BsPhoneVibrateFill />
            </a>
          </h1> */}
          <img className="mb-3" src="ormusiclogo.png" alt="" />
          <h2>Your Event Specialists</h2>
        </div>
      </div>
      <div className="line"></div>
      <div className="celebrate-with-us">
        <Celebrate />
      </div>
      <div className="line"></div>
      <div className="our-services">
        <h1>Our Services</h1>
        <Pictures />
      </div>
    </div>
  );
}
