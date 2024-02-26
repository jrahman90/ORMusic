import React from "react";
import "./Css/components.css";
import Card from "react-bootstrap/Card";
import Pictures from "./SubElements/Pictures";

export default function Home() {
  return (
    <div>
      <p
        className="mt-3 mx-3"
        align="center"
        style={{ backgroundColor: "black", color: "white" }}
      >
        Welcome to the updated OR Music Events website! Now, you can easily
        create a profile by clicking on the login button in the footer and
        conveniently send inquiries through the cart.{" "}
      </p>
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
      <Card className="bg-dark mt-3 our-services text-white">
        <Card.ImgOverlay className="our-services">
          <Card.Title className="header-text mb-3">Our Services</Card.Title>
          <Pictures />
        </Card.ImgOverlay>
      </Card>
    </div>
  );
}
