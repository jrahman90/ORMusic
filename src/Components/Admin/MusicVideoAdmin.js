import React, { useEffect, useState } from "react";
import { Button, Container, Form, Modal } from "react-bootstrap";
import db from "../../api/firestore/firestore";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { dateId } from "../../hooks/functions";

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);

  //post to db
  const addVideo = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        src: VideoSrc,
        title: VideoTitle,
        DateId: dateId(),
        videoNumber: videos.length + 1,
      };

      const collectionRef = collection(db, "videos");
      addDoc(collectionRef, payload);
      setVideoSrc("");
      setVideoTitle("");
    } catch (error) {
      console.log(error);
    }
  };

  //delete video
  const handleDelete = (video) => {
    setVideoToDelete(video);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    // Delete video from Firestore
    try {
      await deleteDoc(doc(db, "videos", videoToDelete.id));
    } catch (error) {
      console.log(error);
    }

    // Update the videos state by removing the deleted video
    setVideos((prevVideos) =>
      prevVideos.filter((video) => video.id !== videoToDelete.id)
    );

    // Close the modal and reset videoToDelete
    setShowDeleteModal(false);
    setVideoToDelete(null);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setVideoToDelete(null);
  };

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
      {videos &&
        videos
          .sort((a, b) => (a.videoNumber < b.videoNumber ? 1 : -1))
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
              <Button onClick={() => handleDelete(video)}>Delete</Button>
              <div className="line"></div>
            </ul>
          ))}
      {/* confirmation modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this video?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
