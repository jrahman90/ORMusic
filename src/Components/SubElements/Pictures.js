import React from "react";
import "../Css/pictures.css";
import { Carousel } from "react-bootstrap";
export default function Pictures() {
  return (
    <Carousel fade slide={false}>
      <Carousel.Item>
        <img
          className="d-block w-100"
          src="carousel/dancefloor800x400.png"
          alt="First slide"
        />
        <Carousel.Caption>
          <h3>MC</h3>
          <p>Our MC's will keep your guests entertained so your perfect day can go smooth.</p>
        </Carousel.Caption>
      </Carousel.Item>
      <Carousel.Item>
        <img
          className="d-block w-100"
          src="carousel/dj800x400.png"
          alt="Second slide"
        />
        <Carousel.Caption>
          <h3>DJ</h3>
          <p>Customize your event with custom playlists of your choice. </p>
        </Carousel.Caption>
      </Carousel.Item>
      <Carousel.Item>
        <img
          className="d-block w-100"
          src="carousel/wstage1.8x4.png"
          alt="Third slide"
        />
        <Carousel.Caption>
          <h3>Stage & Decor</h3>
          <p>
            We offer a variety of latest decorations to meet your taste. 
          </p>
        </Carousel.Caption>
      </Carousel.Item>
    </Carousel>
  );
}
