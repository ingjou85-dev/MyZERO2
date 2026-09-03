import React, { useState } from 'react';
import { MaintenanceRecord } from '../types.ts';
import { MASTER_DATA } from '../constants/masterData.ts';
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  BarChart3,
  Timer,
  UserCheck,
  TrendingUp,
  Cpu
} from 'lucide-react';

interface MaintenanceSummaryTabProps {
  records: MaintenanceRecord[];
}

export const MaintenanceSummaryTab: React.FC<MaintenanceSummaryTabProps> = ({ records }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Filtrar registros por fecha (o todos si está vacío)
  const filteredRecords = records.filter((r) => {
    if (selectedDate && r.date !== selectedDate) return false;
    return true;
  });

  // KPIs Generales
  const totalReports = filteredRecords.length;
  const totalDowntimeMin = filteredRecords.reduce((acc, r) => acc + (r.totalDowntimeMin || 0), 0);
  const totalWaitTimeMin = filteredRecords.reduce((acc, r) => acc + (r.arrivalTimeMin || 0), 0);
  const totalRepairTimeMin = filteredRecords.reduce((acc, r) => acc + (r.repairTimeMin || 0), 0);
  
  const avgDowntimeMin = totalReports > 0 ? Math.round(totalDowntimeMin / totalReports) : 0;
  const avgWaitTimeMin = totalReports > 0 ? Math.round(totalWaitTimeMin / totalReports) : 0;
  const avgRepairTimeMin = totalReports > 0 ? Math.round(totalRepairTimeMin / totalReports) : 0;

  const effectiveCount = filteredRecords.filter((r) => r.effectiveSolution === 'Sí').length;
  const effectivenessRate = totalReports > 0 ? Math.round((effectiveCount / totalReports) * 100) : 100;

  // Defectos más recurrentes
  const defectCounts: Record<string, { count: number; downtime: number }> = {};
  filteredRecords.forEach((r) => {
    const defects = r.defects && r.defects.length > 0 ? r.defects : [r.defect || 'Otro Defecto'];
    defects.forEach((d) => {
      const name = d.trim();
      if (!name) return;
      if (!defectCounts[name]) {
        defectCounts[name] = { count: 0, downtime: 0 };
      }
      defectCounts[name].count += 1;
      defectCounts[name].downtime += r.totalDowntimeMin || 0;
    });
  });

  const sortedDefects = Object.entries(defectCounts)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Máquinas por Estación con Tiempo Muerto Total
  const machineDowntime: Record<
    string,
    { machine: string; station: string; count: number; downtimeMin: number; waitMin: number; repairMin: number }
  > = {};

  filteredRecords.forEach((r) => {
    const m = r.machine || 'Sin Asignar';
    const st = r.station || MASTER_DATA.getStationForMachine(m) || 'Estación 51';
    if (!machineDowntime[m]) {
      machineDowntime[m] = {
        machine: m,
        station: st,
        count: 0,
        downtimeMin: 0,
        waitMin: 0,
        repairMin: 0
      };
    }
    machineDowntime[m].count += 1;
    machineDowntime[m].downtimeMin += r.totalDowntimeMin || 0;
    machineDowntime[m].waitMin += r.arrivalTimeMin || 0;
    machineDowntime[m].repairMin += r.repairTimeMin || 0;
  });

  const sortedMachines = Object.values(machineDowntime).sort(
    (a, b) => b.downtimeMin - a.downtimeMin
  );

  // Proporción Comparativa: Tiempo Espera Mecánico vs Tiempo Solución
  const sumTimes = totalWaitTimeMin + totalRepairTimeMin;
  const waitPercentage = sumTimes > 0 ? Math.round((totalWaitTimeMin / sumTimes) * 100) : 50;
  const repairPercentage = sumTimes > 0 ? 100 - waitPercentage : 50;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* FILTROS SUPERIORES DEL RESUMEN */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-maint-50 text-maint-600 rounded-xl border border-maint-200">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Resumen Ejecutivo de Mantenimiento
            </h3>
            <p className="text-xs text-slate-500">
              Análisis de fallas recurrentes, tiempos muertos y disponibilidad de máquinas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* FILTRO FECHA */}
          <div className="relative">
            <input
              type="date"
              id="filterMaintSummaryDate"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-slate-300 p-2 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-maint-600 focus:outline-none pl-8"
            />
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-maint-50 text-maint-600 rounded-xl border border-maint-200">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Reportes
            </span>
            <span className="text-xl font-black text-slate-900">{totalReports}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Tiempo Muerto Total
            </span>
            <span className="text-xl font-black text-slate-900">{totalDowntimeMin} min</span>
            <span className="text-[10px] text-slate-400 block font-mono">
              ~{(totalDowntimeMin / 60).toFixed(1)} hrs
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Prom. Espera Técnico
            </span>
            <span className="text-xl font-black text-blue-700">{avgWaitTimeMin} min</span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Solución: {avgRepairTimeMin} min
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Efectividad Solución
            </span>
            <span className="text-xl font-black text-emerald-700">{effectivenessRate}%</span>
            <span className="text-[10px] text-slate-400 block font-mono">
              {effectiveCount} de {totalReports} efectivas
            </span>
          </div>
        </div>
      </div>

      {/* COMPARATIVA TIEMPO SOLUCIÓN VS ESPERA MECÁNICO */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-maint-600" />
            Comparación: Tiempo Espera Mecánico vs. Tiempo Solución
          </h4>
          <span className="text-xs font-mono font-bold text-slate-600">
            Total Acumulado: {sumTimes} min
          </span>
        </div>

        {/* BARRA COMPARATIVA PROPORCIONAL */}
        <div className="w-full bg-slate-100 h-6 rounded-xl overflow-hidden flex shadow-inner border border-slate-200 text-xs font-black text-white">
          <div
            style={{ width: `${waitPercentage}%` }}
            className="bg-amber-500 flex items-center justify-center transition-all duration-500 overflow-hidden px-2 whitespace-nowrap"
            title={`Espera Mecánico: ${totalWaitTimeMin} min (${waitPercentage}%)`}
          >
            {waitPercentage > 15 && `Espera: ${totalWaitTimeMin}m (${waitPercentage}%)`}
          </div>
          <div
            style={{ width: `${repairPercentage}%` }}
            className="bg-emerald-600 flex items-center justify-center transition-all duration-500 overflow-hidden px-2 whitespace-nowrap"
            title={`Tiempo Solución: ${totalRepairTimeMin} min (${repairPercentage}%)`}
          >
            {repairPercentage > 15 && `Solución: ${totalRepairTimeMin}m (${repairPercentage}%)`}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-1">
          <div className="flex items-center gap-2 text-amber-700">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
            <span>Tiempo de Espera del Mecánico: {totalWaitTimeMin} min ({waitPercentage}%)</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-700">
            <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
            <span>Tiempo de Reparación/Solución: {totalRepairTimeMin} min ({repairPercentage}%)</span>
          </div>
        </div>
      </div>

      {/* DOS TABLAS: DEFECTOS RECURRENTES & TIEMPO MUERTO POR MÁQUINA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DEFECTOS MÁS RECURRENTES */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Defectos más Recurrentes
            </h4>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">
              Top {sortedDefects.length}
            </span>
          </div>

          <div className="p-4 flex-1">
            {sortedDefects.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                No hay registros de defectos en el período seleccionado.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedDefects.map((def, idx) => {
                  const maxCount = sortedDefects[0]?.count || 1;
                  const barWidth = Math.round((def.count / maxCount) * 100);
                  return (
                    <div key={def.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5 truncate max-w-[200px]" title={def.name}>
                          <span className="w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          {def.name}
                        </span>
                        <span className="text-slate-900 font-mono">
                          {def.count} rep. ({def.downtime} min)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-maint-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MÁQUINAS POR ESTACIÓN CON TIEMPO MUERTO TOTAL */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-maint-400" />
              Máquinas por Estación & Tiempo Muerto
            </h4>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">
              {sortedMachines.length} Máquinas
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Máquina</th>
                  <th className="p-2.5">Estación</th>
                  <th className="p-2.5 text-center">Fallas</th>
                  <th className="p-2.5 text-center">Espera</th>
                  <th className="p-2.5 text-center">Solución</th>
                  <th className="p-2.5 text-right">T. Muerto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedMachines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                      No hay registros de máquinas con paradas en este filtro.
                    </td>
                  </tr>
                ) : (
                  sortedMachines.map((m) => (
                    <tr key={m.machine} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-bold text-maint-700">Máq. {m.machine}</td>
                      <td className="p-2.5 text-slate-600">{m.station}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-900">
                        {m.count}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-600">
                        {m.waitMin}m
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-600">
                        {m.repairMin}m
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-rose-600">
                        {m.downtimeMin} min
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
