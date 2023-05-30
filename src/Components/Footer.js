import React, {useState, useContext} from "react";
import "./Css/components.css";
import { Container, Modal, Button, Form  } from "react-bootstrap";
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from "../api/firestore/AuthContext";

export default function Footer() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();
  const {setIsLoggedIn, isLoggedIn} = useContext(AuthContext)

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      // Successful login
      console.log(auth.currentUser)
      setShow(false);
      setIsLoggedIn(true); // Update login state
      navigate('/'); // Redirect to the home page

    } catch (error) {
      console.log(error);
      // Handle login error here
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      // Successful logout
      navigate('/')
      setIsLoggedIn(false); // Update login state
    } catch (error) {
      console.log(error);
      // Handle logout error here
    }
  };


  return (
    <div>
      <Container className="mb-3" align='center'>
        <a href="https://www.facebook.com/ormusicevents" target="_blank"  rel="noreferrer">
        <img alt="" src="facebook.png"/>
        </a>
        <a href="https://www.instagram.com/ormusic.events/" target="_blank" rel="noreferrer">
        <img alt="" src="instagram.png"/>
        </a>
        <a href="https://www.youtube.com/channel/UCdtFAaHPQxzm-jKlPgKPngQ" target="_blank" rel="noreferrer">
        <img alt="" src="youtube.png"/>
        </a>
        <a href="https://www.tiktok.com/@officialopu" target="_blank" rel="noreferrer">
        <img alt="" src="tiktok.png"/>
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
      <h3 align="center" vertical-align="bottom" style={{fontFamily: 'sans serif, arial or verdana'}}>
        © 2023 OR Music
      </h3>
      </Container>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleLogin}>
            <Form.Group controlId="formBasicEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="formBasicPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>

            <Button variant="primary" type="submit">
              Login
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
