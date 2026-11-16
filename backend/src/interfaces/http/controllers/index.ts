import type { ControllerDeps } from './BaseController.js';
import { AuthController } from './AuthController.js';
import { PatientController } from './PatientController.js';
import { NotificationController } from './NotificationController.js';
import { AdminController } from './AdminController.js';
import { PublicController } from './PublicController.js';
import { ProfessionalController } from './ProfessionalController.js';
import { MasterController } from './MasterController.js';

export type { ControllerDeps } from './BaseController.js';

/** Um controller por área da API, todos com as mesmas dependências. */
export function createControllers(deps: ControllerDeps) {
  return {
    auth: new AuthController(deps),
    patient: new PatientController(deps),
    notification: new NotificationController(deps),
    admin: new AdminController(deps),
    public: new PublicController(deps),
    professional: new ProfessionalController(deps),
    master: new MasterController(deps),
  };
}

export type Controllers = ReturnType<typeof createControllers>;
