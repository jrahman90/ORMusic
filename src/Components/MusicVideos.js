import React from "react";
import { Container } from "react-bootstrap";

export default function MusicVideos() {
  return (
    <Container style={{ padding: 10 }}>
      <div class="ratio ratio-16x9 mb-3">
        <iframe
          src="https://www.youtube.com/embed/0rp7xXsNGq0"
          title="3:30 NFT | C-Let ft. Bangy"
          allowFullScreen
        ></iframe>
      </div>
      <div class="ratio ratio-16x9 mb-3">
        <iframe
          src="https://www.youtube.com/embed/AshOkyAd264"
          title="Amay Bhasayli Re | Opu Rahman"
          allowFullScreen
        ></iframe>
      </div>
      <div class="ratio ratio-16x9 mb-3">
        <iframe
          src="https://www.youtube.com/embed/jJusWWwCj14"
          title="Piya Re Piya | Opu Rahman"
          allowFullScreen
        ></iframe>
      </div>
      <div class="ratio ratio-16x9 mb-3">
        <iframe
          src="https://www.youtube.com/embed/6_YHaPKiYk0"
          title="Tumi Bihone | Arfin Rumey ft. Opu Rahman"
          allowFullScreen
        ></iframe>
      </div>
    </Container>
  );
}
