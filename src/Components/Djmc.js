import React from "react";
import { Container } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

export default function Djmc() {
  return (
    <Container>
      <Row className="mb-3 mt-3">Meet The Team</Row>
      <Row>
        <Col>
          <img src="ormusiclogo.png" width={400} />
        </Col>
        <Col>2 of 2</Col>
      </Row>
    </Container>
  );
}
