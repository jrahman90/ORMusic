import React from "react";
import "./Css/components.css";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function Footer() {
  // copyright years
  const startYear = 2008;
  const currentYear = new Date().getFullYear();
  const copyrightYears =
    currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;

  return (
    <div>
      <Container className="mb-3" align="center">
        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/contact">Contact Us</Link>
          <Link className="footer-mobile-only" to="/MusicVideos">
            Music Videos
          </Link>
        </nav>
        <a
          href="https://www.facebook.com/ormusicevents"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="" src="facebook.png" />
        </a>
        <a
          href="https://www.instagram.com/ormusic.events/"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="" src="instagram.png" />
        </a>
        <a
          href="https://www.youtube.com/channel/UCdtFAaHPQxzm-jKlPgKPngQ"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="" src="youtube.png" />
        </a>
        <a
          href="https://www.tiktok.com/@officialopu"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="" src="tiktok.png" />
        </a>
        <h3
          align="center"
          style={{ fontFamily: "sans serif, arial or verdana" }}
        >
          © {copyrightYears} OR Music Events
        </h3>
      </Container>
    </div>
  );
}
