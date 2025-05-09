import { clientController } from './controller/client';
import { loadController } from './controller/load';

window.codingArs = window.codingArs || {};
window.codingArs.prepare = clientController;
window.codingArs.load = loadController;