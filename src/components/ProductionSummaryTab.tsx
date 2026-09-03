import React, { useState } from 'react';
import { ProductionQualityRecord, ProductionTurnRecord } from '../types.ts';
import { MASTER_DATA } from '../constants/masterData.ts';
import {
  Calendar,
  Layers,
  TrendingUp,
  Box,
  Target,
  Percent,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

interface ProductionSummaryTabProps {
  records: ProductionQualityRecord[];
  turnRecords?: ProductionTurnRecord[];
}

export const ProductionSummaryTab: React.FC<ProductionSummaryTabProps> = ({
  records,
  turnRecords = []
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Filtrar registros por fecha (o todos si está vacío)
  const filteredRecords = records.filter((r) => {
    if (selectedDate && r.date !== selectedDate) return false;
    return true;
  });

  // Lista de máquinas a mostrar: estaciones/máquinas 451 a 455
  const allMachines = ['451', '452', '453', '454', '455'];

  // Agrupación por Estación / Máquina
  const machineSummaryRows = allMachines.map((m) => {
    const recsForMachine = filteredRecords.filter((r) => r.machine === m);
    
    // Contar por turno
    const turno1 = recsForMachine.filter(
      (r) => r.shift === 'Turno 1' || r.shift?.toLowerCase().includes('1')
    ).length;
    const turno2 = recsForMachine.filter(
      (r) => r.shift === 'Turno 2' || r.shift?.toLowerCase().includes('2')
    ).length;
    const total = recsForMachine.length;

    // Meta estándar: 180 para máquinas principales, 144 para secundarias
    const meta = m === '455' || m === '460' || m === '461' || m === '462' ? 144 : 180;
    const variacion = Math.max(0, meta - total);
    const utilizacion = meta > 0 ? (total / meta) * 100 : 0;

    // Estimación de desperdicio basado en variación y defectos (Kg)
    const desperdicio = total > 0 ? Number(((variacion * 0.12) + (total * 0.015)).toFixed(2)) : 0;

    return {
      machine: m,
      turno1,
      turno2,
      total,
      meta,
      variacion,
      utilizacion,
      desperdicio
    };
  });

  // Totales de la tabla por Estación / Máquina
  const machineTotals = machineSummaryRows.reduce(
    (acc, row) => {
      acc.turno1 += row.turno1;
      acc.turno2 += row.turno2;
      acc.total += row.total;
      acc.meta += row.meta;
      acc.variacion += row.variacion;
      acc.desperdicio += row.desperdicio;
      return acc;
    },
    { turno1: 0, turno2: 0, total: 0, meta: 0, variacion: 0, desperdicio: 0 }
  );

  const machineTotalUtilizacion =
    machineTotals.meta > 0
      ? ((machineTotals.total / machineTotals.meta) * 100).toFixed(1)
      : '0.0';

  // Agrupación por Referencia (4 OZ, 6 OZ, 4.5 OZ, 7 OZ, etc.)
  const referencesList = ['6 OZ', '4 OZ', '4.5 OZ', '7 OZ', '9 OZ', '12 OZ', '16 OZ'];
  
  const referenceSummaryRows = referencesList
    .map((ref) => {
      const recsForRef = filteredRecords.filter((r) =>
        r.reference?.toLowerCase().includes(ref.toLowerCase().replace(' ', ''))
      );
      const turno1 = recsForRef.filter(
        (r) => r.shift === 'Turno 1' || r.shift?.toLowerCase().includes('1')
      ).length;
      const turno2 = recsForRef.filter(
        (r) => r.shift === 'Turno 2' || r.shift?.toLowerCase().includes('2')
      ).length;
      const total = recsForRef.length;
      
      const meta = ref === '6 OZ' ? 96 : ref === '4 OZ' ? 144 : 120;
      const variacion = Math.max(0, meta - total);
      const utilizacion = meta > 0 && total > 0 ? (total / meta) * 100 : 0;
      const desperdicio = total > 0 ? Number(((variacion * 0.15) + (total * 0.02)).toFixed(2)) : 0;

      return {
        reference: ref,
        turno1,
        turno2,
        total,
        meta,
        variacion,
        utilizacion,
        desperdicio
      };
    })
    .filter((row) => row.total > 0 || row.reference === '6 OZ' || row.reference === '4 OZ');

  const refTotals = referenceSummaryRows.reduce(
    (acc, row) => {
      acc.turno1 += row.turno1;
      acc.turno2 += row.turno2;
      acc.total += row.total;
      acc.meta += row.meta;
      acc.variacion += row.variacion;
      acc.desperdicio += row.desperdicio;
      return acc;
    },
    { turno1: 0, turno2: 0, total: 0, meta: 0, variacion: 0, desperdicio: 0 }
  );

  const refTotalUtilizacion =
    refTotals.meta > 0
      ? ((refTotals.total / refTotals.meta) * 100).toFixed(1)
      : '0.0';

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
              Control de metas, variación, porcentaje de utilización y desperdicio
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
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-prod-50 text-prod-700 rounded-xl border border-prod-200">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Cajas
            </span>
            <span className="text-xl font-black text-slate-900">{machineTotals.total}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Meta Planificada
            </span>
            <span className="text-xl font-black text-slate-900">{machineTotals.meta}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              % Utilización
            </span>
            <span className="text-xl font-black text-emerald-700">{machineTotalUtilizacion}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Desperdicio Total
            </span>
            <span className="text-xl font-black text-amber-700">
              {machineTotals.desperdicio.toFixed(2)} Kg
            </span>
          </div>
        </div>
      </div>

      {/* TABLA 1: RESUMEN POR ESTACIÓN / MÁQUINA (DISEÑO ADAPTADO DE LA IMAGEN) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-sky-200/80 px-4 py-3 border-b border-sky-300/80 flex justify-between items-center">
          <h4 className="text-xs font-black text-sky-950 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-800" />
            Tabla de Producción por Máquina / Estación
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
                <th className="p-3 text-center font-black">Desperdicio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200/60 font-bold">
              {machineSummaryRows.map((row, idx) => (
                <tr
                  key={row.machine}
                  className={`transition ${
                    idx % 2 === 0 ? 'bg-yellow-200/90' : 'bg-yellow-200/75'
                  } hover:bg-yellow-300/90 text-slate-900`}
                >
                  <td className="p-3 font-black border-r border-amber-300 text-slate-950">
                    {row.machine}
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
                  <td className="p-3 font-mono text-slate-900">
                    {row.desperdicio.toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* FILA DE TOTALES GENERALES */}
              <tr className="bg-amber-400 text-slate-950 font-black border-t-2 border-amber-500 text-xs uppercase">
                <td className="p-3 text-center font-black border-r border-amber-500">Total</td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {machineTotals.turno1}
                </td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {machineTotals.turno2}
                </td>
                <td className="p-3 text-center font-black font-mono border-r border-amber-500 text-sm">
                  {machineTotals.total}
                </td>
                <td className="p-3 text-center font-black font-mono border-r border-amber-500">
                  {machineTotals.meta}
                </td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {machineTotals.variacion}
                </td>
                <td className="p-3 text-center font-black border-r border-amber-500 text-sm">
                  {machineTotalUtilizacion}%
                </td>
                <td className="p-3 text-center font-mono font-black">
                  {machineTotals.desperdicio.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA 2: RESUMEN POR REFERENCIA / ONZAS (DISEÑO DE LA IMAGEN) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-sky-200/80 px-4 py-3 border-b border-sky-300/80 flex justify-between items-center">
          <h4 className="text-xs font-black text-sky-950 uppercase tracking-wider flex items-center gap-2">
            <Box className="w-4 h-4 text-sky-800" />
            Tabla de Producción por Referencia / Onzas
          </h4>
          <span className="text-[11px] font-bold text-sky-900 bg-white/70 px-2.5 py-0.5 rounded-md">
            Desglose por Medida
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-sky-200 text-sky-950 font-black uppercase text-[11px] tracking-wider border-b border-sky-300">
                <th className="p-3 text-center border-r border-sky-300 font-black">Referencia</th>
                <th className="p-3 text-center border-r border-sky-300">Turno 1</th>
                <th className="p-3 text-center border-r border-sky-300">Turno 2</th>
                <th className="p-3 text-center border-r border-sky-300 font-black">Total</th>
                <th className="p-3 text-center border-r border-sky-300">Meta</th>
                <th className="p-3 text-center border-r border-sky-300">Variación</th>
                <th className="p-3 text-center border-r border-sky-300 font-black">% Utilización</th>
                <th className="p-3 text-center font-black">Desperdicio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200/60 font-bold">
              {referenceSummaryRows.map((row, idx) => (
                <tr
                  key={row.reference}
                  className={`transition ${
                    idx % 2 === 0 ? 'bg-yellow-200/90' : 'bg-yellow-200/75'
                  } hover:bg-yellow-300/90 text-slate-900`}
                >
                  <td className="p-3 font-black border-r border-amber-300 text-slate-950">
                    {row.reference}
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
                  <td className="p-3 font-mono text-slate-900">
                    {row.desperdicio.toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* FILA DE TOTALES POR REFERENCIA */}
              <tr className="bg-amber-400 text-slate-950 font-black border-t-2 border-amber-500 text-xs uppercase">
                <td className="p-3 text-center font-black border-r border-amber-500">Total</td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {refTotals.turno1}
                </td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {refTotals.turno2}
                </td>
                <td className="p-3 text-center font-black font-mono border-r border-amber-500 text-sm">
                  {refTotals.total}
                </td>
                <td className="p-3 text-center font-black font-mono border-r border-amber-500">
                  {refTotals.meta}
                </td>
                <td className="p-3 text-center font-mono border-r border-amber-500">
                  {refTotals.variacion}
                </td>
                <td className="p-3 text-center font-black border-r border-amber-500 text-sm">
                  {refTotalUtilizacion}%
                </td>
                <td className="p-3 text-center font-mono font-black">
                  {refTotals.desperdicio.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
