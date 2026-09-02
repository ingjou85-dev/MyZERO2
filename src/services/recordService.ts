import * as XLSX from 'xlsx';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { MaintenanceRecord, ProductionTurnRecord, ProductionQualityRecord } from '../types.ts';

const MAINT_COLLECTION = 'maintenance_records';
const TURNS_COLLECTION = 'production_turns';
const QUALITY_COLLECTION = 'production_quality_records';

// In-memory caches updated by real-time listeners for fast synchronous utility lookups
let cachedMaintenanceRecords: MaintenanceRecord[] = [];
let cachedProductionTurnRecords: ProductionTurnRecord[] = [];
let cachedProductionQualityRecords: ProductionQualityRecord[] = [];

export const RecordService = {
  // --- REAL-TIME LISTENERS ---
  subscribeMaintenanceRecords: (callback: (records: MaintenanceRecord[]) => void): Unsubscribe => {
    const colRef = collection(db, MAINT_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const records: MaintenanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push({ id: docSnap.id, ...docSnap.data() } as MaintenanceRecord);
        });
        // Sort descending by date / ID
        records.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));
        cachedMaintenanceRecords = records;
        callback(records);
      },
      (error) => {
        console.error('Error listening to maintenance_records in Firestore:', error);
      }
    );
  },

  subscribeProductionTurnRecords: (callback: (records: ProductionTurnRecord[]) => void): Unsubscribe => {
    const colRef = collection(db, TURNS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const records: ProductionTurnRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push({ id: docSnap.id, ...docSnap.data() } as ProductionTurnRecord);
        });
        records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id.localeCompare(a.id));
        cachedProductionTurnRecords = records;
        callback(records);
      },
      (error) => {
        console.error('Error listening to production_turns in Firestore:', error);
      }
    );
  },

  subscribeProductionQualityRecords: (callback: (records: ProductionQualityRecord[]) => void): Unsubscribe => {
    const colRef = collection(db, QUALITY_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const records: ProductionQualityRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push({ id: docSnap.id, ...docSnap.data() } as ProductionQualityRecord);
        });
        records.sort((a, b) => (b.boxNumber || 0) - (a.boxNumber || 0));
        cachedProductionQualityRecords = records;
        callback(records);
      },
      (error) => {
        console.error('Error listening to production_quality_records in Firestore:', error);
      }
    );
  },

  // --- MANTENIMIENTO ---
  getMaintenanceRecords: (): MaintenanceRecord[] => {
    return cachedMaintenanceRecords;
  },

  saveMaintenanceRecord: async (record: MaintenanceRecord): Promise<void> => {
    try {
      const docRef = doc(db, MAINT_COLLECTION, record.id);
      // Clean undefined values for Firestore
      const cleanData = JSON.parse(JSON.stringify(record));
      await setDoc(docRef, cleanData, { merge: true });
    } catch (error) {
      console.error('Error saving maintenance record in Firestore:', error);
      throw error;
    }
  },

  deleteMaintenanceRecord: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, MAINT_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting maintenance record in Firestore:', error);
      throw error;
    }
  },

  exportMaintenanceToExcel: (records: MaintenanceRecord[]): void => {
    try {
      const data = records.map((r) => {
        const defectsStr =
          r.defects && r.defects.length > 0 ? r.defects.join(', ') : r.defect || '-';
        const solutionsStr =
          r.solutions && r.solutions.length > 0 ? r.solutions.join(', ') : r.solution || '-';

        return {
          TURNO: r.shift || '-',
          FECHA: r.date,
          MAQUINA: r.machine || '-',
          'HORA INICIO FALLA': r.failureTime || '-',
          'HORA LLEGADA TECNICO': r.technicianArrivalTime || '-',
          DEFECTO: defectsStr,
          SOLUCION: solutionsStr,
          'HORA SOLUCION': r.closingTime || '-',
          TECNICO: r.solvingTechnician || r.technician || '-',
          OPERARIO: r.operator || '-',
          'T. RESPUESTA (min)': r.arrivalTimeMin || 0,
          'T. REPARACIÓN (min)': r.repairTimeMin || 0,
          'PARADA TOTAL (min)': r.totalDowntimeMin || 0,
          ESTADO: r.status
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mantenimiento');
      XLSX.writeFile(wb, 'UNIPACK_Reporte_Mantenimiento.xlsx');
    } catch {
      alert('No se pudo generar el archivo Excel de mantenimiento.');
    }
  },

  // --- TURNOS DE PRODUCCIÓN ---
  getProductionTurnRecords: (): ProductionTurnRecord[] => {
    return cachedProductionTurnRecords;
  },

  getActiveTurnForUser: (packerName: string): ProductionTurnRecord | undefined => {
    return cachedProductionTurnRecords.find(
      (t) => t.packer.toUpperCase() === packerName.toUpperCase() && t.status !== 'Finalizado'
    );
  },

  saveProductionTurnRecord: async (record: ProductionTurnRecord): Promise<void> => {
    try {
      const docRef = doc(db, TURNS_COLLECTION, record.id);
      const cleanData = JSON.parse(JSON.stringify(record));
      await setDoc(docRef, cleanData, { merge: true });
    } catch (error) {
      console.error('Error saving production turn in Firestore:', error);
      throw error;
    }
  },

  finalizeActiveTurnForUser: async (packerName: string): Promise<void> => {
    try {
      const activeTurns = cachedProductionTurnRecords.filter(
        (t) => t.packer.toUpperCase() === packerName.toUpperCase() && t.status !== 'Finalizado'
      );
      for (const turn of activeTurns) {
        const docRef = doc(db, TURNS_COLLECTION, turn.id);
        await setDoc(docRef, { status: 'Finalizado' }, { merge: true });
      }
    } catch (error) {
      console.error('Error finalizing turn in Firestore:', error);
      throw error;
    }
  },

  // --- REGISTROS DE CALIDAD Y CAJAS DE PRODUCCIÓN ---
  getProductionQualityRecords: (): ProductionQualityRecord[] => {
    return cachedProductionQualityRecords;
  },

  saveProductionQualityRecord: async (record: ProductionQualityRecord): Promise<void> => {
    try {
      const docRef = doc(db, QUALITY_COLLECTION, record.id);
      const cleanData = JSON.parse(JSON.stringify(record));
      await setDoc(docRef, cleanData, { merge: true });
    } catch (error) {
      console.error('Error saving production quality record in Firestore:', error);
      throw error;
    }
  },

  deleteProductionQualityRecord: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, QUALITY_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting production quality record in Firestore:', error);
      throw error;
    }
  },

  exportProductionQualityToExcel: (records: ProductionQualityRecord[]): void => {
    try {
      const data = records.map((r) => ({
        TURNO: r.shift || '-',
        FECHA: r.date,
        'N° CAJA': r.boxNumber,
        REFERENCIA: r.reference,
        EMPACADOR: r.packer,
        TECNICO: r.tech || '-',
        AUXILIAR: r.aux || '-',
        MAQUINA: r.machine,
        'PESO FONDO (g)': r.weightBottom !== undefined ? r.weightBottom : '-',
        'PESO TAPA (g)': r.weightLid !== undefined ? r.weightLid : '-',
        'PESO TOTAL (g)': r.weightTotal !== undefined ? r.weightTotal : '-',
        'PRUEBA GOTEO': r.leakTest || 'CUMPLE',
        'INSPECCIÓN VISUAL': r.visualInspection || 'CUMPLE',
        'PRUEBA RASGADO': r.tearTest || 'CUMPLE',
        'VISTO BUENO': r.approval || 'APROBADO',
        OBSERVACIONES: r.observations || '-',
        ESTADO: r.status
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produccion_Calidad');
      XLSX.writeFile(wb, 'UNIPACK_Reporte_Produccion_Calidad.xlsx');
    } catch {
      alert('No se pudo generar el archivo Excel de producción.');
    }
  },

  // Validación de pendientes para finalizar turno (evalúa únicamente los registros del usuario actual)
  hasPendingRecords: (
    maintList?: MaintenanceRecord[],
    prodList?: ProductionQualityRecord[],
    userFullName?: string,
    username?: string
  ): { hasPending: boolean; countMaint: number; countProd: number } => {
    const maint = maintList || cachedMaintenanceRecords;
    const prod = prodList || cachedProductionQualityRecords;

    const uName = userFullName?.trim().toUpperCase();
    const uUser = username?.trim().toUpperCase();

    const pendingMaint = maint.filter((r) => {
      const isPending = r.status === 'EN_PROCESO' || r.status === 'PAUSADO';
      if (!isPending) return false;
      if (uName || uUser) {
        const op = r.operator?.trim().toUpperCase();
        return (
          (!!uName && op === uName) ||
          (!!uUser && op === uUser) ||
          (uUser === 'DDUVAN' && (op === 'DUVÁN' || op === 'DUVAN'))
        );
      }
      return true;
    }).length;

    const pendingProd = prod.filter((r) => {
      const isPending = r.status === 'EN_PROCESO' || r.status === 'PAUSADO';
      if (!isPending) return false;
      if (uName || uUser) {
        const pk = r.packer?.trim().toUpperCase();
        return (
          (!!uName && pk === uName) ||
          (!!uUser && pk === uUser) ||
          (uUser === 'DDUVAN' && (pk === 'DUVÁN' || pk === 'DUVAN'))
        );
      }
      return true;
    }).length;

    return {
      hasPending: pendingMaint > 0 || pendingProd > 0,
      countMaint: pendingMaint,
      countProd: pendingProd
    };
  }
};
