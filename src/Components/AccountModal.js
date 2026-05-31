import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { auth, firestore } from "../api/firestore/firestore";

const errorMessage = (error) => {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "An account already exists for this email.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    default:
      return error?.message || "Something went wrong. Please try again.";
  }
};

export default function AccountModal({ show, onHide, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  useEffect(() => {
    if (!show) return;
    setMode(initialMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }, [show, initialMode]);

  const resetAndClose = () => {
    setName("");
    setEmail("");
    setPhoneNumber("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setBusy(false);
    onHide?.();
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    try {
      setBusy(true);
      setError("");

      if (isSignup) {
        if (cleanName.length < 2) {
          setError("Enter your full name.");
          return;
        }
        if (!phoneNumber || phoneNumber.length < 10) {
          setError("Enter a valid phone number.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        const { user } = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

        await setDoc(doc(firestore, "users", user.uid), {
          name: cleanName,
          email: cleanEmail,
          phoneNumber: phoneNumber || "",
          isAdmin: false,
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }

      resetAndClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={resetAndClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{isSignup ? "Create your account" : "Welcome back"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3">
          {isSignup
            ? "Create a profile to send inquiries and track contracts."
            : "Log in to submit your cart and review your inquiries."}
        </p>

        <Form onSubmit={handleSubmit}>
          {isSignup ? (
            <Form.Group className="mb-3" controlId="accountName">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </Form.Group>
          ) : null}

          <Form.Group className="mb-3" controlId="accountEmail">
            <Form.Label>Email address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Form.Group>

          {isSignup ? (
            <Form.Group className="mb-3" controlId="accountPhone">
              <Form.Label>Phone number</Form.Label>
              <PhoneInput
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={setPhoneNumber}
                defaultCountry="US"
              />
            </Form.Group>
          ) : null}

          <Form.Group className="mb-3" controlId="accountPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
          </Form.Group>

          {isSignup ? (
            <Form.Group className="mb-3" controlId="accountConfirmPassword">
              <Form.Label>Confirm password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Form.Group>
          ) : null}

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <div className="d-flex flex-wrap align-items-center gap-2">
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  {isSignup ? "Creating..." : "Logging in..."}
                </>
              ) : isSignup ? (
                "Create account"
              ) : (
                "Login"
              )}
            </Button>
            <Button
              variant="link"
              type="button"
              className="px-0"
              onClick={() => switchMode(isSignup ? "login" : "signup")}
              disabled={busy}
            >
              {isSignup
                ? "Already have an account? Login"
                : "Need an account? Create one"}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
