import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Film,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import db from "../../api/firestore/firestore";
import { dateId } from "../../hooks/functions";
import { normalizeVideoSrc, sortVideosNewestFirst } from "../../utils/videos";
import { AdminToastOutlet, useAdminToasts } from "./useAdminToasts";

const emptyDraft = {
  title: "",
  src: "",
  description: "",
  category: "",
};

function VideoPreview({ src, title = "Music video preview" }) {
  const embedSrc = normalizeVideoSrc(src);

  return (
    <div className="admin-video-preview">
      {embedSrc ? (
        <iframe
          src={embedSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <div>
          <Video size={28} />
          <span>Preview appears after a video link is added</span>
        </div>
      )}
    </div>
  );
}

export default function MusicVideoAdmin() {
  const [videos, setVideos] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);
  const [deleteVideo, setDeleteVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const { removeToast, showToast, toasts } = useAdminToasts();

  useEffect(() => {
    const stop = onSnapshot(
      collection(db, "videos"),
      (snapshot) => {
        setVideos(snapshot.docs.map((row) => ({ id: row.id, ...row.data() })));
        setLoadError("");
        setLoading(false);
      },
      (error) => {
        console.error("Videos admin load failed:", error);
        setLoadError("Could not load videos.");
        setLoading(false);
      }
    );

    return () => stop();
  }, []);

  const sortedVideos = useMemo(() => sortVideosNewestFirst(videos), [videos]);
  const nextVideoNumber = useMemo(
    () => Math.max(0, ...videos.map((video) => Number(video.videoNumber || 0))) + 1,
    [videos]
  );

  const setDraftField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const setEditDraftField = (key, value) => {
    setEditDraft((current) => ({ ...current, [key]: value }));
  };

  const addVideo = async (event) => {
    event.preventDefault();
    const title = draft.title.trim();
    const src = normalizeVideoSrc(draft.src);
    if (!title || !src) return;

    try {
      setSaving(true);
      await addDoc(collection(db, "videos"), {
        title,
        src,
        description: draft.description.trim(),
        category: draft.category.trim(),
        DateId: dateId(),
        videoNumber: nextVideoNumber,
      });
      setDraft(emptyDraft);
      showToast("Video added to the public library.");
    } catch (error) {
      console.error("Video create failed:", error);
      showToast("Could not add this video. Check the console for details.", {
        title: "Video not added",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (video) => {
    setEditingVideo(video);
    setEditDraft({
      title: video.title || "",
      src: video.src || "",
      description: video.description || "",
      category: video.category || "",
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingVideo) return;
    const title = editDraft.title.trim();
    const src = normalizeVideoSrc(editDraft.src);
    if (!title || !src) return;

    try {
      setSaving(true);
      await updateDoc(doc(db, "videos", editingVideo.id), {
        title,
        src,
        description: editDraft.description.trim(),
        category: editDraft.category.trim(),
      });
      setEditingVideo(null);
      setEditDraft(emptyDraft);
      showToast("Video updated.");
    } catch (error) {
      console.error("Video update failed:", error);
      showToast("Could not update this video. Check the console for details.", {
        title: "Video not updated",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const moveVideo = async (videoId, offset) => {
    const currentIndex = sortedVideos.findIndex((video) => video.id === videoId);
    const targetIndex = currentIndex + offset;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedVideos.length) {
      return;
    }

    const reordered = [...sortedVideos];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      setSaving(true);
      const batch = writeBatch(db);
      reordered.forEach((video, index) => {
        batch.update(doc(db, "videos", video.id), {
          videoNumber: reordered.length - index,
        });
      });
      await batch.commit();
      showToast("Video order updated.");
    } catch (error) {
      console.error("Video order update failed:", error);
      showToast("Could not update video order. Check the console for details.", {
        title: "Order not updated",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteVideo) return;
    try {
      setSaving(true);
      await deleteDoc(doc(db, "videos", deleteVideo.id));
      setDeleteVideo(null);
      showToast("Video deleted.");
    } catch (error) {
      console.error("Video delete failed:", error);
      showToast("Could not delete this video. Check the console for details.", {
        title: "Video not deleted",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container fluid="xl" className="admin-media-page py-3">
      <div className="admin-dashboard-header">
        <div>
          <div className="admin-dashboard-kicker">
            <Film size={16} />
            Media admin
          </div>
          <h1>Music videos</h1>
          <p>Manage the public music video library and feature order.</p>
        </div>

        <div className="admin-dashboard-summary" aria-label="Video summary">
          <div>
            <span>Videos</span>
            <strong>{videos.length}</strong>
          </div>
          <div>
            <span>Featured</span>
            <strong>{sortedVideos.length ? "1" : "0"}</strong>
          </div>
          <div>
            <span>Next</span>
            <strong>{nextVideoNumber}</strong>
          </div>
        </div>
      </div>

      <section className="admin-dashboard-panel admin-media-panel">
        <div className="admin-media-section-heading">
          <div>
            <span>Add video</span>
            <h2>New library item</h2>
          </div>
        </div>

        <Form onSubmit={addVideo}>
          <Row className="g-3 align-items-end">
            <Col lg={5}>
              <Form.Label>Video title</Form.Label>
              <Form.Control
                value={draft.title}
                onChange={(event) => setDraftField("title", event.target.value)}
                disabled={saving}
              />
            </Col>
            <Col lg={7}>
              <Form.Label>YouTube or embed link</Form.Label>
              <Form.Control
                value={draft.src}
                onChange={(event) => setDraftField("src", event.target.value)}
                disabled={saving}
              />
            </Col>
            <Col lg={4}>
              <Form.Label>Category</Form.Label>
              <Form.Control
                value={draft.category}
                onChange={(event) => setDraftField("category", event.target.value)}
                disabled={saving}
              />
            </Col>
            <Col lg={6}>
              <Form.Label>Description</Form.Label>
              <Form.Control
                value={draft.description}
                onChange={(event) =>
                  setDraftField("description", event.target.value)
                }
                disabled={saving}
              />
            </Col>
            <Col lg={2}>
              <Button
                type="submit"
                className="w-100"
                disabled={saving || !draft.title.trim() || !draft.src.trim()}
              >
                <Plus size={16} />
                Add
              </Button>
            </Col>
          </Row>
        </Form>

        <VideoPreview src={draft.src} title={draft.title} />
      </section>

      <section className="admin-dashboard-panel admin-media-panel">
        <div className="admin-media-section-heading">
          <div>
            <span>Library</span>
            <h2>Current videos</h2>
          </div>
        </div>

        {loading ? (
          <div className="admin-dashboard-empty compact">
            <Spinner animation="border" size="sm" />
            Loading videos
          </div>
        ) : loadError ? (
          <div className="admin-dashboard-empty compact">{loadError}</div>
        ) : sortedVideos.length === 0 ? (
          <div className="admin-dashboard-empty compact">No videos yet.</div>
        ) : (
          <div className="admin-video-list">
            {sortedVideos.map((video, index) => (
              <article key={video.id} className="admin-video-row">
                <VideoPreview src={video.src} title={video.title} />
                <div className="admin-video-row-main">
                  <div className="admin-video-row-title">
                    <div>
                      <Badge bg={index === 0 ? "primary" : "light"} text={index === 0 ? undefined : "dark"}>
                        {index === 0 ? "Featured" : `Order ${index + 1}`}
                      </Badge>
                      {video.category ? (
                        <Badge bg="light" text="dark">
                          {video.category}
                        </Badge>
                      ) : null}
                    </div>
                    <h3>{video.title || "Untitled video"}</h3>
                    {video.description ? <p>{video.description}</p> : null}
                    <span>{video.src}</span>
                  </div>

                  <div className="admin-video-row-actions">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => moveVideo(video.id, -1)}
                      disabled={saving || index === 0}
                      aria-label="Move video up"
                    >
                      <ArrowUp size={15} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => moveVideo(video.id, 1)}
                      disabled={saving || index === sortedVideos.length - 1}
                      aria-label="Move video down"
                    >
                      <ArrowDown size={15} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => openEdit(video)}
                      disabled={saving}
                    >
                      <Edit3 size={15} />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => setDeleteVideo(video)}
                      disabled={saving}
                    >
                      <Trash2 size={15} />
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        show={Boolean(editingVideo)}
        onHide={() => setEditingVideo(null)}
        size="lg"
        centered
      >
        <Form onSubmit={saveEdit}>
          <Modal.Header closeButton>
            <Modal.Title>Edit video</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col xs={12}>
                <VideoPreview src={editDraft.src} title={editDraft.title} />
              </Col>
              <Col md={6}>
                <Form.Label>Video title</Form.Label>
                <Form.Control
                  value={editDraft.title}
                  onChange={(event) =>
                    setEditDraftField("title", event.target.value)
                  }
                  disabled={saving}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Category</Form.Label>
                <Form.Control
                  value={editDraft.category}
                  onChange={(event) =>
                    setEditDraftField("category", event.target.value)
                  }
                  disabled={saving}
                />
              </Col>
              <Col xs={12}>
                <Form.Label>YouTube or embed link</Form.Label>
                <Form.Control
                  value={editDraft.src}
                  onChange={(event) => setEditDraftField("src", event.target.value)}
                  disabled={saving}
                />
              </Col>
              <Col xs={12}>
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editDraft.description}
                  onChange={(event) =>
                    setEditDraftField("description", event.target.value)
                  }
                  disabled={saving}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setEditingVideo(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saving || !editDraft.title.trim() || !editDraft.src.trim()
              }
            >
              {saving ? "Saving..." : "Save video"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(deleteVideo)} onHide={() => setDeleteVideo(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete video</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete <strong>{deleteVideo?.title || "this video"}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setDeleteVideo(null)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={saving}>
            {saving ? "Deleting..." : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>

      <AdminToastOutlet toasts={toasts} onClose={removeToast} />
    </Container>
  );
}
