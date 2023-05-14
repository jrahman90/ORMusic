import React, { useEffect, useState } from "react";
import { Button, Container, Form } from "react-bootstrap";
import db from "../../api/firestore/firestore";
import { collection, onSnapshot, addDoc } from "firebase/firestore";

function musicVideo(src, title, id) {
  return (
    <div class="ratio ratio-16x9 mb-3" key={id}>
      <iframe src={src} title={title} allowFullScreen></iframe>
    </div>
  );
}

export default function MusicVideoAdmin() {
  const [videos, setVideos] = useState([]);
  const [VideoSrc, setVideoSrc] = useState("");
  const [VideoTitle, setVideoTitle] = useState("");
  console.log(VideoSrc, VideoTitle);
  //post to db
  const addVideo = async (e) => {
    e.preventDefault();
    // const docRef = doc(db, "videos", "alkfdja");
    const payload = {
      src: VideoSrc,
      title: VideoTitle,
    };
    // console.log("payload:", payload);
    // await setDoc(docRef, payload);
    // console.log("added to db!");

    const collectionRef = collection(db, "videos");
    addDoc(collectionRef, payload);
    setVideoSrc("");
    setVideoTitle("");
  };

  //delete from db

  //get videos from db
  useEffect(
    () =>
      onSnapshot(collection(db, "videos"), (snapshot) =>
        setVideos(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })))
      ),
    []
  );
  return (
    <Container style={{ padding: 10 }}>
      <Form className="mb-3 mt-3" onSubmit={addVideo} style={{ padding: 10 }}>
        <Form.Group className="mb-3" controlId="formVideoSrc">
          <Form.Label>Source </Form.Label>
          <Form.Control
            type="text"
            placeholder="embed link for video"
            onChange={(event) => setVideoSrc(event.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="formVideoTitle">
          <Form.Label>Title </Form.Label>
          <Form.Control
            type="text"
            placeholder="Title for video"
            onChange={(event) => setVideoTitle(event.target.value)}
          />
        </Form.Group>
        <Button className="mb-3 mt-3" type="submit">
          Add New Video
        </Button>
      </Form>
      {videos.map((video) => musicVideo(video.src, video.title, video.id))};
    </Container>
  );
}
