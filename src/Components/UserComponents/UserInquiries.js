import React from "react";
import { Alert, Container } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import PreviousInquiries from "./PreviousInquiries";

export default function UserInquiries() {
  const location = useLocation();
  const inquirySubmitted = Boolean(location.state?.inquirySubmitted);

  return (
    <Container fluid="xl" className="customer-inquiries-page py-3">
      {inquirySubmitted ? (
        <Alert variant="success">
          Your inquiry was submitted successfully. You can track its status
          below.
        </Alert>
      ) : null}
      <PreviousInquiries />
    </Container>
  );
}
