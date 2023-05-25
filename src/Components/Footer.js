import React from "react";
import "./Css/components.css";
import { Container } from "react-bootstrap";

export default function Footer() {
  return (
    <div>
      <Container className="mb-3" align='center'>
        <a href="https://www.facebook.com/ormusicevents" target="_blank"  rel="noreferrer">
        <img alt="" src="facebook.png"/>
        </a>
        <a href="https://www.instagram.com/ormusic.events/" target="_blank" rel="noreferrer">
        <img alt="" src="instagram.png"/>
        </a>
        <a href="https://www.youtube.com/channel/UCdtFAaHPQxzm-jKlPgKPngQ" target="_blank" rel="noreferrer">
        <img alt="" src="youtube.png"/>
        </a>
        <a href="https://www.tiktok.com/@officialopu" target="_blank" rel="noreferrer">
        <img alt="" src="tiktok.png"/>
        </a>
      <h3 align="center" vertical-align="bottom" style={{fontFamily: 'sans serif, arial or verdana'}}>
        © 2023 OR Music
      </h3>
      </Container>
    </div>
  );
}
