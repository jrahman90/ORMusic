import React, { useEffect, useMemo, useState } from "react";
import { Button, Container, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { ArrowRight, Headphones, Mic2, Music2, Sparkles } from "lucide-react";
import db from "../api/firestore/firestore";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

const Djmc = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchArtists = async () => {
      try {
        setLoading(true);
        const artistsCollection = collection(db, "artists");
        const artistsQuery = query(artistsCollection, orderBy("number", "asc"));
        const artistsSnapshot = await getDocs(artistsQuery);
        const artistsData = artistsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (!active) return;
        setArtists(artistsData);
        setLoadError("");
      } catch (error) {
        console.error("Team page load failed:", error);
        if (active) {
          setLoadError("We could not load the team right now.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchArtists();
    return () => {
      active = false;
    };
  }, []);

  const featuredArtist = useMemo(
    () => artists.find((artist) => artist.imageUrl) || artists[0],
    [artists]
  );

  const introStats = [
    { label: "DJ", detail: "Music direction", icon: Music2 },
    { label: "MC", detail: "Room command", icon: Mic2 },
    { label: "Host", detail: "Guest flow", icon: Sparkles },
  ];

  const shortBio = (value = "") => {
    const firstLine = String(value || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean);
    if (!firstLine) {
      return "Meet one of the trusted personalities behind OR Music Events.";
    }
    return firstLine.length > 150 ? `${firstLine.slice(0, 147).trim()}...` : firstLine;
  };

  return (
    <main className="team-page">
      <section className="team-hero">
        <Container className="team-hero-inner">
          <div className="team-hero-copy">
            <span className="team-kicker">OR Music Events Team</span>
            <h1>Meet the people behind the music</h1>
            <p>
              DJs, MCs, hosts, and production-minded event pros who keep the
              room moving, the schedule calm, and the celebration personal.
            </p>
            <div className="team-hero-actions">
              <Button as={Link} to="/RentalItems">
                Explore services
              </Button>
              <Button as={Link} to="/RentalItems" variant="outline-light">
                View packages
              </Button>
            </div>
          </div>

          <div className="team-hero-panel" aria-label="Team highlights">
            {introStats.map(({ label, detail, icon: Icon }) => (
              <div key={label}>
                <Icon size={22} />
                <strong>{label}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="team-roster-section">
        <div className="team-section-heading">
          <div>
            <span className="team-kicker">Roster</span>
            <h2>Personalities for every kind of room</h2>
          </div>
          <p>
            From the first announcement to the final track, each team member
            brings a different presence to weddings, private parties, corporate
            events, and community celebrations.
          </p>
        </div>

        {loading ? (
          <div className="team-loading">
            <Spinner animation="border" role="status" />
            <span>Loading the team</span>
          </div>
        ) : loadError ? (
          <div className="team-empty">{loadError}</div>
        ) : artists.length === 0 ? (
          <div className="team-empty">Team profiles are coming soon.</div>
        ) : (
          <div className="team-grid">
            {artists.map((artist) => {
              const title =
                artist.title || artist.role || artist.position || "Event specialist";

              return (
                <article key={artist.id} className="team-member-card">
                  <div className="team-member-photo">
                    {artist.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt={`${artist.name || "OR Music Events team member"} portrait`}
                      />
                    ) : featuredArtist?.imageUrl ? (
                      <img
                        src={featuredArtist.imageUrl}
                        alt="OR Music Events team"
                      />
                    ) : (
                      <Headphones size={42} />
                    )}
                  </div>

                  <div className="team-member-body">
                    <span>{title}</span>
                    <h3>{artist.name || "OR Music Events Team"}</h3>
                    <p>{shortBio(artist.description)}</p>
                    <div className="team-member-actions">
                      <Button
                        as={Link}
                        to={`/DJMC/${artist.id}`}
                        variant="outline-primary"
                        size="sm"
                      >
                        View profile
                        <ArrowRight size={14} />
                      </Button>
                      <Button
                        as={Link}
                        to="/RentalItems"
                        variant="link"
                        size="sm"
                      >
                        Services
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Container>

      <section className="team-cta-band">
        <Container className="team-cta-inner">
          <div>
            <span className="team-kicker">Plan the feel</span>
            <h2>Match the right sound, host, and setup to your event.</h2>
          </div>
          <Button as={Link} to="/RentalItems">
            Explore services
          </Button>
        </Container>
      </section>
    </main>
  );
};

export default Djmc;
