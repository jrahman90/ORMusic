import React, { useState, useContext, useEffect } from "react";
import "./Css/components.css";
import { Container, Modal, Button, Form, Alert } from "react-bootstrap";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { AuthContext } from "../api/firestore/AuthContext";
import SignupModal from "./SignupModal";

export default function Footer() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAlert, setPasswordAlert] = useState("");
  const [showError, setShowError] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  const { setIsLoggedIn, isLoggedIn } = useContext(AuthContext);

  // copyright years
  const startYear = 2008;
  const currentYear = new Date().getFullYear();
  const copyrightYears =
    currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;

  const handleClose = () => {
    setShow(false);
    setShowError(false);
  };
  const handleShow = () => setShow(true);

  // Listen to real Firebase auth state
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      const loggedIn = !!user;
      setIsLoggedIn(loggedIn);
      if (loggedIn && user?.email && !email) {
        setEmail(user.email);
      }
    });
    return () => unsub();
  }, [setIsLoggedIn, email]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoggedIn(true);
      setShow(false);
      setShowError(false);
      setPassword("");
    } catch (error) {
      setPasswordAlert(error.message);
      setShowError(true);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      setIsLoggedIn(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleShowSignupModal = () => {
    setShowSignupModal(true);
    setShow(false);
  };

  const handleHideSignupModal = () => {
    setShowSignupModal(false);
  };

  return (
    <div>
      <Container className="mb-3" align="center">
        <a
          href="https://www.facebook.com/ormusicevents"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="" src="facebook.png" />
        </a>
        <a
          href="https://www.instagram.com/ormusic.events/"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="" src="instagram.png" />
        </a>
        <a
          href="https://www.youtube.com/channel/UCdtFAaHPQxzm-jKlPgKPngQ"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="" src="youtube.png" />
        </a>
        <a
          href="https://www.tiktok.com/@officialopu"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="" src="tiktok.png" />
        </a>
        {isLoggedIn ? (
          <Button variant="danger" onClick={handleLogout}>
            Logout
          </Button>
        ) : (
          <Button variant="primary" onClick={handleShow}>
            Login
          </Button>
        )}
        <h3
          align="center"
          style={{ fontFamily: "sans serif, arial or verdana" }}
        >
          © {copyrightYears} OR Music Events
        </h3>
      </Container>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form className="pe-3" onSubmit={handleLogin}>
            <Form.Group controlId="formBasicEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Form.Group>

            <Form.Group className="mt-3" controlId="formBasicPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Form.Group>

            {showError ? (
              <Alert className="mt-3" variant={"danger"}>
                {passwordAlert}
              </Alert>
            ) : (
              ""
            )}

            <Button className="my-3" variant="primary" type="submit">
              Login
            </Button>
            <Button
              className="m-3"
              variant="outline-primary"
              onClick={handleShowSignupModal}
            >
              Signup
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <SignupModal show={showSignupModal} onHide={handleHideSignupModal} />
    </div>
  );
}
