import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Image } from 'react-bootstrap';
import  db  from '../api/firestore/firestore'; 
import { collection,  getDocs } from 'firebase/firestore';


const DjmcAdmin = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Fetch users from Firestore
    const fetchUsers = async () => {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersData = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    };

    fetchUsers();
  }, []);

  return (
    <Container className='
    my-3'>
      <Row>
        {users.map((user, index) => (
            <Row key={user.id} className={index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}>
            <Col sm={12} md={6} className="d-flex align-items-center">
              <Image src={user.imageUrl} roundedCircle fluid />
            </Col>
            <Col sm={12} md={6} className="d-flex align-items-center justify-content-center" style={{textAlign:'center'}}>
              <div>
                <h2 >{user.name}</h2>
                <p>{user.description}</p>
              </div>
            </Col>
          </Row>
        ))}
      </Row>
    </Container>
  );
};

export default DjmcAdmin;
