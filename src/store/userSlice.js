import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDoc, doc} from 'firebase/firestore';
import firestore  from "../api/firestore/firestore";

const db = firestore

// Async thunk to fetch user data from Firestore
export const fetchUser = createAsyncThunk('users/fetchUser', async (uid) => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnapshot = await getDoc(userDocRef);
    return userDocSnapshot.data();
  });
  
  const userSlice = createSlice({
    name: 'users',
    initialState: {},
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(fetchUser.fulfilled, (state, action) => {
        return action.payload;
      });
    },
  });


export default userSlice.reducer;
