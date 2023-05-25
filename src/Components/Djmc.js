import React from "react";
import { Container } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import './Css/components.css'

export default function Djmc() {
  return (
    <Container className="djmc-container">
      <Row className="mb-3 mt-3">Meet The Team</Row>
      <Row>
        <Col className="mb-2">
        <div className="loading">
          <img alt="" src="dj1.jpg" width={400} />
        </div>
        </Col>
        <Col className="mb-2">
          <img alt="" src="dj600.png" width={400} />
        </Col>
        <Col className="mb-2">
          <img alt="" src="djbooth.jpg" width={400} />
        </Col>
        <Col className="mb-2">
          <img alt="" src="djbooth2.jpg" width={400} />
        </Col>
        <Col className="mb-2">
          <img alt="" src="djbooth3.jpg" width={400} />
        </Col>
      </Row>
    </Container>
  );
}
