import React from "react";
import { Container } from "react-bootstrap";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from 'react-bootstrap/Image'
import Spinner from 'react-bootstrap/Spinner';
import "./Css/components.css";

export default function Djmc() {
  
  return (
    <Container className="djmc-container">
      <Row style={{justifyContent:'center'}} className="mb-3 mt-3" >Meet The Team</Row>
       <Row >
        <Col className="mb-2">
          <Image className="djmc-images" src="dj1.jpg" rounded fluid/>
        </Col>
        <Col className="mb-2" >
          <Image className="djmc-images" src="dj600.png" rounded fluid/>
        </Col>
        <Col className="mb-2">
          <Image className="djmc-images" src="djbooth.jpg" rounded fluid />
        </Col>
        <Col className="mb-2">
          <Image className="djmc-images" src="djbooth2.jpg" rounded fluid />
        </Col>
        <Col className="mb-2">
          <Image className="djmc-images" src="djbooth3.jpg" rounded fluid />
        </Col> 
       </Row> 
    </Container>
  );
}
