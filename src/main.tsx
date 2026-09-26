import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { bootstrapBackend, isDemoMode } from './lib/supabase';
import './index.css';

const container = document.getElementById('root')!;

function render() {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Demo mode paints immediately (no SDK to fetch). With real credentials the
// Supabase client is loaded as its own chunk first, so the first render always
// has a working backend.
if (isDemoMode) {
  render();
} else {
  void bootstrapBackend().then(render);
}
