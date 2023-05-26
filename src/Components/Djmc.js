import React from "react";
import { Container } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from 'react-bootstrap/Image'
import "./Css/components.css";

export default function Djmc() {
  
  return (
    <Container className="djmc-container">
      <Row style={{justifyContent:'center'}} className="mb-3 mt-3" >Meet The Team</Row>
       <Row >
        <Col className="mb-2" xs={6} md={4}>
          <Image  src="dj1.jpg" rounded fluid/>
        </Col>
        <Col className="mb-2"xs={6} md={4} >
          <Image  src="dj600.png" rounded fluid/>
        </Col>
        <Col className="mb-2"xs={6} md={4}>
          <Image  src="djbooth.jpg" rounded fluid />
        </Col>
        <Col className="mb-2"xs={6} md={4}>
          <Image  src="djbooth2.jpg" rounded fluid />
        </Col>
        <Col className="mb-2"xs={6} md={4}>
          <Image  src="djbooth3.jpg" rounded fluid />
        </Col> 
       </Row> 
    </Container>
  );
}
