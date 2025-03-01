import React, { useState, useEffect } from "react";
import Card from "react-bootstrap/Card";
import Pictures from "./SubElements/Pictures";
import "./Css/components.css";

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check localStorage if user has already seen the modal
    const hasSeenModal = localStorage.getItem("hasSeenModal");
    if (!hasSeenModal) {
      setShowModal(true);
    }
  }, []);

  const handleCloseModal = () => {
    // Mark as seen and close the modal
    localStorage.setItem("hasSeenModal", "true");
    setShowModal(false);
  };

  return (
    <div>
      {/* Glassmorphic modal for first-time visitors */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <p style={styles.modalText}>
              Welcome to the updated OR Music Events website! Now, you can
              easily create a profile by clicking on the login button in the
              footer and conveniently send inquiries through the cart.
            </p>
            <button style={styles.closeButton} onClick={handleCloseModal}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Card className="bg-dark text-white header mt-3">
        <Card.ImgOverlay className="home-card">
          <Card.Title>
            <img className="mb-3 home-logo" src="ormusiclogo.png" alt="" />
          </Card.Title>
          <Card.Text className="home-text">Your Event Specialists</Card.Text>
        </Card.ImgOverlay>
      </Card>

      <Card className="bg-dark text-white mt-3 celebrate-with-us">
        <Card.ImgOverlay className="celebrate-with-us">
          <Card.Title className="header-text">Celebrate With Us!</Card.Title>
          <Card.Text className="paragraphs">
            OR Music Events produces some of the best events in the tristate
            area. With many years of experience in DJ/MC and Event Management,
            we create unforgettable events – from corporate gatherings to
            weddings and concerts. Whether you need DJ/MC, photography,
            videography, decor, or lighting, we've got you covered. For those
            who want it all, full packages are available. Let us be your next
            event management company!
          </Card.Text>
        </Card.ImgOverlay>
      </Card>

      <Card className="bg-dark mt-3 our-services text-white">
        <Card.ImgOverlay className="our-services">
          <Card.Title className="header-text mb-3">Our Services</Card.Title>
          <Pictures />
        </Card.ImgOverlay>
      </Card>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalContent: {
    /* Glassmorphic styling */
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "8px",
    padding: "2rem",
    maxWidth: "600px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 0 20px rgba(0,0,0,0.2)",
  },
  modalText: {
    marginBottom: "1.5rem",
    color: "#fff",
    fontSize: "18px",
    lineHeight: 1.5,
  },
  closeButton: {
    border: "none",
    borderRadius: "5px",
    padding: "0.5rem 1rem",
    backgroundColor: "#007bff",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
  },
};
