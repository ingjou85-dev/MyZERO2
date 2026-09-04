import * as XLSX from 'xlsx';
import {
  MaintenanceRecord,
  ProductionQualityRecord,
  ProductionTurnRecord,
  ProductionTraceabilityRecord,
  ProductionWasteRecord
} from '../types.ts';
import { MASTER_DATA } from '../constants/masterData.ts';
import { formatFirstNameUpper } from '../utils/formatters.ts';

export interface ProductionExportParams {
  boxes: ProductionQualityRecord[];
  turns?: ProductionTurnRecord[];
  traceability?: ProductionTraceabilityRecord[];
  waste?: ProductionWasteRecord[];
  filterDate?: string;
  filterStation?: string;
  fileName?: string;
}

interface ConsolidatedGroup {
  date: string;
  station: string;
  shift: string;
  operator: string;
  reference: string;
  tech: string;
  aux: string;
  traceabilityCount: number;
  rollCodes: Set<string>;
  boxesCount: number;
  sumFinalBoxWeight: number;
  wasteCuadre: number;
  wasteEncerado: number;
  wasteMerma: number;
  wasteRollo: number;
  wasteBorde: number;
  wastePunta: number;
}

const normalizeName = (name?: string): string => {
  if (!name) return '';
  const first = formatFirstNameUpper(name);
  return first.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
};

const normalizeStation = (st?: string, machine?: string): string => {
  if (st && st.trim()) return st.trim();
  if (machine) {
    const fromM = MASTER_DATA.getStationForMachine(machine);
    if (fromM) return fromM;
  }
  return '';
};

