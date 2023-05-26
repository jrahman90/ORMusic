import React, { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import db from "../api/firestore/firestore";
import { collection, onSnapshot } from "firebase/firestore";
import Alert from 'react-bootstrap/Alert'

function musicVideo(src, title) {
  return (
    <div className="ratio ratio-16x9 mb-3">
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
      {videos ? videos
        .map((video) => (
          <ul
            align="center"
            key={video.id}
            style={{
              padding: 0,
              listStyleType: "none",
            }}
          >
            <li>{musicVideo(video.src, video.title)}</li>
            <div className="line"></div>
          </ul>
        )).reverse(): <Alert variant={'danger'} >NO VIDEOS AVAILABLE AT THIS TIME. PLEASE COME BACK LATER</Alert >
        }
    </Container>
  );
}
