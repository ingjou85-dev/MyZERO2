import React, { useState, useEffect } from 'react';
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
  Cpu,
  X,
  Info,
  Activity,
  ChevronRight
} from 'lucide-react';

interface MaintenanceSummaryTabProps {
  records: MaintenanceRecord[];
}

type KpiModalType = 'MAQUINAS_ON' | 'MAQUINAS_DETENIDAS' | 'MAQUINAS_EN_PROCESO' | null;

export const MaintenanceSummaryTab: React.FC<MaintenanceSummaryTabProps> = ({ records }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeModal, setActiveModal] = useState<KpiModalType>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    if (activeModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);

  // Filtrar registros por fecha (o todos si está vacío)
  const filteredRecords = records.filter((r) => {
    if (selectedDate && r.date !== selectedDate) return false;
    return true;
  });

  // ==========================================
  // KPIs EJECUTIVOS SUPERIORES
  // ==========================================
  // 1. Total de Reportes: Sin cambios (mantiene la contabilización general de todos los reportes registrados)
  const totalReports = filteredRecords.length;

  // Total de máquinas registradas en planta (catálogo maestro de 27 máquinas)
  const allRegisteredMachines = MASTER_DATA.machines;
  const totalRegisteredCount = allRegisteredMachines.length;

  // Reportes activos en estado Pausado o En Proceso:
  // Considera reportes en el período seleccionado (o los activos en planta si se consulta la fecha actual)
  const todayStr = new Date().toISOString().split('T')[0];
  const activeReports = records.filter((r) => {
    const isActivo = r.status === 'PAUSADO' || r.status === 'EN_PROCESO';
    if (!isActivo) return false;
    if (selectedDate) {
      if (selectedDate === todayStr) return true;
      return r.date === selectedDate;
    }
    return true;
  });

  // Máquinas con reportes activos en estado Pausado o En Proceso
  const machinesWithActiveReportsSet = new Set<string>();
  activeReports.forEach((r) => {
    if (r.machine) machinesWithActiveReportsSet.add(r.machine);
  });
  const machinesWithActiveReports = Array.from(machinesWithActiveReportsSet);

  // 2. Máquinas On (Reemplaza a "Tiempo Muerto Total"):
  // Lógica: Muestra el total de máquinas activas y operativas en planta.
  // Fórmula: (Total de máquinas registradas) - (Máquinas con reportes activos en estado Pausado o En Proceso)
  const maquinasOnList = allRegisteredMachines.filter((m) => !machinesWithActiveReportsSet.has(m));
  const maquinasOnCount = Math.max(0, totalRegisteredCount - machinesWithActiveReports.length);

  // 3. Máquinas Detenidas (Reemplaza a "Promedio Espera Mecánico"):
  // Lógica: Conteo de máquinas que requieren atención pero aún no han sido intervenidas.
  // Fórmula: Cantidad de reportes activos en estado Pausado que no tienen un mecánico asignado (campo de mecánico vacío o nulo).
  const maquinasDetenidasReports = activeReports.filter((r) => {
    if (r.status !== 'PAUSADO') return false;
    const hasTech = Boolean(r.solvingTechnician?.trim() || r.technician?.trim());
    return !hasTech;
  });
  const maquinasDetenidasCount = maquinasDetenidasReports.length;

  // 4. Máquinas en Proceso (Reemplaza a "Efectividad de Solución"):
  // Lógica: Conteo de máquinas que actualmente están siendo atendidas por el personal técnico.
  // Fórmula: Cantidad de reportes de mantenimiento activos que ya cuentan con un mecánico asignado/digitado (paso 4 completado).
  const maquinasEnProcesoReports = activeReports.filter((r) => {
    const isActivo = r.status === 'PAUSADO' || r.status === 'EN_PROCESO';
    if (!isActivo) return false;
    const hasTech = Boolean(
      r.solvingTechnician?.trim() ||
      r.technician?.trim() ||
      (r.currentStep && r.currentStep > 4)
    );
    return hasTech;
  });
  const maquinasEnProcesoCount = maquinasEnProcesoReports.length;

  // Cálculos complementarios para gráficos de tiempo
  const totalDowntimeMin = filteredRecords.reduce((acc, r) => acc + (r.totalDowntimeMin || 0), 0);
  const totalWaitTimeMin = filteredRecords.reduce((acc, r) => acc + (r.arrivalTimeMin || 0), 0);
  const totalRepairTimeMin = filteredRecords.reduce((acc, r) => acc + (r.repairTimeMin || 0), 0);

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
    const st = r.station || MASTER_DATA.getStationForMachine(m) || 'Estación 452';
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
        {/* 1. TOTAL DE REPORTES (Sin cambios) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Reportes
            </span>
            <span className="text-xl font-black text-slate-900">{totalReports}</span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Registros en período
            </span>
          </div>
        </div>

        {/* 2. MÁQUINAS ON (Reemplaza a "Tiempo Muerto Total") */}
        <button
          type="button"
          onClick={() => setActiveModal('MAQUINAS_ON')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 text-left hover:border-emerald-400 hover:shadow-md transition cursor-pointer group"
          title="Ver detalle de máquinas operativas"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Máquinas On
              </span>
              <Info className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 transition" />
            </div>
            <span className="text-xl font-black text-emerald-700 block">{maquinasOnCount}</span>
            <span className="text-[10px] text-slate-400 block font-mono">
              {maquinasOnCount} de {totalRegisteredCount} operativas
            </span>
          </div>
        </button>

        {/* 3. MÁQUINAS DETENIDAS (Reemplaza a "Promedio Espera Mecánico") */}
        <button
          type="button"
          onClick={() => setActiveModal('MAQUINAS_DETENIDAS')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 text-left hover:border-amber-400 hover:shadow-md transition cursor-pointer group"
          title="Ver detalle de máquinas detenidas sin mecánico asignado"
        >
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Máquinas Detenidas
              </span>
              <Info className="w-3 h-3 text-slate-300 group-hover:text-amber-600 transition" />
            </div>
            <span className="text-xl font-black text-amber-700 block">{maquinasDetenidasCount}</span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Sin mecánico asignado
            </span>
          </div>
        </button>

        {/* 4. MÁQUINAS EN PROCESO (Reemplaza a "Efectividad de Solución") */}
        <button
          type="button"
          onClick={() => setActiveModal('MAQUINAS_EN_PROCESO')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 text-left hover:border-blue-400 hover:shadow-md transition cursor-pointer group"
          title="Ver detalle de máquinas en proceso con mecánico"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Máquinas en Proceso
              </span>
              <Info className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition" />
            </div>
            <span className="text-xl font-black text-blue-700 block">{maquinasEnProcesoCount}</span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Con mecánico asignado
            </span>
          </div>
        </button>
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

      {/* CUADRO DE INFORMACIÓN / MODAL INTERACTIVO DE KPIS */}
      {activeModal && (
        <div
          id="modalMaintKpiDetail"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ENCABEZADO DEL MODAL */}
            <div
              className={`p-4 text-white flex justify-between items-center ${
                activeModal === 'MAQUINAS_ON'
                  ? 'bg-emerald-800'
                  : activeModal === 'MAQUINAS_DETENIDAS'
                  ? 'bg-amber-700'
                  : 'bg-blue-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  {activeModal === 'MAQUINAS_ON' && <CheckCircle2 className="w-6 h-6 text-emerald-300" />}
                  {activeModal === 'MAQUINAS_DETENIDAS' && <AlertTriangle className="w-6 h-6 text-amber-300" />}
                  {activeModal === 'MAQUINAS_EN_PROCESO' && <UserCheck className="w-6 h-6 text-blue-300" />}
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    {activeModal === 'MAQUINAS_ON' && 'Detalle: Máquinas On (Operativas)'}
                    {activeModal === 'MAQUINAS_DETENIDAS' && 'Detalle: Máquinas Detenidas'}
                    {activeModal === 'MAQUINAS_EN_PROCESO' && 'Detalle: Máquinas en Proceso'}
                  </h3>
                  <p className="text-xs text-white/80">
                    {activeModal === 'MAQUINAS_ON' &&
                      `${maquinasOnCount} de ${totalRegisteredCount} máquinas operativas en planta`}
                    {activeModal === 'MAQUINAS_DETENIDAS' &&
                      `${maquinasDetenidasCount} reporte(s) pausados en espera de asignación técnica`}
                    {activeModal === 'MAQUINAS_EN_PROCESO' &&
                      `${maquinasEnProcesoCount} reporte(s) activos atendidos con mecánico asignado`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENIDO SCROLLABLE DEL MODAL */}
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              {/* MODAL: MÁQUINAS ON */}
              {activeModal === 'MAQUINAS_ON' && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Equipos en operación normal sin paradas activas
                    </span>
                    <span className="font-black font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-900">
                      {maquinasOnCount} / {totalRegisteredCount}
                    </span>
                  </div>

                  {maquinasOnList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic text-xs">
                      No hay máquinas operativas registradas en este momento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {maquinasOnList.map((mach) => {
                        const st = MASTER_DATA.getStationForMachine(mach) || 'Planta';
                        return (
                          <div
                            key={mach}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-emerald-300 hover:bg-emerald-50/40 transition"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-slate-900 font-mono">
                                Máq. {mach}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                ON
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 truncate" title={st}>
                              {st}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* MODAL: MÁQUINAS DETENIDAS */}
              {activeModal === 'MAQUINAS_DETENIDAS' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Reportes activos en estado Pausado sin mecánico asignado
                    </span>
                    <span className="font-black font-mono bg-amber-100 px-2 py-0.5 rounded text-amber-950">
                      {maquinasDetenidasCount} pendientes
                    </span>
                  </div>

                  {maquinasDetenidasReports.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        ¡Excelente! No hay máquinas detenidas sin mecánico asignado.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Todos los reportes activos cuentan con personal técnico o están en proceso.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {maquinasDetenidasReports.map((r) => {
                        const mach = r.machine || 'Sin Asignar';
                        const st = r.station || MASTER_DATA.getStationForMachine(mach) || 'Estación';
                        const def =
                          r.defect ||
                          (r.defects && r.defects.length > 0 ? r.defects.join(', ') : 'Sin defecto especificado');
                        return (
                          <div
                            key={r.id}
                            className="bg-amber-50/40 border border-amber-200 rounded-xl p-3.5 space-y-2 hover:border-amber-300 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 font-mono bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                                  Máquina {mach}
                                </span>
                                <span className="text-xs font-bold text-slate-700">{st}</span>
                              </div>
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Pausado (Sin Mecánico)
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-amber-100">
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                                  Reporte
                                </span>
                                <span className="font-mono font-bold text-slate-800">
                                  #{r.reportNumber || '---'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                                  Hora Parada
                                </span>
                                <span className="font-mono font-bold text-slate-800">
                                  {r.failureTime || '--:--'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                                  Operario
                                </span>
                                <span className="font-bold text-slate-700 truncate block">
                                  {r.operator || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                                  Mecánico
                                </span>
                                <span className="font-bold text-rose-600 italic">No asignado</span>
                              </div>
                            </div>

                            <div className="text-[11px] bg-white/80 p-2 rounded-lg border border-amber-100 text-slate-700">
                              <span className="text-slate-400 font-bold mr-1">Falla / Defecto:</span>
                              <span className="font-medium">{def}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* MODAL: MÁQUINAS EN PROCESO */}
              {activeModal === 'MAQUINAS_EN_PROCESO' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      Reportes activos atendidos con mecánico asignado
                    </span>
                    <span className="font-black font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-950">
                      {maquinasEnProcesoCount} en proceso
                    </span>
                  </div>

                  {maquinasEnProcesoReports.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                      <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        No hay máquinas en proceso de intervención técnica en este momento.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        No se registran reportes activos con técnicos asignados.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {maquinasEnProcesoReports.map((r) => {
                        const mach = r.machine || 'Sin Asignar';
                        const st = r.station || MASTER_DATA.getStationForMachine(mach) || 'Estación';
                        const def =
                          r.defect ||
                          (r.defects && r.defects.length > 0 ? r.defects.join(', ') : 'Sin defecto reportado');
                        const tech = r.solvingTechnician || r.technician || 'Mecánico asignado';
                        return (
                          <div
                            key={r.id}
                            className="bg-blue-50/40 border border-blue-200 rounded-xl p-3.5 space-y-2 hover:border-blue-300 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900 font-mono bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                                  Máquina {mach}
                                </span>
                                <span className="text-xs font-bold text-slate-700">{st}</span>
                              </div>
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Wrench className="w-3 h-3 text-blue-600" />
                                {r.status === 'PAUSADO' ? 'Pausado c/ Técnico' : 'En Atención Técnica'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-blue-100">
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                                  Reporte
                                </span>
                                <span className="font-mono font-bold text-slate-800">
                                  #{r.reportNumber || '---'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                                  Mecánico Asignado
                                </span>
                                <span className="font-bold text-blue-700 truncate block">
                                  {tech}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                                  H. Parada / Llegada
                                </span>
                                <span className="font-mono font-bold text-slate-800">
                                  {r.failureTime || '--:--'} / {r.technicianArrivalTime || 'En camino'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                                  Estado Flujo
                                </span>
                                <span className="font-bold text-slate-700">
                                  Paso {r.currentStep || 4} de 7
                                </span>
                              </div>
                            </div>

                            <div className="text-[11px] bg-white/80 p-2 rounded-lg border border-blue-100 text-slate-700">
                              <span className="text-slate-400 font-bold mr-1">Falla / Defecto:</span>
                              <span className="font-medium">{def}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PIE DEL MODAL */}
            <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
