import React, { useEffect, useState } from "react";
import { firestore } from "../../api/firestore/firestore";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";

export default function EventureAdmin() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const qRef = query(
          collection(firestore, "EventureContact"),
          orderBy("createdAt", "asc")
        );
        const snapshot = await getDocs(qRef);
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setContacts(data);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    fetchContacts();
  }, []);

  const resolveContact = async (contactId) => {
    try {
      const docRef = doc(firestore, "EventureContact", contactId);
      await updateDoc(docRef, {
        status: true,
        resolvedAt: Timestamp.now(),
      });
      // Update local state to reflect the change
      setContacts((prev) =>
        prev.map((item) =>
          item.id === contactId
            ? { ...item, status: true, resolvedAt: Timestamp.now() }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  // Format date to a readable string
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  // Filter data
  const bugItems = contacts.filter(
    (c) => c.type === "bug" && c.status === false
  );
  const changeItems = contacts.filter(
    (c) => c.type === "change" && c.status === false
  );
  const resolvedItems = contacts.filter((c) => c.status === true);

  // Helper to check if older than 30 days
  const olderThan30Days = (timestamp) => {
    if (!timestamp) return false;
    const now = new Date();
    const created = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffTime = now - created;
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays > 30;
  };

  // Sort resolved items by newest first
  const sortedResolved = [...resolvedItems].sort((a, b) => {
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div style={styles.container}>
      <div style={styles.column}>
        <h2 style={styles.columnTitle}>Bugs (Oldest First)</h2>
        <div style={styles.columnContent}>
          {bugItems.map((item) => {
            const isOld = olderThan30Days(item.createdAt);
            return (
              <div
                key={item.id}
                style={{
                  ...styles.card,
                  backgroundColor: isOld ? "#f8d7da" : "#fff",
                }}
              >
                <p style={styles.cardTitle}>{item.name}</p>
                {item.email && (
                  <p style={styles.cardText}>Email: {item.email}</p>
                )}
                <p style={styles.cardText}>Type: {item.type}</p>
                <p style={styles.cardText}>{item.details}</p>
                <p style={styles.cardText}>
                  Date Submitted: {formatDate(item.createdAt)}
                </p>
                <button
                  style={styles.resolveButton}
                  onClick={() => resolveContact(item.id)}
                >
                  Mark Resolved
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.column}>
        <h2 style={styles.columnTitle}>Changes (Oldest First)</h2>
        <div style={styles.columnContent}>
          {changeItems.map((item) => {
            const isOld = olderThan30Days(item.createdAt);
            return (
              <div
                key={item.id}
                style={{
                  ...styles.card,
                  backgroundColor: isOld ? "#f8d7da" : "#fff",
                }}
              >
                <p style={styles.cardTitle}>{item.name}</p>
                {item.email && (
                  <p style={styles.cardText}>Email: {item.email}</p>
                )}
                <p style={styles.cardText}>Type: {item.type}</p>
                <p style={styles.cardText}>{item.details}</p>
                <p style={styles.cardText}>
                  Date Submitted: {formatDate(item.createdAt)}
                </p>
                <button
                  style={styles.resolveButton}
                  onClick={() => resolveContact(item.id)}
                >
                  Mark Resolved
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.column}>
        <h2 style={styles.columnTitle}>Resolved (Newest First)</h2>
        <div style={styles.columnContent}>
          {sortedResolved.map((item) => {
            return (
              <div key={item.id} style={styles.cardResolved}>
                <p style={styles.cardTitle}>{item.name}</p>
                {item.email && (
                  <p style={styles.cardText}>Email: {item.email}</p>
                )}
                <p style={styles.cardText}>Type: {item.type}</p>
                <p style={styles.cardText}>{item.details}</p>
                <p style={styles.cardText}>
                  Date Submitted: {formatDate(item.createdAt)}
                </p>
                {item.resolvedAt && (
                  <p style={styles.cardText}>
                    Date Resolved: {formatDate(item.resolvedAt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexWrap: "wrap", // Allows columns to wrap on smaller screens
    gap: "1rem",
    padding: "1rem",
  },
  column: {
    flex: "1 1 300px", // Grows, shrinks, sets a minimum width
    display: "flex",
    flexDirection: "column",
    border: "1px solid #ccc",
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "1rem",
  },
  columnTitle: {
    backgroundColor: "#f1f1f1",
    padding: "0.5rem",
    textAlign: "center",
    fontWeight: "bold",
  },
  columnContent: {
    overflowY: "auto",
    maxHeight: "70vh",
    padding: "0.5rem",
  },
  card: {
    border: "1px solid #dee2e6",
    borderRadius: "5px",
    padding: "0.75rem",
    marginBottom: "0.75rem",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
  },
  cardResolved: {
    border: "1px solid #dee2e6",
    borderRadius: "5px",
    padding: "0.75rem",
    marginBottom: "0.75rem",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
    backgroundColor: "#d4edda",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "0.25rem",
  },
  cardText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: "1.4",
    marginBottom: "0.25rem",
  },
  resolveButton: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
};
