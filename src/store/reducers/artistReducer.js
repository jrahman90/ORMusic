import { createReducer } from "@reduxjs/toolkit"
import { getArtists, addArtist, deleteArtist } from "../actions/artistActions"

const initialState = {
    artists: []
}

const artistsReducer = createReducer(initialState, (builder)=>{
    builder.addCase(getArtists, (state, action)=>{

    }).addCase(addArtist, (state, action)=>{

    }).addCase(deleteArtist, (state, action)=>{

    })
})

export default artistsReducer