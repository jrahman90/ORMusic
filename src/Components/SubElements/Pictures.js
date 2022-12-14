import React from "react";
import Carousel from "react-bootstrap/Carousel";

export default function Pictures() {
  return (
    <div position="absolute">
      <Carousel variant="dark">
        <Carousel.Item>
          <img
            className="d-block w-100"
            src="ormusiclogo.png"
            alt="First slide"
          />
        </Carousel.Item>
        <Carousel.Item>
          <img
            className="d-block w-100"
            src="ormusiclogo.png"
            alt="Second slide"
          />
        </Carousel.Item>
        <Carousel.Item>
          <img
            className="d-block w-100"
            src="ormusiclogo.png"
            alt="Third slide"
          />
        </Carousel.Item>
      </Carousel>
    </div>
  );
}
