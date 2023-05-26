import React from "react";
import "./Css/components.css";
import Celebrate from "./HomeComponents/Intro";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";

export default function Home() {
  return (
    <div className="homePage">
      <div className="header">
        <div className="header-content">
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
        <Row style={{ justifyContent: "center" }}>
          <Col className="mx-2" xs={5} md={3} style={{ alignSelf: "center" }}>
            <Image src="dj1.jpg" rounded fluid />
          </Col>
          <Col className="mx-2" xs={5} md={3} style={{ alignSelf: "center" }}>
            <Image src="stages/IMG_4719.jpeg" rounded fluid />
          </Col>
          <Col className="mx-2" xs={5} md={3} style={{ alignSelf: "center" }}>
            <Image src="photography.avif" rounded fluid />
          </Col>
        </Row>
      </div>
    </div>
  );
}
