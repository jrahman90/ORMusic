import React from 'react'
import { Link } from 'react-router-dom'

export default function PageNotFound() {
  return (
    <div align='center'>
        <img src='/duck.gif' alt='A wandering duck' width='200' height='200'/>
        <h1>Page not found</h1>
        <Link to={'/'}>Return Home</Link>
    </div>
    )
}
