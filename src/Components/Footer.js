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
          <Link to="/services">Event services</Link>
          <Link to="/team">DJs and MCs</Link>
          <Link to="/contact">Contact Us</Link>
          <Link className="footer-mobile-only" to="/music-videos">
            Music Videos
          </Link>
        </nav>
        <a
          href="https://www.facebook.com/ormusicevents"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="OR Music Events on Facebook" width="32" height="32" loading="lazy" src="/facebook.png" />
        </a>
        <a
          href="https://www.instagram.com/ormusic.events/"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="OR Music Events on Instagram" width="32" height="32" loading="lazy" src="/instagram.png" />
        </a>
        <a
          href="https://www.youtube.com/channel/UCdtFAaHPQxzm-jKlPgKPngQ"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="OR Music Events on Youtube" width="32" height="32" loading="lazy" src="/youtube.png" />
        </a>
        <a
          href="https://www.tiktok.com/@officialopu"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="OR Music Events on Tiktok" width="32" height="32" loading="lazy" src="/tiktok.png" />
        </a>
        <p
          align="center"
          style={{ fontFamily: "sans serif, arial or verdana" }}
        >
          © {copyrightYears} OR Music Events
        </p>
      </Container>
    </div>
  );
}
