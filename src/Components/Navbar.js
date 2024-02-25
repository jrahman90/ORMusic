import React, { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import { getAuth, onAuthStateChanged } from "@firebase/auth";
import { getDoc, doc } from "@firebase/firestore";
import "./Css/components.css";
import { Link } from "react-router-dom";
import { FcShop } from "react-icons/fc";

import firestore from "../api/firestore/firestore";
import { NavLink } from "react-bootstrap";

function AppNavbar() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [userData, setUserData] = useState(null);
  const auth = getAuth();
  const db = firestore;

  const socials = [
    {
      linkToSocial: "https://www.facebook.com/ormusicevents",
      imageSrc: "facebook.png",
    },
    {
      linkToSocial: "https://www.instagram.com/ormusic.events/",
      imageSrc: "instagram.png",
    },
    {
      linkToSocial: "https://www.youtube.com/channel/UCdtFAaHPQxzm-jKlPgKPngQ",
      imageSrc: "youtube.png",
    },
    {
      linkToSocial: "https://www.tiktok.com/@officialopu",
      imageSrc: "tiktok.png",
    },
  ];

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
          setIsAdmin(docSnap.data()?.isAdmin);
        } else {
          console.log("Document does not exist");
        }
      } else {
        console.log("User is not logged in.");
      }
    });
    // eslint-disable-next-line
  }, [auth]);

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
              <Nav.Link className="nav-items" as={Link} to="/">
                Home
              </Nav.Link>
              <Nav.Link className="nav-items" as={Link} to="/contact">
                Contact Us
              </Nav.Link>
              <Nav.Link className="nav-items" as={Link} to="/DJMC">
                DJ/MC
              </Nav.Link>
              <Nav.Link className="nav-items" as={Link} to="/RentalItems">
                Rental Items
              </Nav.Link>
              <NavDropdown title="Media" className="nav-items">
                <NavDropdown.Item as={Link} to="/MusicVideos">
                  Music Videos
                </NavDropdown.Item>
                {/* <NavDropdown.Item as={Link} to="/Downloads">
                    Downloads
                  </NavDropdown.Item>
                */}
                {/* <NavDropdown.Divider />  */}
              </NavDropdown>
              {isAdmin ? (
                <NavDropdown title="Admin" className="nav-items">
                  <NavDropdown.Item as={Link} to="/rental-items-admin">
                    Rental Items
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/music-video-admin">
                    Music Videos
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/dj-mc-admin">
                    DJ/MC
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/inquiries-admin">
                    Inquiries
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                ""
              )}
            </Nav>
            <Nav variant="pills">
              <Nav.Link className="mx-3" as={Link} to="/Cart">
                <FcShop style={{ fontSize: "200%" }} />
              </Nav.Link>
              {/* {socials.map((social) => (
                <a href={social.linkToSocial} target="_blank" rel="noreferrer">
                  <img alt="" src={social.imageSrc} />
                </a>
              ))} */}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  );
}

export default AppNavbar;
