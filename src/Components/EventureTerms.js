import React, { useState } from "react";
import { firestore } from "../api/firestore/firestore";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const EventureTermsAndConditions = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "bug", // Default selection
    details: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(firestore, "EventureContact"), {
        name: formData.name,
        email: formData.email,
        type: formData.type,
        details: formData.details,
        status: false,
        createdAt: Timestamp.now(),
      });
      alert("Thank you for your feedback!");
      setFormData({ name: "", email: "", type: "bug", details: "" });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error submitting form: ", error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Terms and Conditions</h1>
        <p style={styles.date}>Effective Date: 1/1/2025</p>
        <button
          style={styles.contactButton}
          onClick={() => setIsModalOpen(true)}
        >
          Contact Us
        </button>
        {sections.map((section, index) => (
          <div key={index} style={styles.section}>
            <h2 style={styles.sectionTitle}>{section.title}</h2>
            {section.content.map((paragraph, idx) => (
              <p key={idx} style={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Contact Us</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Email (optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  style={styles.formSelect}
                >
                  <option value="bug">Report a Bug</option>
                  <option value="change">Recommend a Change</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tell us about it</label>
                <textarea
                  name="details"
                  value={formData.details}
                  onChange={handleChange}
                  required
                  style={styles.formTextarea}
                />
              </div>

              <div style={styles.buttonContainer}>
                <button type="submit" style={styles.submitButton}>
                  Submit
                </button>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const sections = [
  {
    title: "Introduction",
    content: [
      'Welcome to Eventure! These Terms and Conditions ("Terms") govern your access to and use of the Eventure platform ("Platform"), including our website and mobile application. By creating an account or using our services, you agree to comply with these Terms. If you do not agree, please refrain from using Eventure.',
    ],
  },
  {
    title: "Description of Services",
    content: [
      "Eventure is a platform that connects users with vendors and businesses for event-related services. Users can create accounts, search for vendors, message vendors in-app, view vendor contact details, and leave reviews. Eventure does not facilitate or manage bookings and is not a party to any agreements between users and vendors.",
    ],
  },
  {
    title: "User Accounts",
    content: [
      "Users must be at least 18 years old to create an account.",
      "Users are responsible for maintaining the confidentiality of their login credentials.",
      "Eventure reserves the right to suspend or terminate accounts for violations of these Terms.",
    ],
  },
  {
    title: "Vendor Listings and Contact Information",
    content: [
      "Vendors are responsible for the accuracy and completeness of their profiles and listings.",
      "Eventure does not verify the authenticity of vendor information and is not responsible for any misrepresentations.",
      "Users and vendors must use provided contact information solely for the purpose of engaging in event-related transactions.",
    ],
  },
  {
    title: "Messaging and Reviews",
    content: [
      "Users can communicate with vendors through in-app messaging.",
      "Users may leave reviews based on their experiences with vendors.",
      "Eventure reserves the right to remove reviews that are false, misleading, defamatory, or violate these Terms.",
    ],
  },
  {
    title: "Eventure’s Liability",
    content: [
      "Eventure is a neutral platform that facilitates connections but does not guarantee the quality, reliability, or availability of any vendor services.",
      "Eventure is not liable for any disputes, damages, losses, or fraudulent activities arising from interactions between users and vendors.",
      "Any agreements, payments, or transactions are solely between users and vendors.",
    ],
  },
  {
    title: "Prohibited Activities",
    content: [
      "Users and vendors are prohibited from:",
      "Providing false or misleading information.",
      "Engaging in fraud, harassment, or illegal activities.",
      "Using Eventure to distribute spam or unsolicited messages.",
      "Violating any applicable laws or regulations.",
      "We enforce a zero tolerance policy for objectionable content and abusive behavior. Any violation may result in immediate suspension or termination of your account.",
    ],
  },
  {
    title: "Privacy Policy",
    content: [
      "By using Eventure, you acknowledge and agree to our Privacy Policy, which governs the collection, use, and protection of your personal information.",
    ],
  },
  {
    title: "Modifications to Terms",
    content: [
      "Eventure reserves the right to modify these Terms at any time. Users will be notified of significant changes, and continued use of the Platform constitutes acceptance of the revised Terms.",
    ],
  },
  {
    title: "Termination",
    content: [
      "Eventure may suspend or terminate access to the Platform at its discretion, including for violations of these Terms.",
    ],
  },
  {
    title: "Governing Law",
    content: [
      "These Terms are governed by the laws of the United States and the State of New York. Any disputes shall be resolved through binding arbitration or the courts in New York City, NY.",
    ],
  },
  {
    title: "Contact Information",
    content: [
      "For questions regarding these Terms, contact us at eventure.app.info@gmail.com.",
      "By using Eventure, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.",
    ],
  },
];

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "#f9f9f9",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "10px",
    maxWidth: "800px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  date: {
    fontSize: "14px",
    color: "gray",
    marginBottom: "20px",
  },
  contactButton: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginBottom: "20px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    width: "400px",
    display: "flex",
    flexDirection: "column",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "10px",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  formGroup: {
    marginBottom: "15px",
    display: "flex",
    flexDirection: "column",
  },
  formLabel: {
    marginBottom: "5px",
    fontWeight: "bold",
    fontSize: "14px",
  },
  formInput: {
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  formSelect: {
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
  },
  formTextarea: {
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
    minHeight: "80px",
    resize: "vertical",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "space-between",
  },
  submitButton: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  section: { marginBottom: "20px" },
  sectionTitle: { fontSize: "18px", fontWeight: "bold", marginBottom: "5px" },
  paragraph: { fontSize: "14px", lineHeight: "1.6", color: "#333" },
};

export default EventureTermsAndConditions;
