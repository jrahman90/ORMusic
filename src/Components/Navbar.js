import React from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import "./Css/components.css";
import { Link } from "react-router-dom";

export default function navbar() {
  return (
    <div>
      <Navbar bg="primary" expand="lg">
        <Container>
          <Navbar.Brand href="/">
            <img
              src="ormusiclogo.png"
              alt=""
              width="100"
              height="30"
              className="d-inline-block align-top"
            />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">
                Home
              </Nav.Link>
              <Nav.Link as={Link} to="/contact">
                Contact Us
              </Nav.Link>
                <Nav.Link as={Link} to="/DJMC">
                  DJ/MC
                </Nav.Link>
                {/* <Nav.Link as={Link} to='/RentalItems'>Rental Items</Nav.Link> */}
                <NavDropdown title="Media" id="basic-nav-dropdown">
                  <NavDropdown.Item as={Link} to="/MusicVideos">
                    Music Videos
                  </NavDropdown.Item>
                  {/* <NavDropdown.Item as={Link} to="/Downloads">
                    Downloads
                  </NavDropdown.Item>
                */}
                  {/* <NavDropdown.Divider />  */}
                </NavDropdown>
                {/* <Nav.Link as={Link} to="/Cart">
                  Cart
                </Nav.Link> */}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  );
}
