import React, { useEffect, useState } from "react";
import { Button, Container, Form } from "react-bootstrap";
import db from "../../api/firestore/firestore";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

function musicVideo(src, title) {
  return (
    <div className="ratio ratio-16x9 mb-1">
      <iframe src={src} title={title} allowFullScreen></iframe>
    </div>
  );
}

export default function MusicVideoAdmin() {
  const [videos, setVideos] = useState([]);
  const [VideoSrc, setVideoSrc] = useState("");
  const [VideoTitle, setVideoTitle] = useState("");

  //post to db
  const addVideo = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        src: VideoSrc,
        title: VideoTitle,
      };

      const collectionRef = collection(db, "videos");
      addDoc(collectionRef, payload);
      setVideoSrc("");
      setVideoTitle("");
    } catch (error) {
      console.log(error);
    }
  };

  //delete from db
  const handleDelete = async (id) => {
    try {
      const docRef = doc(db, "videos", id);
      await deleteDoc(docRef);
    } catch (error) {
      console.log(error);
    }
  };
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
      {videos.map((video) => (
        <ul
          align="center"
          key={video.id}
          style={{
            padding: 0,
            listStyleType: "none",
          }}
        >
          <li>{musicVideo(video.src, video.title)}</li>
          <Button onClick={() => handleDelete(video.id)}>Delete</Button>
          <div className="line"></div>
        </ul>
      ))}
    </Container>
  );
}
