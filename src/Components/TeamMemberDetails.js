import React, { useEffect, useState } from "react";
import { Button, Container, Spinner } from "react-bootstrap";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Headphones, Music2, Sparkles } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import db from "../api/firestore/firestore";

import ProfileSeo from "./ProfileSeo";

const splitBio = (value = "") =>
  String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

export default function TeamMemberDetails() {
  const { artistId } = useParams();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const loadArtist = async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "artists", artistId));
        if (!active) return;

        if (!snap.exists()) {
          setLoadError("This team profile could not be found.");
          setArtist(null);
          return;
        }

        setArtist({ id: snap.id, ...snap.data() });
        setLoadError("");
      } catch (error) {
        console.error("Team profile load failed:", error);
        if (active) {
          setLoadError("We could not load this team profile right now.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadArtist();
    return () => {
      active = false;
    };
  }, [artistId]);

  const title =
    artist?.title || artist?.role || artist?.position || "Event specialist";
  const bio = splitBio(artist?.description);

  return (
    <main className="team-profile-page">
      <ProfileSeo artist={artist} missing={!loading && !!loadError} />
      <Container className="team-profile-container">
        <Button
          as={Link}
          to="/team"
          variant="link"
          className="team-profile-back"
        >
          <ArrowLeft size={17} />
          Back to team
        </Button>

        {loading ? (
          <div className="team-loading">
            <h1>OR Music Events Team Profile</h1>
            <Spinner animation="border" role="status" />
            <span>Loading profile</span>
          </div>
        ) : loadError ? (
          <div className="team-empty"><h1>Team profile unavailable</h1><p>{loadError}</p></div>
        ) : (
          <>
            <section className="team-profile-hero">
              <div className="team-profile-photo">
                {artist.imageUrl ? (
                  <img
                    src={artist.imageUrl}
                    alt={`${artist.name || "OR Music Events team member"} portrait`}
                  />
                ) : (
                  <Headphones size={54} />
                )}
              </div>

              <div className="team-profile-copy">
                <span className="team-kicker">{title}</span>
                <h1>{artist.name || "OR Music Events Team"}</h1>
                <p>
                  Get to know the personality, hosting style, and event energy
                  behind this OR Music Events team member.
                </p>
                <div className="team-profile-actions">
                  <Button as={Link} to="/services">
                    Explore services
                  </Button>
                  <Button as={Link} to="/team" variant="outline-primary">
                    View full team
                  </Button>
                </div>
              </div>
            </section>

            <section className="team-profile-story">
              <div>
                <span className="team-kicker">Profile</span>
                <h2>About {artist.name || "this team member"}</h2>
              </div>
              <div className="team-profile-bio">
                {bio.length ? (
                  bio.map((line) => <p key={line}>{line}</p>)
                ) : (
                  <p>
                    A trusted part of the OR Music Events crew for polished,
                    high-energy event experiences.
                  </p>
                )}
              </div>
            </section>

            <section className="team-profile-services">
              <div>
                <Music2 size={22} />
                <strong>Ready to build the event around the right sound?</strong>
                <span>
                  Browse packages, add-ons, and production services before
                  sending your inquiry.
                </span>
              </div>
              <Button as={Link} to="/services">
                Choose services
                <Sparkles size={16} />
              </Button>
            </section>
          </>
        )}
      </Container>
    </main>
  );
}
