import React, { useEffect, useState, useCallback } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import Badge from "react-bootstrap/Badge";
import { getAuth, onAuthStateChanged } from "@firebase/auth";
import {
  getDoc,
  doc,
  collection,
  query,
  where,
  onSnapshot,
} from "@firebase/firestore";
import "./Css/components.css";
import { Link } from "react-router-dom";
import { PiShoppingCartBold } from "react-icons/pi";
import firestore from "../api/firestore/firestore";

function AppNavbar() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [userData, setUserData] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [expanded, setExpanded] = useState(false); // control mobile collapse

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

  // close the navbar after navigation on mobile
  const handleNavItemClick = useCallback(() => {
    setExpanded(false);
  }, []);

  // stable reader for cart count
  const readCartCount = useCallback(() => {
    try {
      const raw = localStorage.getItem("cartItems");
      const arr = raw ? JSON.parse(raw) : [];
      const total = arr.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
      setCartCount((prev) => (prev !== total ? total : prev));
    } catch {
      setCartCount(0);
    }
  }, []);

  // listen once for cart changes
  useEffect(() => {
    readCartCount();
    const onStorage = (e) => {
      if (e.key === "cartItems") readCartCount();
    };
    window.addEventListener("cart:update", readCartCount);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cart:update", readCartCount);
      window.removeEventListener("storage", onStorage);
    };
  }, [readCartCount]);

  // auth subscription
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserData((s) => (s !== null ? null : s));
        setIsAdmin((s) => (s !== null ? null : s));
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserData((prev) =>
            JSON.stringify(prev) !== JSON.stringify(data) ? data : prev
          );
          const nextAdmin = !!data?.isAdmin;
          setIsAdmin((prev) => (prev !== nextAdmin ? nextAdmin : prev));
        } else {
          setUserData((s) => (s !== null ? null : s));
          setIsAdmin((s) => (s !== null ? null : s));
        }
      } catch {
        /* ignore */
      }
    });
    return () => unsub();
  }, [auth, db]);

  // subscribe to Processing inquiries for admins
  useEffect(() => {
    if (!isAdmin) {
      setProcessingCount(0);
      return;
    }
    const q = query(
      collection(db, "inquiries"),
      where("status", "==", "Processing")
    );
    const unsub = onSnapshot(
      q,
      (snap) => setProcessingCount(snap.size || 0),
      () => setProcessingCount(0)
    );
    return () => unsub();
  }, [db, isAdmin]);

  return (
    <Navbar
      bg="primary"
      expand="lg"
      collapseOnSelect
      expanded={expanded}
      onToggle={setExpanded}
    >
      <Container>
        <Navbar.Brand as={Link} to="/" onClick={handleNavItemClick}>
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
          <Nav className="me-auto" onSelect={handleNavItemClick}>
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
              Services
            </Nav.Link>

            <NavDropdown
              title="Media"
              className="nav-items"
              id="media-dropdown"
            >
              <NavDropdown.Item
                className="nav-items-dropdown"
                as={Link}
                to="/MusicVideos"
                onClick={handleNavItemClick}
              >
                Music Videos
              </NavDropdown.Item>
              <NavDropdown.Item
                className="nav-items-dropdown"
                as={Link}
                to="/contact"
                onClick={handleNavItemClick}
              >
                Contact Us
              </NavDropdown.Item>
            </NavDropdown>

            {isAdmin && (
              <NavDropdown
                className="nav-items"
                id="admin-dropdown"
                title={
                  <span className="d-inline-flex align-items-center">
                    Admin
                    {processingCount > 0 && (
                      <Badge
                        bg="light"
                        text="dark"
                        pill
                        className="ms-2"
                        title="Inquiries in Processing"
                      >
                        {processingCount}
                      </Badge>
                    )}
                  </span>
                }
              >
                <NavDropdown.Item
                  as={Link}
                  to="/rental-items-admin"
                  onClick={handleNavItemClick}
                >
                  Rental Items
                </NavDropdown.Item>
                <NavDropdown.Item
                  as={Link}
                  to="/music-video-admin"
                  onClick={handleNavItemClick}
                >
                  Music Videos
                </NavDropdown.Item>
                <NavDropdown.Item
                  as={Link}
                  to="/dj-mc-admin"
                  onClick={handleNavItemClick}
                >
                  DJ/MC
                </NavDropdown.Item>
                <NavDropdown.Item
                  as={Link}
                  to="/inquiries-admin"
                  onClick={handleNavItemClick}
                >
                  Inquiries
                </NavDropdown.Item>
                <NavDropdown.Item
                  as={Link}
                  to="/eventure-admin"
                  onClick={handleNavItemClick}
                >
                  Eventure Admin
                </NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>

          <Nav variant="pills">
            <Nav.Link
              className="mx-3 position-relative"
              as={Link}
              to="/Cart"
              onClick={handleNavItemClick}
            >
              <PiShoppingCartBold style={{ fontSize: "225%" }} />
              {cartCount > 0 && (
                <Badge
                  bg="danger"
                  pill
                  className="position-absolute top-0 start-100 translate-middle"
                >
                  {cartCount}
                </Badge>
              )}
            </Nav.Link>

            {socials.map((s, i) => (
              <a
                key={i}
                href={s.linkToSocial}
                target="_blank"
                rel="noreferrer"
                onClick={handleNavItemClick}
              >
                <img style={{ opacity: ".5" }} alt="" src={s.imageSrc} />
              </a>
            ))}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;
