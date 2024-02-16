import React, { useEffect, useState } from "react";
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
  console.log(inquiries);
  return (
    <Container>
      {inquiries.map((inquiry) => {
        console.log(inquiry);
      })}
    </Container>
  );
}
