// The entry point: the first of our files the browser runs.
// It finds <div id="root"> in index.html and tells React to draw <App /> there.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  // StrictMode adds extra checks while developing (it does nothing in the
  // final build). It helps catch bugs early, e.g. effects without cleanup.
  <StrictMode>
    <App />
  </StrictMode>,
)
