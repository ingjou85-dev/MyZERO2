import React, { useState, useEffect } from 'react';
import {
  ProductionQualityRecord,
  ProductionTurnRecord,
  ProductionWasteRecord,
  ProductionTraceabilityRecord
} from '../types.ts';
import { RecordService } from '../services/recordService.ts';
import { MASTER_DATA } from '../constants/masterData.ts';
import {
  Calendar,
  Layers,
  Box,
  FileSpreadsheet
} from 'lucide-react';

interface ProductionSummaryTabProps {
  records: ProductionQualityRecord[];
  turnRecords?: ProductionTurnRecord[];
  wasteRecords?: ProductionWasteRecord[];
  traceabilityRecords?: ProductionTraceabilityRecord[];
}

export const ProductionSummaryTab: React.FC<ProductionSummaryTabProps> = ({
  records,
  turnRecords = [],
  wasteRecords,
  traceabilityRecords
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [internalWaste, setInternalWaste] = useState<ProductionWasteRecord[]>(wasteRecords || []);
  const [internalTrace, setInternalTrace] = useState<ProductionTraceabilityRecord[]>(traceabilityRecords || []);

  useEffect(() => {
    if (wasteRecords) {
      setInternalWaste(wasteRecords);
    }
  }, [wasteRecords]);

  useEffect(() => {
    if (traceabilityRecords) {
      setInternalTrace(traceabilityRecords);
    }
  }, [traceabilityRecords]);

  useEffect(() => {
    if (!wasteRecords) {
      const unsub = RecordService.subscribeWasteRecords((w) => setInternalWaste(w));
      return () => unsub();
    }
  }, [wasteRecords]);

  useEffect(() => {
    if (!traceabilityRecords) {
      const unsub = RecordService.subscribeTraceabilityRecords((t) => setInternalTrace(t));
      return () => unsub();
    }
  }, [traceabilityRecords]);

  // Filtrar registros por fecha (o todos si está vacío)
  const filteredRecords = records.filter((r) => {
    if (selectedDate && r.date !== selectedDate) return false;
    return true;
  });

  const activeWasteRecords = internalWaste.filter((w) => {
    if (selectedDate && w.date !== selectedDate) return false;
    return true;
  });

  const activeTraceabilityRecords = internalTrace.filter((t) => {
    if (selectedDate && t.date !== selectedDate) return false;
    return true;
  });

  // Helper para clasificar tamaño/capacidad de onzas (4.5 oz, 4 oz, 6 oz)
  const getRecordOzCategory = (r: ProductionQualityRecord): '4.5' | '4' | '6' | 'other' => {
    const ref = (r.reference || '').toLowerCase();
    const st = (r.station || '').toLowerCase();
    const m = r.machine || '';

    // 1. Por referencia
    if (ref.includes('4,5') || ref.includes('4.5')) return '4.5';
    if (ref.includes('4 oz') || ref.includes('4oz')) return '4';
    if (ref.includes('6 oz') || ref.includes('6oz')) return '6';

    // 2. Por estación directa
    if (
      st.includes('452') ||
      st.includes('453') ||
      st.includes('454') ||
      st.includes('455') ||
      st.includes('451') ||
      st.includes('51') ||
      st.includes('53') ||
      st.includes('54') ||
      st.includes('55')
    ) return '4.5';
    if (st.includes('4 oz') || st.includes('4oz')) return '4';
    if (st.includes('6 oz') || st.includes('6oz')) return '6';

    // 3. Por turno asociado del operario
    if (turnRecords.length > 0) {
      const matchTurn = turnRecords.find(
        (t) =>
          (!t.date || !r.date || t.date === r.date) &&
          (!t.shift || !r.shift || t.shift === r.shift) &&
          ((t.packer && r.packer && t.packer.trim().toUpperCase() === r.packer.trim().toUpperCase()) ||
            (t.userId && r.userId && t.userId === r.userId))
      );
      if (matchTurn?.station) {
        const turnSt = matchTurn.station.toLowerCase();
        if (
          turnSt.includes('452') ||
          turnSt.includes('453') ||
          turnSt.includes('454') ||
          turnSt.includes('455') ||
          turnSt.includes('451') ||
          turnSt.includes('51') ||
          turnSt.includes('53') ||
          turnSt.includes('54') ||
          turnSt.includes('55')
        ) return '4.5';
        if (turnSt.includes('4 oz') || turnSt.includes('4oz')) return '4';
        if (turnSt.includes('6 oz') || turnSt.includes('6oz')) return '6';
      }
    }

    // 4. Por máquina
    if (['401', '402', '403', '404'].includes(m)) return '4';
    if (['601', '602', '603'].includes(m)) return '6';
    if (m.startsWith('45') || MASTER_DATA.getStationForMachine(m).includes('45') || MASTER_DATA.getStationForMachine(m).includes('5')) return '4.5';

    return 'other';
  };

  /**
   * Resuelve de forma estricta, desacoplada e independiente el ID de Estación
   * ('452', '453', '454', '455', '4 oz', '6 oz') para cualquier registro.
   * Totalmente independiente del consecutivo global y de los turnos del usuario.
   */
  const resolveStationId = (station?: string, machine?: string): string | null => {
    const st = (station || '').trim().toLowerCase();
    const m = (machine || '').trim();

    // 1. Coincidencia explícita por ID / Nombre de Estación guardado en el registro
    if (
      st.includes('estación 452') ||
      st.includes('estacion 452') ||
      st.includes('estación 451') ||
      st.includes('estacion 451') ||
      st.includes('estación 51') ||
      st.includes('estacion 51') ||
      st === '452' ||
      st === '451' ||
      st === '51'
    ) {
      return '452';
    }

    if (
      st.includes('estación 453') ||
      st.includes('estacion 453') ||
      st.includes('estación 53') ||
      st.includes('estacion 53') ||
      st === '453' ||
      st === '53'
    ) {
      return '453';
    }

    if (
      st.includes('estación 454') ||
      st.includes('estacion 454') ||
      st.includes('estación 54') ||
      st.includes('estacion 54') ||
      st === '454' ||
      st === '54'
    ) {
      return '454';
    }

    if (
      st.includes('estación 455') ||
      st.includes('estacion 455') ||
      st.includes('estación 55') ||
      st.includes('estacion 55') ||
      st === '455' ||
      st === '55'
    ) {
      return '455';
    }

    if (st.includes('4 oz') || st.includes('4oz') || st === '4') {
      return '4 oz';
    }

    if (st.includes('6 oz') || st.includes('6oz') || st === '6') {
      return '6 oz';
    }

    // 2. Si la estación no vino especificada explícitamente, resolver por la máquina única asignada
    if (m) {
      if (['459', '4513', '4514', '4515', '4516'].includes(m)) return '452';
      if (['451', '456', '4517', '4518', '4519'].includes(m)) return '453';
      if (['452', '454', '4511', '4512', '4520'].includes(m)) return '454';
      if (['453', '455', '457', '458', '4510'].includes(m)) return '455';
      if (['401', '402', '403', '404'].includes(m)) return '4 oz';
      if (['601', '602', '603'].includes(m)) return '6 oz';

      const masterSt = MASTER_DATA.getStationForMachine(m);
      if (masterSt) {
        if (masterSt.includes('452') || masterSt.includes('451') || masterSt.includes('51')) return '452';
        if (masterSt.includes('453') || masterSt.includes('53')) return '453';
        if (masterSt.includes('454') || masterSt.includes('54')) return '454';
        if (masterSt.includes('455') || masterSt.includes('55')) return '455';
        if (masterSt.toLowerCase().includes('4 oz')) return '4 oz';
        if (masterSt.toLowerCase().includes('6 oz')) return '6 oz';
      }
    }

    // 3. Fallback de subcadena segura
    if (st.includes('452')) return '452';
    if (st.includes('453')) return '453';
    if (st.includes('454')) return '454';
    if (st.includes('455')) return '455';

    return null;
  };

  // Filtro de registros de cajas finalizados y completados (desacoplado de borradores)
  const isFinalizedBox = (r: ProductionQualityRecord): boolean => {
    if (r.status === 'FINALIZADO') return true;
    if (!r.status && (!!r.approval || !!r.approvedBy || (r.boxNumber > 0 && !!r.machine))) return true;
    return false;
  };

  // Filtro de registros de trazabilidad finalizados (ROLLOS)
  const isFinalizedTrace = (t: ProductionTraceabilityRecord): boolean => {
    if (t.status === 'FINALIZADO') return true;
    if (!t.status && !!t.rollCode) return true;
    return false;
  };

  // Filtro de registros de desperdicio finalizados
  const isFinalizedWaste = (w: ProductionWasteRecord): boolean => {
    if (w.status === 'FINALIZADO') return true;
    if (!w.status && ((w.totalWeightKg && w.totalWeightKg > 0) || (w.items && w.items.length > 0))) return true;
    return false;
  };

  // Criterio de agregación para determinar si corresponde a Turno 2 o Turno 1
  const isTurno2 = (shiftStr?: string): boolean => {
    const s = (shiftStr || '').toLowerCase().trim();
    return s === 'turno 2' || s.includes('2') || s.includes('dos') || s === 't2';
  };

  // TABLA 1: Estaciones 4.5 oz
  // Metas fijas: 452, 453, 454 = 180 | 455 = 144
  const stations45List = [
    { id: '452', meta: 180, machines: ['459', '4513', '4514', '4515', '4516'] },
    { id: '453', meta: 180, machines: ['451', '456', '4517', '4518', '4519'] },
    { id: '454', meta: 180, machines: ['452', '454', '4511', '4512', '4520'] },
    { id: '455', meta: 144, machines: ['453', '455', '457', '458', '4510'] }
  ];

  const station45Rows = stations45List.map((st) => {
    // Filtrado estricto e independiente por ID de estación exclusiva para cajas finalizadas
    const recsForStation = filteredRecords.filter((r) => {
      if (!isFinalizedBox(r)) return false;
      return resolveStationId(r.station, r.machine) === st.id;
    });

    const turno2 = recsForStation.filter((r) => isTurno2(r.shift)).length;
    const turno1 = recsForStation.filter((r) => !isTurno2(r.shift)).length;
    const total = turno1 + turno2;

    const meta = st.meta;
    const variacion = meta - total;
    const utilizacion = meta > 0 ? (total / meta) * 100 : 0;

    // Desperdicio: sumatoria total en kg filtrado estrictamente por estación
    const wasteForStation = activeWasteRecords.filter((w) => {
      if (!isFinalizedWaste(w)) return false;
      return resolveStationId(w.station, w.machine) === st.id;
    });
    const desperdicioTotalKg = wasteForStation.reduce((sum, w) => {
      if (typeof w.totalWeightKg === 'number' && !isNaN(w.totalWeightKg) && w.totalWeightKg > 0) {
        return sum + w.totalWeightKg;
      }
      if (Array.isArray(w.items) && w.items.length > 0) {
        const itemsSum = w.items.reduce((acc, it) => acc + (Number(it.weightKg) || 0), 0);
        return sum + itemsSum;
      }
      return sum;
    }, 0);
    const desperdicio = Number(desperdicioTotalKg.toFixed(2));

    // ROLLOS: conteo estricto e independiente de registros operativos finalizados de trazabilidad para esta estación
    const traceForStation = activeTraceabilityRecords.filter((t) => {
      if (!isFinalizedTrace(t)) return false;
      return resolveStationId(t.station, t.machine) === st.id;
    });
    const rollos = traceForStation.length;

    return {
      station: st.id,
      turno1,
      turno2,
      total,
      meta,
      variacion,
      utilizacion,
      desperdicio,
      rollos
    };
  });

  const station45Totals = station45Rows.reduce(
    (acc, row) => {
      acc.turno1 += row.turno1;
      acc.turno2 += row.turno2;
      acc.total += row.total;
      acc.meta += row.meta;
      acc.variacion += row.variacion;
      acc.desperdicio += row.desperdicio;
      acc.rollos += row.rollos;
      return acc;
    },
    { turno1: 0, turno2: 0, total: 0, meta: 0, variacion: 0, desperdicio: 0, rollos: 0 }
  );

  const station45TotalUtilizacion =
    station45Totals.meta > 0
      ? ((station45Totals.total / station45Totals.meta) * 100).toFixed(1)
      : '0.0';

  // TABLA 2: Estaciones 4 y 6 oz
  // Metas fijas: 4 oz = 144 | 6 oz = 96
  const stations46List = [
    { id: '4 oz', meta: 144, machines: ['401', '402', '403', '404'] },
    { id: '6 oz', meta: 96, machines: ['601', '602', '603'] }
  ];

  const station46Rows = stations46List.map((st) => {
    // Filtrado estricto e independiente por ID de estación exclusiva para cajas finalizadas
    const recsForStation = filteredRecords.filter((r) => {
      if (!isFinalizedBox(r)) return false;
      return resolveStationId(r.station, r.machine) === st.id;
    });

    const turno2 = recsForStation.filter((r) => isTurno2(r.shift)).length;
    const turno1 = recsForStation.filter((r) => !isTurno2(r.shift)).length;
    const total = turno1 + turno2;

    const meta = st.meta;
    const variacion = meta - total;
    const utilizacion = meta > 0 ? (total / meta) * 100 : 0;

    // Desperdicio filtrado estrictamente por estación
    const wasteForStation = activeWasteRecords.filter((w) => {
      if (!isFinalizedWaste(w)) return false;
      return resolveStationId(w.station, w.machine) === st.id;
    });
    const desperdicioTotalKg = wasteForStation.reduce((sum, w) => {
      if (typeof w.totalWeightKg === 'number' && !isNaN(w.totalWeightKg) && w.totalWeightKg > 0) {
        return sum + w.totalWeightKg;
      }
      if (Array.isArray(w.items) && w.items.length > 0) {
        const itemsSum = w.items.reduce((acc, it) => acc + (Number(it.weightKg) || 0), 0);
        return sum + itemsSum;
      }
      return sum;
    }, 0);
    const desperdicio = Number(desperdicioTotalKg.toFixed(2));

    // ROLLOS: conteo estricto e independiente por estación
    const traceForStation = activeTraceabilityRecords.filter((t) => {
      if (!isFinalizedTrace(t)) return false;
      return resolveStationId(t.station, t.machine) === st.id;
    });
    const rollos = traceForStation.length;

    return {
      station: st.id,
      turno1,
      turno2,
      total,
      meta,
      variacion,
      utilizacion,
      desperdicio,
      rollos
    };
  });

  const station46Totals = station46Rows.reduce(
    (acc, row) => {
      acc.turno1 += row.turno1;
      acc.turno2 += row.turno2;
      acc.total += row.total;
      acc.meta += row.meta;
      acc.variacion += row.variacion;
      acc.desperdicio += row.desperdicio;
      acc.rollos += row.rollos;
      return acc;
    },
    { turno1: 0, turno2: 0, total: 0, meta: 0, variacion: 0, desperdicio: 0, rollos: 0 }
  );

  const station46TotalUtilizacion =
    station46Totals.meta > 0
      ? ((station46Totals.total / station46Totals.meta) * 100).toFixed(1)
      : '0.0';

  // Contadores para las tarjetas de métricas superiores (desacopladas y en sincronía exacta con las tablas)
  const totalCajas = station45Totals.total + station46Totals.total;
  const totalCajas45 = station45Totals.total;
  const totalCajas4 = station46Rows.find((r) => r.station === '4 oz')?.total || 0;
  const totalCajas6 = station46Rows.find((r) => r.station === '6 oz')?.total || 0;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* FILTROS SUPERIORES DEL RESUMEN */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Resumen Ejecutivo de Producción
            </h3>
            <p className="text-xs text-slate-500">
              Control consolidado de metas, variación, porcentaje de utilización y desperdicio por estación
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* FILTRO FECHA */}
          <div className="relative">
            <input
              type="date"
              id="filterSummaryDate"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-prod-600 focus:outline-none pl-8"
            />
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* CARD 1: Total de cajas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-prod-50 text-prod-700 rounded-xl border border-prod-200">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total de cajas
            </span>
            <span className="text-xl font-black text-slate-900">{totalCajas}</span>
          </div>
        </div>

        {/* CARD 2: Total Cajas 4.5 oz */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-sky-50 text-sky-700 rounded-xl border border-sky-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Cajas 4.5 oz
            </span>
            <span className="text-xl font-black text-sky-900">{totalCajas45}</span>
          </div>
        </div>

        {/* CARD 3: Total Cajas 4 oz */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Cajas 4 oz
            </span>
            <span className="text-xl font-black text-emerald-800">{totalCajas4}</span>
          </div>
        </div>

        {/* CARD 4: Total Cajas 6 oz */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Cajas 6 oz
            </span>
            <span className="text-xl font-black text-amber-800">{totalCajas6}</span>
          </div>
        </div>
      </div>

      {/* TABLA 1: TABLA DE PRODUCCIÓN ESTACIÓN 4.5 OZ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-sky-200/80 px-4 py-3 border-b border-sky-300/80 flex justify-between items-center">
          <h4 className="text-xs font-black text-sky-950 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-800" />
            Tabla de Producción estación 4.5 oz
          </h4>
          <span className="text-[11px] font-bold text-sky-900 bg-white/70 px-2.5 py-0.5 rounded-md">
            {selectedDate ? `Fecha: ${selectedDate}` : 'Consolidado General'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-sky-200 text-sky-950 font-black uppercase text-[11px] tracking-wider border-b border-sky-300">
                <th className="p-3 text-center border-r border-sky-300 font-black">Estación</th>
                <th className="p-3 text-center border-r border-sky-300">Turno 1</th>
                <th className="p-3 text-center border-r border-sky-300">Turno 2</th>
                <th className="p-3 text-center border-r border-sky-300 font-black">Total</th>
                <th className="p-3 text-center border-r border-sky-300">Meta</th>
                <th className="p-3 text-center border-r border-sky-300">Variación</th>
                <th className="p-3 text-center border-r border-sky-300 font-black">% Utilización</th>
                <th className="p-3 text-center border-r border-sky-300 font-black">Desperdicio</th>
                <th className="p-3 text-center font-black">ROLLOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200/60 font-bold">
              {station45Rows.map((row, idx) => (
                <tr
                  key={row.station}
                  className={`transition ${
                    idx % 2 === 0 ? 'bg-yellow-200/90' : 'bg-yellow-200/75'
                  } hover:bg-yellow-300/90 text-slate-900`}
                >
                  <td className="p-3 font-black border-r border-amber-300 text-slate-950">
                    {row.station}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-900">
                    {row.turno1}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-900">
                    {row.turno2}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-black font-mono text-slate-950">
                    {row.total}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-800">
                    {row.meta}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-800">
                    {row.variacion}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-black text-slate-950">
                    {row.utilizacion.toFixed(1)}%
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-900">
                    {row.desperdicio.toFixed(2)}
                  </td>
                  <td className="p-3 font-mono font-black text-slate-950">
                    {row.rollos}
                  </td>
                </tr>
              ))}

              {/* FILA DE TOTALES GENERALES ESTACIONES 4.5 OZ */}
              <tr className="bg-amber-400 text-slate-950 font-black border-t-2 border-amber-500 text-xs uppercase">
                <td className="p-3 text-center font-black border-r border-amber-500">Total</td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {station45Totals.turno1}
                </td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {station45Totals.turno2}
                </td>
                <td className="p-3 text-center font-black font-mono border-r border-amber-500 text-sm">
                  {station45Totals.total}
                </td>
                <td className="p-3 text-center font-black font-mono border-r border-amber-500">
                  {station45Totals.meta}
                </td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {station45Totals.variacion}
                </td>
                <td className="p-3 text-center font-black border-r border-amber-500 text-sm">
                  {station45TotalUtilizacion}%
                </td>
                <td className="p-3 text-center font-mono font-black border-r border-amber-500">
                  {station45Totals.desperdicio.toFixed(2)}
                </td>
                <td className="p-3 text-center font-mono font-black text-sm">
                  {station45Totals.rollos}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA 2: TABLA DE PRODUCCIÓN ESTACIÓN 4 Y 6 OZ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-sky-200/80 px-4 py-3 border-b border-sky-300/80 flex justify-between items-center">
          <h4 className="text-xs font-black text-sky-950 uppercase tracking-wider flex items-center gap-2">
            <Box className="w-4 h-4 text-sky-800" />
            Tabla de Producción estación 4 y 6 oz
          </h4>
          <span className="text-[11px] font-bold text-sky-900 bg-white/70 px-2.5 py-0.5 rounded-md">
            Estaciones 4 oz y 6 oz
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-sky-200 text-sky-950 font-black uppercase text-[11px] tracking-wider border-b border-sky-300">
                <th className="p-3 text-center border-r border-sky-300 font-black">Estación</th>
                <th className="p-3 text-center border-r border-sky-300">Turno 1</th>
                <th className="p-3 text-center border-r border-sky-300">Turno 2</th>
                <th className="p-3 text-center border-r border-sky-300 font-black">Total</th>
                <th className="p-3 text-center border-r border-sky-300">Meta</th>
                <th className="p-3 text-center border-r border-sky-300">Variación</th>
                <th className="p-3 text-center border-r border-sky-300 font-black">% Utilización</th>
                <th className="p-3 text-center border-r border-sky-300 font-black">Desperdicio</th>
                <th className="p-3 text-center font-black">ROLLOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200/60 font-bold">
              {station46Rows.map((row, idx) => (
                <tr
                  key={row.station}
                  className={`transition ${
                    idx % 2 === 0 ? 'bg-yellow-200/90' : 'bg-yellow-200/75'
                  } hover:bg-yellow-300/90 text-slate-900`}
                >
                  <td className="p-3 font-black border-r border-amber-300 text-slate-950">
                    {row.station}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-900">
                    {row.turno1}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-900">
                    {row.turno2}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-black font-mono text-slate-950">
                    {row.total}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-800">
                    {row.meta}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-800">
                    {row.variacion}
                  </td>
                  <td className="p-3 border-r border-amber-300 font-black text-slate-950">
                    {row.utilizacion.toFixed(1)}%
                  </td>
                  <td className="p-3 border-r border-amber-300 font-mono text-slate-900">
                    {row.desperdicio.toFixed(2)}
                  </td>
                  <td className="p-3 font-mono font-black text-slate-950">
                    {row.rollos}
                  </td>
                </tr>
              ))}

              {/* FILA DE TOTALES GENERALES ESTACIONES 4 Y 6 OZ */}
              <tr className="bg-amber-400 text-slate-950 font-black border-t-2 border-amber-500 text-xs uppercase">
                <td className="p-3 text-center font-black border-r border-amber-500">Total</td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {station46Totals.turno1}
                </td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {station46Totals.turno2}
                </td>
                <td className="p-3 text-center font-black font-mono border-r border-amber-500 text-sm">
                  {station46Totals.total}
                </td>
                <td className="p-3 text-center font-black font-mono border-r border-amber-500">
                  {station46Totals.meta}
                </td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {station46Totals.variacion}
                </td>
                <td className="p-3 text-center font-black border-r border-amber-500 text-sm">
                  {station46TotalUtilizacion}%
                </td>
                <td className="p-3 text-center font-mono font-black border-r border-amber-500">
                  {station46Totals.desperdicio.toFixed(2)}
                </td>
                <td className="p-3 text-center font-mono font-black text-sm">
                  {station46Totals.rollos}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