export const ExcelExportService = {
  /**
   * Exporta la lista de reportes de mantenimiento a un archivo .xlsx de Excel
   * Columnas ordenadas exactamente igual que la tabla del Panel en Vivo (de izquierda a derecha)
   */
  exportMaintenanceToExcel: (
    records: MaintenanceRecord[],
    fileName = 'Reporte_Mantenimiento_Formadoras'
  ) => {
    const data = records.map((r) => ({
      'USUARIO': r.operator || '',
      'ESTACIÓN': r.station || MASTER_DATA.getStationForMachine(r.machine || '') || '',
      'TURNO': r.shift || '',
      'FECHA': r.date || '',
      'MÁQUINA': r.machine ? `Máq. ${r.machine}` : '',
      'HORA DE PARADA': r.failureTime || '',
      'DEFECTO': r.defect || '',
      'SOLUCIÓN': r.solution || '',
      'HORA LLEGADA DEL TÉCNICO': r.technicianArrivalTime || '',
      'HORA FINAL DE SOLUCIÓN': r.closingTime || '',
      'MECÁNICO': r.solvingTechnician || r.technician || '',
      'EFECTIVA': r.effectiveSolution || '',
      'ESTADO': r.status || 'FINALIZADO',
      'TIEMPO LLEGADA (MIN)': r.arrivalTimeMin ?? 0,
      'TIEMPO SOLUCIÓN (MIN)': r.repairTimeMin ?? 0,
      'TIEMPO MUERTO TOTAL (MIN)': r.totalDowntimeMin ?? 0,
      'REPORTE': r.reportNumber || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajuste de anchos de columna automáticos
    const columnWidths = [
      { wch: 22 }, // USUARIO
      { wch: 16 }, // ESTACIÓN
      { wch: 12 }, // TURNO
      { wch: 12 }, // FECHA
      { wch: 12 }, // MÁQUINA
      { wch: 16 }, // HORA DE PARADA
      { wch: 30 }, // DEFECTO
      { wch: 32 }, // SOLUCIÓN
      { wch: 24 }, // HORA LLEGADA DEL TÉCNICO
      { wch: 22 }, // HORA FINAL DE SOLUCIÓN
      { wch: 20 }, // MECÁNICO
      { wch: 12 }, // EFECTIVA
      { wch: 14 }, // ESTADO
      { wch: 20 }, // TIEMPO LLEGADA (MIN)
      { wch: 20 }, // TIEMPO SOLUCIÓN (MIN)
      { wch: 24 }, // TIEMPO MUERTO TOTAL (MIN)
      { wch: 16 }  // REPORTE
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mantenimiento');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
  },

  /**
   * Exporta la consolidación de producción a Excel (.xlsx) con las 15 columnas exactas:
   * 1. ESTACIÓN
   * 2. USUARIO (extraer únicamente el primer nombre del operador)
   * 3. CLIENTE (referencia de la caja)
   * 4. CANTIDAD TOTAL TRAZABILIDAD FINALIZADAS
   * 5. SUMATORIA PESO FINAL CAJA
   * 6. CANTIDAD TOTAL DE CAJAS REGISTRADAS
   * 7. SUMATORIA DE DESPERDICIO DE CUADRE
   * 8. SUMATORIA DE DESPERDICIO DE ENCERADO
   * 9. SUMATORIA DE DESPERDICIO DE MERMA
   * 10. SUMATORIA DE DESPERDICIO DE ROLLO
   * 11. SUMATORIA DE DESPERDICIO DE BORDE
   * 12. SUMATORIA DE DESPERDICIO DE PUNTA
   * 13. CÓDIGO DE ROLLO (listar/concatenar todos los códigos asignados al registro)
   * 14. MECÁNICO DEL REGISTRO TURNO
   * 15. AUXILIAR DEL REGISTRO TURNO
   */
  exportProductionConsolidatedToExcel: ({
    boxes = [],
    turns = [],
    traceability = [],
    waste = [],
    filterDate = '',
    filterStation = '',
    fileName = 'Consolidado_Produccion_Formadoras'
  }: ProductionExportParams) => {
    const groups: ConsolidatedGroup[] = [];

    // Helper para buscar grupo existente
    const findGroup = (
      date?: string,
      st?: string,
      shift?: string,
      op?: string,
      ref?: string
    ): ConsolidatedGroup | undefined => {
      const normOp = normalizeName(op);
      const normSt = normalizeStation(st);

      return groups.find((g) => {
        if (date && g.date && g.date !== date) return false;
        if (normSt && normalizeStation(g.station) !== normSt) return false;
        if (normOp && normalizeName(g.operator) !== normOp) return false;
        if (shift && g.shift && g.shift !== shift) return false;
        if (ref && g.reference && ref.trim().toUpperCase() !== g.reference.trim().toUpperCase()) return false;
        return true;
      });
    };

    // 1. Inicializar grupos desde turnos de producción registrados
    for (const turn of turns) {
      if (filterDate && turn.date && turn.date !== filterDate) continue;
      const turnSt = normalizeStation(turn.station);
      if (filterStation && turnSt !== normalizeStation(filterStation)) continue;

      groups.push({
        date: turn.date || '',
        station: turn.station || turnSt || '',
        shift: turn.shift || '',
        operator: turn.packer || '',
        reference: turn.reference || '',
        tech: turn.tech || '',
        aux: turn.aux || '',
        traceabilityCount: 0,
        rollCodes: new Set<string>(),
        boxesCount: 0,
        sumFinalBoxWeight: 0,
        wasteCuadre: 0,
        wasteEncerado: 0,
        wasteMerma: 0,
        wasteRollo: 0,
        wasteBorde: 0,
        wastePunta: 0
      });
    }

    // 2. Consolidar registros de cajas de calidad / producción
    for (const box of boxes) {
      if (filterDate && box.date && box.date !== filterDate) continue;
      const boxSt = normalizeStation(box.station, box.machine);
      if (filterStation && boxSt !== normalizeStation(filterStation)) continue;

      // Buscar grupo con coincidencia exacta (fecha, estación, turno, operario y referencia)
      let target = findGroup(box.date, box.station || boxSt, box.shift, box.packer, box.reference);

      // Si no coincide la referencia exacta, buscar por fecha, estación, turno y operario
      if (!target) {
        target = findGroup(box.date, box.station || boxSt, box.shift, box.packer);
      }

      if (target) {
        target.boxesCount += 1;
        target.sumFinalBoxWeight += Number(box.weightTotal) || 0;
        if (!target.tech && box.tech) target.tech = box.tech;
        if (!target.aux && box.aux) target.aux = box.aux;
        if (!target.reference && box.reference) target.reference = box.reference;
      } else {
        // Si no existía turno previo, crear grupo desde la caja
        const newGroup: ConsolidatedGroup = {
          date: box.date || '',
          station: box.station || boxSt || '',
          shift: box.shift || '',
          operator: box.packer || '',
          reference: box.reference || '',
          tech: box.tech || '',
          aux: box.aux || '',
          traceabilityCount: 0,
          rollCodes: new Set<string>(),
          boxesCount: 1,
          sumFinalBoxWeight: Number(box.weightTotal) || 0,
          wasteCuadre: 0,
          wasteEncerado: 0,
          wasteMerma: 0,
          wasteRollo: 0,
          wasteBorde: 0,
          wastePunta: 0
        };
        groups.push(newGroup);
      }
    }

    // 3. Consolidar registros de trazabilidad finalizados (rollos)
    for (const traz of traceability) {
      if (traz.status && traz.status !== 'FINALIZADO') continue;
      if (filterDate && traz.date && traz.date !== filterDate) continue;
      const trazSt = normalizeStation(traz.station, traz.machine);
      if (filterStation && trazSt !== normalizeStation(filterStation)) continue;

      let target = findGroup(traz.date, traz.station || trazSt, traz.shift, traz.operator);
      if (!target) {
        target = findGroup(traz.date, traz.station || trazSt, undefined, traz.operator);
      }

      if (target) {
        target.traceabilityCount += 1;
        if (traz.rollCode && traz.rollCode.trim()) {
          target.rollCodes.add(traz.rollCode.trim().toUpperCase());
        }
      } else {
        const rollSet = new Set<string>();
        if (traz.rollCode && traz.rollCode.trim()) {
          rollSet.add(traz.rollCode.trim().toUpperCase());
        }
        groups.push({
          date: traz.date || '',
          station: traz.station || trazSt || '',
          shift: traz.shift || '',
          operator: traz.operator || '',
          reference: '',
          tech: '',
          aux: '',
          traceabilityCount: 1,
          rollCodes: rollSet,
          boxesCount: 0,
          sumFinalBoxWeight: 0,
          wasteCuadre: 0,
          wasteEncerado: 0,
          wasteMerma: 0,
          wasteRollo: 0,
          wasteBorde: 0,
          wastePunta: 0
        });
      }
    }

    // 4. Consolidar registros de desperdicio finalizados
    for (const wst of waste) {
      if (wst.status && wst.status !== 'FINALIZADO') continue;
      if (filterDate && wst.date && wst.date !== filterDate) continue;
      const wstSt = normalizeStation(wst.station, wst.machine);
      if (filterStation && wstSt !== normalizeStation(filterStation)) continue;

      let target = findGroup(wst.date, wst.station || wstSt, wst.shift, wst.operator);
      if (!target) {
        target = findGroup(wst.date, wst.station || wstSt, undefined, wst.operator);
      }

      if (!target) {
        target = {
          date: wst.date || '',
          station: wst.station || wstSt || '',
          shift: wst.shift || '',
          operator: wst.operator || '',
          reference: '',
          tech: '',
          aux: '',
          traceabilityCount: 0,
          rollCodes: new Set<string>(),
          boxesCount: 0,
          sumFinalBoxWeight: 0,
          wasteCuadre: 0,
          wasteEncerado: 0,
          wasteMerma: 0,
          wasteRollo: 0,
          wasteBorde: 0,
          wastePunta: 0
        };
        groups.push(target);
      }

      if (Array.isArray(wst.items)) {
        for (const item of wst.items) {
          const r = (item.reason || '').toUpperCase();
          const w = Number(item.weightKg) || 0;
          if (r.includes('CUADRE')) target.wasteCuadre += w;
          else if (r.includes('ENCERADO')) target.wasteEncerado += w;
          else if (r.includes('MERMA')) target.wasteMerma += w;
          else if (r.includes('ROLLO')) target.wasteRollo += w;
          else if (r.includes('BORDE')) target.wasteBorde += w;
          else if (r.includes('PUNTA')) target.wastePunta += w;
        }
      }
    }

    // Definición estricta de las 15 columnas en el orden solicitado
    const headers = [
      'ESTACIÓN',
      'USUARIO',
      'CLIENTE',
      'CANTIDAD TOTAL TRAZABILIDAD FINALIZADAS',
      'SUMATORIA PESO FINAL CAJA',
      'CANTIDAD TOTAL DE CAJAS REGISTRADAS',
      'SUMATORIA DE DESPERDICIO DE CUADRE',
      'SUMATORIA DE DESPERDICIO DE ENCERADO',
      'SUMATORIA DE DESPERDICIO DE MERMA',
      'SUMATORIA DE DESPERDICIO DE ROLLO',
      'SUMATORIA DE DESPERDICIO DE BORDE',
      'SUMATORIA DE DESPERDICIO DE PUNTA',
      'CÓDIGO DE ROLLO',
      'MECÁNICO DEL REGISTRO TURNO',
      'AUXILIAR DEL REGISTRO TURNO'
    ];

    // Mapeo ordenado de datos consolidados
    const data = groups.map((g) => {
      const rollList = Array.from(g.rollCodes);
      const rollCodesStr = rollList.length > 0 ? rollList.join(', ') : '-';

      return {
        'ESTACIÓN': g.station || 'Sin Estación',
        'USUARIO': formatFirstNameUpper(g.operator) || '-',
        'CLIENTE': g.reference || '-',
        'CANTIDAD TOTAL TRAZABILIDAD FINALIZADAS': g.traceabilityCount,
        'SUMATORIA PESO FINAL CAJA': Number(g.sumFinalBoxWeight.toFixed(2)),
        'CANTIDAD TOTAL DE CAJAS REGISTRADAS': g.boxesCount,
        'SUMATORIA DE DESPERDICIO DE CUADRE': Number(g.wasteCuadre.toFixed(2)),
        'SUMATORIA DE DESPERDICIO DE ENCERADO': Number(g.wasteEncerado.toFixed(2)),
        'SUMATORIA DE DESPERDICIO DE MERMA': Number(g.wasteMerma.toFixed(2)),
        'SUMATORIA DE DESPERDICIO DE ROLLO': Number(g.wasteRollo.toFixed(2)),
        'SUMATORIA DE DESPERDICIO DE BORDE': Number(g.wasteBorde.toFixed(2)),
        'SUMATORIA DE DESPERDICIO DE PUNTA': Number(g.wastePunta.toFixed(2)),
        'CÓDIGO DE ROLLO': rollCodesStr,
        'MECÁNICO DEL REGISTRO TURNO': g.tech || '-',
        'AUXILIAR DEL REGISTRO TURNO': g.aux || '-'
      };
    });

    let worksheet: XLSX.WorkSheet;
    if (data.length === 0) {
      worksheet = XLSX.utils.aoa_to_sheet([headers]);
    } else {
      worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    }

    // Anchos de columna optimizados para visualización profesional
    const columnWidths = [
      { wch: 18 }, // ESTACIÓN
      { wch: 18 }, // USUARIO
      { wch: 26 }, // CLIENTE
      { wch: 40 }, // CANTIDAD TOTAL TRAZABILIDAD FINALIZADAS
      { wch: 28 }, // SUMATORIA PESO FINAL CAJA
      { wch: 38 }, // CANTIDAD TOTAL DE CAJAS REGISTRADAS
      { wch: 36 }, // SUMATORIA DE DESPERDICIO DE CUADRE
      { wch: 36 }, // SUMATORIA DE DESPERDICIO DE ENCERADO
      { wch: 34 }, // SUMATORIA DE DESPERDICIO DE MERMA
      { wch: 34 }, // SUMATORIA DE DESPERDICIO DE ROLLO
      { wch: 34 }, // SUMATORIA DE DESPERDICIO DE BORDE
      { wch: 34 }, // SUMATORIA DE DESPERDICIO DE PUNTA
      { wch: 34 }, // CÓDIGO DE ROLLO
      { wch: 30 }, // MECÁNICO DEL REGISTRO TURNO
      { wch: 30 }  // AUXILIAR DEL REGISTRO TURNO
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidado');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
  },

  /**
   * Mantiene compatibilidad con llamadas existentes a exportProductionToExcel
   */
  exportProductionToExcel: (
    recordsOrParams: ProductionQualityRecord[] | ProductionExportParams,
    fileName = 'Consolidado_Produccion_Formadoras'
  ) => {
    if (Array.isArray(recordsOrParams)) {
      ExcelExportService.exportProductionConsolidatedToExcel({
        boxes: recordsOrParams,
        fileName
      });
    } else {
      ExcelExportService.exportProductionConsolidatedToExcel(recordsOrParams);
    }
  }
};

