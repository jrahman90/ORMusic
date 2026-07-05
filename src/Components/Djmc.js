import React, { useState, useEffect } from "react";
import { Container, Row, Col, Image } from "react-bootstrap";
import db from "../api/firestore/firestore";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

const Djmc = () => {
  const [artists, setartists] = useState([]);

  useEffect(() => {
    const fetchartists = async () => {
      const artistsCollection = collection(db, "artists");

      const artistsQuery = query(artistsCollection, orderBy("number", "asc"));

      const artistsSnapshot = await getDocs(artistsQuery);

      const artistsData = artistsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setartists(artistsData);
    };

    fetchartists();
  }, []);

  return (
    <Container className="my-3">
      <h1 className="heading-text">Meet The Team!</h1>

      <p className="page-intro-text text-center">
        Get to know the OR Music Events team behind our DJ, MC, hosting, and
        event production experiences.
      </p>

      <Row>
        {artists.map((artist, index) => (
          <Row
            key={artist.id}
            className={index % 2 === 0 ? "flex-row" : "flex-row-reverse"}
          >
            <Col
              sm={12}
              md={6}
              className="d-flex align-items-center"
              style={{ justifyContent: "center" }}
            >
              <Image
                src={artist.imageUrl}
                alt={`${artist.name || "OR Music Events team member"} portrait`}
                roundedCircle
                fluid
              />
            </Col>

            <Col
              sm={12}
              md={6}
              className="d-flex align-items-center justify-content-center"
              style={{ textAlign: "center" }}
            >
              <div>
                <h2 className="heading-subtext">{artist.name}</h2>
                <p className="paragraph-text">{artist.description}</p>
              </div>
            </Col>
          </Row>
        ))}
      </Row>
    </Container>
  );
};

export default Djmc;
