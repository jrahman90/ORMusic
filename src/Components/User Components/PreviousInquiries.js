import React, { useState, useEffect } from 'react';
import { Table } from 'react-bootstrap';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import db from '../../api/firestore/firestore'

const PreviousInquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const auth = getAuth();

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log('User not logged in');
          return;
        }

        const inquiriesRef = collection(db, 'inquiries');
        const inquiriesQuery = query(inquiriesRef, orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(inquiriesQuery);

        const userInquiries = [];
        snapshot.forEach((doc) => {
          const inquiry = doc.data();
          if (inquiry.userId === user.uid) {
            userInquiries.push(inquiry);
          }
        });

        setInquiries(userInquiries);
      } catch (error) {
        console.error('Error fetching inquiries:', error);
      }
    };

    fetchInquiries();
  }, [auth]);

  return (
    <div>
      <h2>Previous Inquiries</h2>
      {inquiries.length === 0 ? (
        <p>No previous inquiries found</p>
      ) : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inquiry, index) => (
              <tr key={index}>
                <td>{inquiry.items.map((item) => item.name).join(', ')}</td>
                <td>{inquiry.items.map((item) => item.quantity).join(', ')}</td>
                <td>{inquiry.timestamp.toDate().toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default PreviousInquiries;
