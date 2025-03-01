import React, { useEffect, useState } from "react";
import { Container, Alert, Card, Spinner } from "react-bootstrap";
import { collection, onSnapshot } from "firebase/firestore";
import db from "../api/firestore/firestore";

function VideoCard({ video }) {
  return (
    <Card className="mb-4 shadow-sm">
      <div className="ratio ratio-16x9">
        <iframe
          src={video.src}
          title={video.title}
          allowFullScreen
          frameBorder="0"
        ></iframe>
      </div>
      <Card.Body>
        <Card.Title className="text-capitalize">{video.title}</Card.Title>
      </Card.Body>
    </Card>
  );
}

export default function MusicVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "videos"),
      (snapshot) => {
        const videoList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVideos(videoList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching videos:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (!videos.length) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          No videos available at this time. Please come back later.
        </Alert>
      </Container>
    );
  }

  // Sort videos by videoNumber and reverse for the desired order.
  const sortedVideos = [...videos]
    .sort((a, b) => a.videoNumber - b.videoNumber)
    .reverse();

  return (
    <Container className="py-5">
      {sortedVideos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </Container>
  );
}
