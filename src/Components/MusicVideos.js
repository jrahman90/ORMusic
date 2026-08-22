import React, { useEffect, useMemo, useState } from "react";
import { Badge, Container, Spinner } from "react-bootstrap";
import { collection, onSnapshot } from "firebase/firestore";
import { Film, PlayCircle, Radio, Video } from "lucide-react";
import db from "../api/firestore/firestore";
import { normalizeVideoSrc, sortVideosNewestFirst } from "../utils/videos";

function VideoCard({ video, featured = false }) {
  const title = video.title || "OR Music Events video";
  const src = normalizeVideoSrc(video.src);

  return (
    <article className={featured ? "music-video-feature" : "music-video-card"}>
      <div className="music-video-frame">
        {src ? (
          <iframe
            src={src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="music-video-missing">
            <Video size={30} />
            <span>Video unavailable</span>
          </div>
        )}
      </div>

      <div className="music-video-body">
        <span>
          <PlayCircle size={15} />
          OR Music Events
        </span>
        <h3>{title}</h3>
      </div>
    </article>
  );
}

export default function MusicVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "videos"),
      (snapshot) => {
        const videoList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVideos(videoList);
        setLoadError("");
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching videos:", error);
        setLoadError("We could not load the video library right now.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const sortedVideos = useMemo(
    () => sortVideosNewestFirst(videos),
    [videos]
  );

  const featuredVideo = sortedVideos[0];
  const galleryVideos = sortedVideos.slice(1);

  return (
    <main className="music-videos-page">
      <section className="music-videos-hero">
        <Container className="music-videos-hero-inner">
          <div className="music-videos-hero-copy">
            <span>
              <Film size={17} />
              Music videos
            </span>
            <h1>Watch the sound in motion</h1>
            <p>
              Performance clips, event recaps, and creative projects from OR
              Music Events.
            </p>
          </div>

          <div className="music-videos-summary">
            <div>
              <strong>{loading ? "-" : sortedVideos.length}</strong>
              <span>Videos</span>
            </div>
            <div>
              <Radio size={18} />
              <span>Live energy</span>
            </div>
          </div>
        </Container>
      </section>

      <Container className="music-videos-content">
        {loading ? (
          <div className="music-videos-state">
            <Spinner animation="border" role="status" />
            <span>Loading videos</span>
          </div>
        ) : loadError ? (
          <div className="music-videos-state">{loadError}</div>
        ) : !featuredVideo ? (
          <div className="music-videos-state">
            No videos available at this time.
          </div>
        ) : (
          <>
            <section className="music-videos-feature-section">
              <div className="music-videos-section-heading">
                <div>
                  <Badge bg="light" text="dark">
                    Featured
                  </Badge>
                  <h2>{featuredVideo.title || "Latest video"}</h2>
                </div>
                <p>Start with the newest feature from the video library.</p>
              </div>
              <VideoCard video={featuredVideo} featured />
            </section>

            {galleryVideos.length > 0 ? (
              <section className="music-videos-library-section">
                <div className="music-videos-section-heading">
                  <div>
                    <Badge bg="light" text="dark">
                      Library
                    </Badge>
                    <h2>More videos</h2>
                  </div>
                  <p>Browse the rest of the OR Music Events video collection.</p>
                </div>
                <div className="music-videos-grid">
                  {galleryVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </Container>
    </main>
  );
}
