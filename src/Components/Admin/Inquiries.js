import React, { useEffect, useState } from "react";
import { Card, Col, Row } from "react-bootstrap";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import db from "../../api/firestore/firestore";
import { Container } from "react-bootstrap";

export default function Inquiries() {
  const [inquiries, setInquiries] = useState([]);

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const inquiriesRef = collection(db, "inquiries");
        const inquiriesQuery = query(
          inquiriesRef,
          orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(inquiriesQuery);

        const userInquiries = [];
        snapshot.forEach((doc) => {
          const inquiry = doc.data();
          userInquiries.push(inquiry);
        });

        setInquiries(userInquiries);
      } catch (error) {
        console.error("Error fetching inquiries:", error);
      }
    };

    fetchInquiries();
  }, []);
  return (
    <Container style={{ marginTop: "1rem" }}>
      <Row xs={1} md={2} lg={3} className="g-4" align="center">
        {inquiries.map((inquiry, idx) => (
          <Col key={idx}>
            <Card style={{ width: "18rem" }}>
              <Card.Body>
                <Card.Title>{inquiry.status}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                  {inquiry.phoneNumber}
                </Card.Subtitle>
                <Card.Subtitle className="mb-2 text-muted">
                  {inquiry.email}
                </Card.Subtitle>
                <Card.Text>{inquiry.eventDetails}</Card.Text>
                <div className="line"></div>
                {inquiry.items.map((item) => (
                  <>
                    <Card.Text>{`${item.name} - Q: ${item.quantity}`}</Card.Text>
                    <Card.Text>{item.description}</Card.Text>
                    <div className="line-dotted" />
                  </>
                ))}
                <Card.Text></Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
