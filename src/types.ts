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
  reportSeqNumber?: number;
  module: 'MAINTENANCE';
  date: string;
  station?: string;
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
  effectiveSolution?: 'Sí' | 'No';
  repairTimeMin?: number;
  totalDowntimeMin?: number;
  currentStep?: number;
  status: RecordStatus;
}

export interface ProductionTurnRecord {
  id: string;
  date: string;
  station?: string;
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
  station?: string;
  shift: string;
  machine: string;
  reference: string;
  packer: string;
  tech?: string;
  aux?: string;
  weightBottom?: number; // PESO VASO INDIVIDUAL
  weightLid?: number; // PESO CAJA PLEGADIZA
  weightTotal?: number; // PESO FINAL CAJA
  leakTest?: 'CUMPLE' | 'NO_CUMPLE';
  leakTestQty?: number;
  visualInspection?: 'CUMPLE' | 'NO_CUMPLE';
  visualInspectionQty?: number;
  tearTest?: 'CUMPLE' | 'NO_CUMPLE';
  tearTestQty?: number;
  testDetails?: string;
  approval?: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
  approvedBy?: 'PHINEAS' | 'ALEXANDRA' | string;
  inspectionTime?: string;
  observations?: string;
  currentStep?: number;
  status: RecordStatus;
}

export type AppView = 'HOME' | 'MAINTENANCE' | 'PRODUCTION' | 'ADMIN_CREATE' | 'ADMIN_LIST';
export type MaintTab = 'INGRESAR' | 'LIVE' | 'DASHBOARD' | 'RESUMEN';
export type ProdTab = 'INGRESAR' | 'LIVE' | 'DASHBOARD' | 'RESUMEN';

