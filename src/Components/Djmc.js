import React from "react";
import { Container } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import "./Css/components.css";

export default function Djmc() {
  return (
    <Container className="djmc-container">
      <Row style={{ justifyContent: "center" }} className="my-3 header-text">
        Meet The Team
      </Row>
      <Row>
        <Col className="mb-2 " xs={15} md={4}>
          <Image className="image-border" src="dj1.jpg" rounded fluid />
        </Col>
        <Col className="mb-2 " xs={15} md={4}>
          <Image className="image-border" src="dj600.png" rounded fluid />
        </Col>
        <Col className="mb-2 " xs={15} md={4}>
          <Image className="image-border" src="djbooth.jpg" rounded fluid />
        </Col>
        <Col className="mb-2 " xs={15} md={4}>
          <Image className="image-border" src="djbooth2.jpg" rounded fluid />
        </Col>
        <Col className="mb-2 " xs={15} md={4}>
          <Image className="image-border" src="djbooth3.jpg" rounded fluid />
        </Col>
      </Row>
    </Container>
  );
}
