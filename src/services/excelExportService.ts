import * as XLSX from 'xlsx';
import { MaintenanceRecord, ProductionQualityRecord } from '../types.ts';
import { MASTER_DATA } from '../constants/masterData.ts';

export const ExcelExportService = {
  /**
   * Exporta la lista de reportes de mantenimiento a un archivo .xlsx de Excel
   */
  exportMaintenanceToExcel: (
    records: MaintenanceRecord[],
    fileName = 'Reporte_Mantenimiento_Formadoras'
  ) => {
    const data = records.map((r, index) => ({
      'No.': index + 1,
      'REPORTE': r.reportNumber || '',
      'FECHA': r.date || '',
      'ESTACIÓN': r.station || MASTER_DATA.getStationForMachine(r.machine || '') || '',
      'MÁQUINA': r.machine ? `Máq. ${r.machine}` : '',
      'HORA DE PARADA': r.failureTime || '',
      'DEFECTO': r.defect || '',
      'HORA LLEGADA MECÁNICO': r.technicianArrivalTime || '',
      'SOLUCIÓN': r.solution || '',
      'HORA FINAL SOLUCIÓN': r.closingTime || '',
      'MECÁNICO': r.solvingTechnician || r.technician || '',
      'EFECTIVA': r.effectiveSolution || '',
      'TIEMPO LLEGADA (MIN)': r.arrivalTimeMin ?? 0,
      'TIEMPO SOLUCIÓN (MIN)': r.repairTimeMin ?? 0,
      'TIEMPO MUERTO TOTAL (MIN)': r.totalDowntimeMin ?? 0,
      'ESTADO': r.status || 'FINALIZADO',
      'TURNO': r.shift || '',
      'OPERARIO': r.operator || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajuste de anchos de columna automáticos
    const columnWidths = [
      { wch: 5 },  // No.
      { wch: 16 }, // REPORTE
      { wch: 12 }, // FECHA
      { wch: 16 }, // ESTACIÓN
      { wch: 12 }, // MÁQUINA
      { wch: 16 }, // HORA DE PARADA
      { wch: 28 }, // DEFECTO
      { wch: 24 }, // HORA LLEGADA MECÁNICO
      { wch: 30 }, // SOLUCIÓN
      { wch: 22 }, // HORA FINAL SOLUCIÓN
      { wch: 20 }, // MECÁNICO
      { wch: 10 }, // EFECTIVA
      { wch: 20 }, // TIEMPO LLEGADA (MIN)
      { wch: 20 }, // TIEMPO SOLUCIÓN (MIN)
      { wch: 24 }, // TIEMPO MUERTO TOTAL (MIN)
      { wch: 14 }, // ESTADO
      { wch: 12 }, // TURNO
      { wch: 22 }  // OPERARIO
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mantenimiento');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
  },

  /**
   * Exporta la lista de registros de producción y calidad a un archivo .xlsx de Excel
   */
  exportProductionToExcel: (
    records: ProductionQualityRecord[],
    fileName = 'Reporte_Produccion_Formadoras'
  ) => {
    const data = records.map((r, index) => ({
      'No.': index + 1,
      'CAJA': r.boxNumber ? `#${r.boxNumber}` : r.reportNumber || '',
      'FECHA': r.date || '',
      'HORA': r.inspectionTime || '',
      'ESTACIÓN': r.station || '',
      'MÁQUINA': r.machine ? `Máq. ${r.machine}` : '',
      'REFERENCIA': r.reference || '',
      'TURNO': r.shift || '',
      'EMPACADOR': r.packer || '',
      'P. GOTEO': r.leakTest || '',
      'CANT. GOTEO (VASOS)': r.leakTestQty ?? 6,
      'INSP. VISUAL': r.visualInspection || '',
      'CANT. VISUAL (VASOS)': r.visualInspectionQty ?? 200,
      'P. RASGADO': r.tearTest || '',
      'CANT. RASGADO (VASOS)': r.tearTestQty ?? 6,
      'PESO VASO INDIVIDUAL (G)': r.weightBottom ?? '',
      'PESO CAJA PLEGADIZA (G)': r.weightLid ?? '',
      'PESO FINAL CAJA (G)': r.weightTotal ?? '',
      'ESTADO': r.status || 'FINALIZADO',
      'APROBADO POR': r.approvedBy || r.approval || 'APROBADO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajuste de anchos de columna automáticos
    const columnWidths = [
      { wch: 5 },  // No.
      { wch: 14 }, // CAJA
      { wch: 12 }, // FECHA
      { wch: 10 }, // HORA
      { wch: 16 }, // ESTACIÓN
      { wch: 12 }, // MÁQUINA
      { wch: 14 }, // REFERENCIA
      { wch: 12 }, // TURNO
      { wch: 22 }, // EMPACADOR
      { wch: 14 }, // P. GOTEO
      { wch: 20 }, // CANT. GOTEO
      { wch: 14 }, // INSP. VISUAL
      { wch: 20 }, // CANT. VISUAL
      { wch: 14 }, // P. RASGADO
      { wch: 20 }, // CANT. RASGADO
      { wch: 24 }, // PESO VASO
      { wch: 24 }, // PESO CAJA PLEGADIZA
      { wch: 22 }, // PESO FINAL CAJA
      { wch: 14 }, // ESTADO
      { wch: 18 }  // APROBADO POR
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Producción');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
  }
};
