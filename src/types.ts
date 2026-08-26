export type UserRole = 'Administrador' | 'Corriente';
export type UserStatus = 'Activo' | 'Inactivo';

export interface UserAccount {
  fullName: string;
  user: string;
  pass: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface UserSession {
  fullName: string;
  user: string;
  role: UserRole;
  token: string;
}

export type RecordModule = 'MAINTENANCE' | 'PRODUCTION';
export type RecordStatus = 'EN_PROCESO' | 'PAUSADO' | 'FINALIZADO';

export interface MaintenanceRecord {
  id: string;
  reportNumber: string;
  module: 'MAINTENANCE';
  date: string;
  shift?: string;
  operator?: string;
  technician?: string;
  machine?: string;
  reference?: string;
  failureTime?: string;
  technicianArrivalTime?: string;
  arrivalTimeMin?: number;
  defects?: string[];
  defect?: string;
  solutions?: string[];
  solution?: string;
  closingTime?: string;
  solvingTechnician?: string;
  repairTimeMin?: number;
  totalDowntimeMin?: number;
  status: RecordStatus;
}

export interface ProductionTurnRecord {
  id: string;
  date: string;
  shift: string;
  packer: string;
  tech: string;
  aux: string;
  reference: string;
  createdAt: string;
  status?: 'Activo' | 'Finalizado';
}

export interface ProductionQualityRecord {
  id: string;
  reportNumber?: string;
  boxNumber: number;
  date: string;
  shift: string;
  machine: string;
  reference: string;
  packer: string;
  tech?: string;
  aux?: string;
  weightBottom?: number;
  weightLid?: number;
  weightTotal?: number;
  leakTest?: 'CUMPLE' | 'NO_CUMPLE';
  visualInspection?: 'CUMPLE' | 'NO_CUMPLE';
  tearTest?: 'CUMPLE' | 'NO_CUMPLE';
  approval?: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
  observations?: string;
  status: RecordStatus;
}

export type AppView = 'HOME' | 'MAINTENANCE' | 'PRODUCTION' | 'ADMIN_CREATE' | 'ADMIN_LIST';
export type MaintTab = 'INGRESAR' | 'LIVE' | 'DASHBOARD';
export type ProdTab = 'INGRESAR' | 'LIVE' | 'DASHBOARD';
