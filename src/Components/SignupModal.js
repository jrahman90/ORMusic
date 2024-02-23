import React, { useState } from "react";
import { Modal, Button, Form, Alert, Col } from "react-bootstrap";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const SignupModal = ({ show, onHide }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNotMatch, setPasswordNotMatch] = useState(false);
  const [provideNumber, setProvideNumber] = useState(false);
  const [emailInUse, setEmailInUse] = useState(false);

  const handlePhoneChange = (value) => {
    setPhoneNumber(value);
  };
  const handleSignup = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const db = getFirestore();

    try {
      if (password !== confirmPassword) {
        setPasswordNotMatch(true);
        // Handle password mismatch error (e.g., display error message)
        // ...
        return;
      }
      if (phoneNumber.length < 10) {
        setProvideNumber(true);
      }

      // Create user with email and password
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user document in Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        name,
        email,
        phoneNumber: phoneNumber || "",
        isAdmin: false,
      }).then(signInWithEmailAndPassword(auth, email, password));

      // Clear form fields
      setName("");
      setEmail("");
      setPhoneNumber("");
      setPassword("");
      setConfirmPassword("");
      setPasswordNotMatch(false);

      // Perform additional actions after successful signup
      // (e.g., redirect to another page, display success message)
      // ...

      // Close the modal
      onHide();
    } catch (error) {
      console.error("Error signing up:", error);
      if (
        error == "FirebaseError: Firebase: Error (auth/email-already-in-use)."
      )
        setEmailInUse(true);

      setTimeout(() => setEmailInUse(false), 3000);
      // Handle signup error (e.g., display error message)
      // ...
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Sign Up</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSignup}>
          <Form.Group controlId="name">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="email">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" as={Col} controlId="formPhone">
            <Form.Label>Phone Number</Form.Label>
            <PhoneInput
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={handlePhoneChange}
              defaultCountry="US" // Set the default country
            />
          </Form.Group>
          <Form.Group controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group controlId="confirmPassword">
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>
          {passwordNotMatch ? (
            <Alert variant="danger">Passwords Dont Match!</Alert>
          ) : (
            ""
          )}
          {provideNumber ? (
            <Alert variant="danger">Check Phone Number</Alert>
          ) : (
            ""
          )}
          {emailInUse ? (
            <Alert variant="danger">Email Already Exists</Alert>
          ) : (
            ""
          )}
          <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>
              Close
            </Button>
            <Button variant="primary" type="submit">
              Sign Up
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default SignupModal;
