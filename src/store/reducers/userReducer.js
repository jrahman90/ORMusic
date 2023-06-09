import { createReducer } from "@reduxjs/toolkit"
import { getUser, addUser, deleteUser } from "../actions/userActions"
import { getAuth } from "firebase/auth"

const auth = getAuth()

const initialState = {
    users: []
}

const userReducer = createReducer(initialState, (builder)=>{
    builder.addCase(getUser, (state, action)=>{
        
    })
})

export default userReducer