import * as XLSX from 'xlsx';
import { MaintenanceRecord, ProductionTurnRecord, ProductionQualityRecord } from '../types.ts';

const MAINT_RECORDS_KEY = 'unipack_records_v1';
const PROD_TURNS_KEY = 'unipack_prod_records_v1';
const PROD_QUALITY_KEY = 'unipack_prod_quality_v1';

export const RecordService = {
  // --- MANTENIMIENTO ---
  getMaintenanceRecords: (): MaintenanceRecord[] => {
    try {
      const data = localStorage.getItem(MAINT_RECORDS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.filter((r) => r.module === 'MAINTENANCE') : [];
    } catch {
      return [];
    }
  },

  saveMaintenanceRecord: (record: MaintenanceRecord): MaintenanceRecord[] => {
    try {
      const all = RecordService.getMaintenanceRecords();
      const idx = all.findIndex((r) => r.id === record.id);
      if (idx >= 0) {
        all[idx] = record;
      } else {
        all.unshift(record);
      }
      localStorage.setItem(MAINT_RECORDS_KEY, JSON.stringify(all));
      return all;
    } catch {
      return [];
    }
  },

  deleteMaintenanceRecord: (id: string): MaintenanceRecord[] => {
    try {
      let all = RecordService.getMaintenanceRecords();
      all = all.filter((r) => r.id !== id);
      localStorage.setItem(MAINT_RECORDS_KEY, JSON.stringify(all));
      return all;
    } catch {
      return [];
    }
  },

  exportMaintenanceToExcel: (records: MaintenanceRecord[]): void => {
    try {
      // Column order exact to page 3 of PDF:
      // TURNO, FECHA, MAQUINA, HORA INICIO FALLA, HORA LLEGADA TECNICO, DEFECTO, SOLUCION, HORA SOLUCION, TECNICO
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
    try {
      const data = localStorage.getItem(PROD_TURNS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getActiveTurnForUser: (packerName: string): ProductionTurnRecord | undefined => {
    const turns = RecordService.getProductionTurnRecords();
    return turns.find(
      (t) => t.packer.toUpperCase() === packerName.toUpperCase() && t.status !== 'Finalizado'
    );
  },

  saveProductionTurnRecord: (record: ProductionTurnRecord): ProductionTurnRecord[] => {
    try {
      const recs = RecordService.getProductionTurnRecords();
      const existingIdx = recs.findIndex(
        (t) => t.id === record.id || (t.packer.toUpperCase() === record.packer.toUpperCase() && t.status !== 'Finalizado')
      );
      if (existingIdx >= 0) {
        recs[existingIdx] = { ...recs[existingIdx], ...record };
      } else {
        recs.unshift({ ...record, status: record.status || 'Activo' });
      }
      localStorage.setItem(PROD_TURNS_KEY, JSON.stringify(recs));
      return recs;
    } catch {
      return [];
    }
  },

  finalizeActiveTurnForUser: (packerName: string): ProductionTurnRecord[] => {
    try {
      const recs = RecordService.getProductionTurnRecords();
      const updated = recs.map((t) => {
        if (t.packer.toUpperCase() === packerName.toUpperCase() && t.status !== 'Finalizado') {
          return { ...t, status: 'Finalizado' as const };
        }
        return t;
      });
      localStorage.setItem(PROD_TURNS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  // --- REGISTROS DE CALIDAD Y CAJAS DE PRODUCCIÓN ---
  getProductionQualityRecords: (): ProductionQualityRecord[] => {
    try {
      const data = localStorage.getItem(PROD_QUALITY_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveProductionQualityRecord: (record: ProductionQualityRecord): ProductionQualityRecord[] => {
    try {
      const all = RecordService.getProductionQualityRecords();
      const idx = all.findIndex((r) => r.id === record.id);
      if (idx >= 0) {
        all[idx] = record;
      } else {
        all.unshift(record);
      }
      localStorage.setItem(PROD_QUALITY_KEY, JSON.stringify(all));
      return all;
    } catch {
      return [];
    }
  },

  deleteProductionQualityRecord: (id: string): ProductionQualityRecord[] => {
    try {
      let all = RecordService.getProductionQualityRecords();
      all = all.filter((r) => r.id !== id);
      localStorage.setItem(PROD_QUALITY_KEY, JSON.stringify(all));
      return all;
    } catch {
      return [];
    }
  },

  exportProductionQualityToExcel: (records: ProductionQualityRecord[]): void => {
    try {
      // Column order exact to PDF:
      // TURNO, FECHA, NRO CAJA, REFERENCIA, EMPACADOR, TECNICO, AUXILIAR, MAQUINA, PESO FONDO, PESO TAPA, PESO TOTAL, PRUEBA GOTEO, INSPECCION VISUAL, PRUEBA RASGADO, VISTO BUENO, OBSERVACIONES, ESTADO
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

  // Validación de pendientes para finalizar turno
  hasPendingRecords: (): { hasPending: boolean; countMaint: number; countProd: number } => {
    const maint = RecordService.getMaintenanceRecords();
    const prod = RecordService.getProductionQualityRecords();

    const pendingMaint = maint.filter((r) => r.status === 'EN_PROCESO' || r.status === 'PAUSADO').length;
    const pendingProd = prod.filter((r) => r.status === 'EN_PROCESO' || r.status === 'PAUSADO').length;

    return {
      hasPending: pendingMaint > 0 || pendingProd > 0,
      countMaint: pendingMaint,
      countProd: pendingProd
    };
  }
};
