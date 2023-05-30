import React from "react";
import "./Css/components.css";
import Celebrate from "./HomeComponents/Intro";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Card from "react-bootstrap/Card";
import { Container } from "react-bootstrap";

export default function Home() {
  return (
    <div>
      {/* <div className="header">
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
      </div> */}
      <Card className="bg-dark text-white header mt-3">
        <Card.ImgOverlay className="home-card">
          <Card.Title>
            <img className="mb-3 home-logo" src="ormusiclogo.png" alt="" />
          </Card.Title>
          <Card.Text className="home-text">Your Event Specialists</Card.Text>
        </Card.ImgOverlay>
      </Card>
      <Card className="bg-dark text-white mt-3 celebrate-with-us">
        <Card.ImgOverlay className="celebrate-with-us">
          <Card.Title className="header-text">Celebrate With Us!</Card.Title>
          <Card.Text className="paragraphs">
            OR Music Events produces some of the best events in the tristate
            area. With many years of experience DJ/MC and Event Management we
            create some truly unforgettable events. OR Music Events produces
            everything from corporate events to Weddings and concerts. No matter
            how large or small the occasion, or how unique the venue, we work to
            make it the best that it can be. We’re certain that we’ll be your
            event company of choice. Together, we’ll create the most talked
            about event. Whether you need DJ/MC, Photography, Videography,
            Decor, or lighting. We will accommodate your wishes. But for those
            who want it all, we also offer the full packages. No matter what you
            choose, you can count on OR Music Events as your next event
            management company!
          </Card.Text>
        </Card.ImgOverlay>
      </Card>
      <Card className="bg-dark text-white">
        <Card.ImgOverlay className="celebrate-with-us">
          <Card.Title>Card title</Card.Title>
          <Card.Text>
            This is a wider card with supporting text below as a natural lead-in
            to additional content. This content is a little bit longer.
          </Card.Text>
          <Card.Text>Last updated 3 mins ago</Card.Text>
        </Card.ImgOverlay>
      </Card>
    </div>
  );
}
