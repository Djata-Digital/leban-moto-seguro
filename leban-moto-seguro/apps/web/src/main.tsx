import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
} from 'react-router-dom';

import {
  registerSW,
} from 'virtual:pwa-register';

import 'leaflet/dist/leaflet.css';
import './index.css';

import App from './App';

registerSW({
  immediate: true,

  onNeedRefresh() {
    console.log(
      'Nova versão do aplicativo disponível.',
    );
  },

  onOfflineReady() {
    console.log(
      'LEBAN Moto Seguro pronto para uso offline.',
    );
  },

  onRegisterError(error) {
    console.error(
      'Erro ao registrar o aplicativo offline:',
      error,
    );
  },
});

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);