import { createReducer } from "@reduxjs/toolkit"
import { getVideos, addVideo, deleteVideo } from "../actions/videosActions"

const initialState = {
    videos: []
}

const videoReducer = createReducer(initialState, (builder)=>{
    builder.addCase(getVideos, (state, action)=>{

    }).addCase(addVideo, (state, aciton)=>{

    }).addCase(deleteVideo, (state, action)=>{

    })
})

export default videoReducer