import { createAction } from "@reduxjs/toolkit";

export const addArtist = createAction('addArtist')
export const getArtists = createAction('getArtists')
export const deleteArtist = createAction('deleteArtist')