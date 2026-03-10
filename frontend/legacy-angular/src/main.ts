import 'zone.js';

// Compatibilidade com libs que esperam "global" no browser (ex.: STOMP/SockJS)
(window as unknown as { global?: Window }).global = window;

import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localePt);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
