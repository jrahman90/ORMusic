import { useEffect, useState } from "react";
import { firestore, auth } from "./firestore/firestore";
import { doc, getDoc } from "firebase/firestore";

export const UserDataComponent = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (auth.currentUser) {
          const uid = auth.currentUser.uid;
          const userDocRef = doc(firestore, "users", uid);
          const docSnapshot = await getDoc(userDocRef);

          if (docSnapshot.exists()) {
            setUserData(docSnapshot.data());
          } else {
            console.log("User document does not exist");
          }
        } else {
          console.log("No user is currently logged in");
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
      }
    };

    fetchUserData();
  }, []);

  return userData;
};
