import React, { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import { getAuth, onAuthStateChanged } from "@firebase/auth";
import { getDoc, doc } from "@firebase/firestore";
import "./Css/components.css";
import { Link } from "react-router-dom";
import { PiShoppingCartBold } from "react-icons/pi";

import firestore from "../api/firestore/firestore";

function AppNavbar() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [userData, setUserData] = useState(null);
  const [navExpanded, setNavExpanded] = useState(false);

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
  }, [auth, db]);

  // Handler to close navbar on link click
  const handleNavItemClick = () => {
    setNavExpanded(false);
  };

  return (
    <div>
      <Navbar
        bg="primary"
        expand="lg"
        expanded={navExpanded}
        onToggle={() => setNavExpanded((prev) => !prev)}
      >
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
              <Nav.Link
                className="nav-items"
                as={Link}
                to="/"
                onClick={handleNavItemClick}
              >
                Home
              </Nav.Link>
              <Nav.Link
                className="nav-items"
                as={Link}
                to="/contact"
                onClick={handleNavItemClick}
              >
                Contact Us
              </Nav.Link>
              <Nav.Link
                className="nav-items"
                as={Link}
                to="/DJMC"
                onClick={handleNavItemClick}
              >
                DJ/MC
              </Nav.Link>
              <Nav.Link
                className="nav-items"
                as={Link}
                to="/RentalItems"
                onClick={handleNavItemClick}
              >
                Rental Items
              </Nav.Link>

              {/* MEDIA DROPDOWN */}
              <NavDropdown title="Media" className="nav-items">
                <NavDropdown.Item
                  className="nav-items-dropdown"
                  as={Link}
                  to="/MusicVideos"
                  onClick={handleNavItemClick}
                >
                  Music Videos
                </NavDropdown.Item>
                {/* Additional dropdown items here if needed */}
              </NavDropdown>

              {/* ADMIN DROPDOWN (only if admin) */}
              {isAdmin && (
                <NavDropdown title="Admin" className="nav-items">
                  <NavDropdown.Item
                    className="nav-items-dropdown"
                    as={Link}
                    to="/rental-items-admin"
                    onClick={handleNavItemClick}
                  >
                    Rental Items
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    className="nav-items-dropdown"
                    as={Link}
                    to="/music-video-admin"
                    onClick={handleNavItemClick}
                  >
                    Music Videos
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    className="nav-items-dropdown"
                    as={Link}
                    to="/dj-mc-admin"
                    onClick={handleNavItemClick}
                  >
                    DJ/MC
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    className="nav-items-dropdown"
                    as={Link}
                    to="/inquiries-admin"
                    onClick={handleNavItemClick}
                  >
                    Inquiries
                  </NavDropdown.Item>
                  <NavDropdown.Item
                    className="nav-items-dropdown"
                    as={Link}
                    to="/eventure-admin"
                    onClick={handleNavItemClick}
                  >
                    Eventure Admin
                  </NavDropdown.Item>
                </NavDropdown>
              )}
            </Nav>

            {/* CART & SOCIALS */}
            <Nav variant="pills">
              <Nav.Link
                className="mx-3"
                as={Link}
                to="/Cart"
                onClick={handleNavItemClick}
              >
                <PiShoppingCartBold style={{ fontSize: "225%" }} />
              </Nav.Link>
              {socials.map((social, idx) => (
                <a
                  key={idx}
                  href={social.linkToSocial}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleNavItemClick}
                >
                  <img style={{ opacity: ".5" }} alt="" src={social.imageSrc} />
                </a>
              ))}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </div>
  );
}

export default AppNavbar;
