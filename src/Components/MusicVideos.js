import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import db from "../api/firestore/firestore";
import { collection, onSnapshot } from "firebase/firestore";

function musicVideo(src, title, id) {
  return (
    <div class="ratio ratio-16x9 mb-3" key={id}>
      <iframe src={src} title={title} allowFullScreen></iframe>
    </div>
  );
}

export default function MusicVideos() {
  const [videos, setVideos] = useState([]);

  useEffect(
    () =>
      onSnapshot(collection(db, "videos"), (snapshot) =>
        setVideos(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })))
      ),
    []
  );

  return (
    <Container style={{ padding: 10 }}>
      {videos
        .map((video) => musicVideo(video.src, video.title, video.id))
        .reverse()}
      {musicVideo(
        "https://www.youtube.com/embed/0rp7xXsNGq0",
        "3:30 NFT | C-Let ft. Bangy"
      )}
      {musicVideo(
        "https://www.youtube.com/embed/E8S59PL8Eng",
        "Oulo | C-Let | Rhythmsta | Fokhor | SQ | Bangy"
      )}
      {musicVideo(
        "https://www.youtube.com/embed/u3cJyEn1utU",
        "Bangladesh | C-Let | Opu | SQ | Lowkey B | Has"
      )}
      {musicVideo(
        "https://www.youtube.com/embed/AshOkyAd264",
        "Amay Bhasayli Re | Opu Rahman"
      )}
      {musicVideo(
        "https://www.youtube.com/embed/jJusWWwCj14",
        "Piya Re Piya | Opu Rahman"
      )}
      {musicVideo(
        "https://www.youtube.com/embed/6_YHaPKiYk0",
        "Tumi Bihone | Arfin Rumey ft. Opu Rahman"
      )}
    </Container>
  );
}
