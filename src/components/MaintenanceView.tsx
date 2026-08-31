import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, MaintTab, UserSession, ProductionTurnRecord } from '../types.ts';
import { MASTER_DATA } from '../constants/masterData.ts';
import { RecordService } from '../services/recordService.ts';
import { MaintenanceSummaryTab } from './MaintenanceSummaryTab.tsx';
import {
  FileText,
  Activity,
  BarChart3,
  Plus,
  Pause,
  CheckCircle2,
  Trash2,
  Download,
  Clock,
  Save,
  AlertCircle,
  Pencil,
  ArrowRight,
  ArrowLeft,
  Wrench,
  Lock,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface MaintenanceViewProps {
  session: UserSession | null;
  records: MaintenanceRecord[];
  activeTurn?: ProductionTurnRecord | null;
  onOpenTurnModal?: () => void;
  onUpdateRecords: (records: MaintenanceRecord[]) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  session,
  records,
  activeTurn,
  onOpenTurnModal,
  onUpdateRecords
}) => {
  const [activeTab, setActiveTab] = useState<MaintTab>('INGRESAR');
  const [currentRecord, setCurrentRecord] = useState<MaintenanceRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [validationAlert, setValidationAlert] = useState('');
  const [showAutoSave, setShowAutoSave] = useState(false);

  // Form Fields State
  const [machine, setMachine] = useState('');
  const [failureTime, setFailureTime] = useState('');
  const [technicianArrivalTime, setTechnicianArrivalTime] = useState('');
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [customDefect, setCustomDefect] = useState('');
  const [defectFilter, setDefectFilter] = useState('');
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [customSolution, setCustomSolution] = useState('');
  const [solutionFilter, setSolutionFilter] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [solvingTechnician, setSolvingTechnician] = useState('');
  const [effectiveSolution, setEffectiveSolution] = useState<'Sí' | 'No'>('Sí');

  // Calculated times
  const [arrivalTimeMin, setArrivalTimeMin] = useState<number | undefined>(undefined);
  const [repairTimeMin, setRepairTimeMin] = useState<number | undefined>(undefined);
  const [totalDowntimeMin, setTotalDowntimeMin] = useState<number | undefined>(undefined);

  // Global Filters for Panel: SOLO 2 FILTROS PRINCIPALES (Fecha y Estación)
  const [filterDate, setFilterDate] = useState('');
  const [filterStation, setFilterStation] = useState('');

  // Máquinas filtradas dinámicamente por la estación del turno activo
  const userStation = activeTurn?.station || (session?.role === 'Administrador' ? '' : 'Estación 51');
  const availableMachines = userStation
    ? MASTER_DATA.getMachinesForStation(userStation)
    : MASTER_DATA.machines;

  const triggerSaveNotification = () => {
    setShowAutoSave(true);
    setTimeout(() => setShowAutoSave(false), 2000);
  };

  const getNowTimeString = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const compareTimes = (t1: string, t2: string): number => {
    if (!t1 || !t2) return 0;
    const [h1, m1] = t1.split(':').map(Number);
    const [h2, m2] = t2.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    return (h1 * 60 + m1) - (h2 * 60 + m2);
  };

  const calcDiffMin = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    let sMin = sh * 60 + sm;
    let eMin = eh * 60 + em;
    if (eMin < sMin) eMin += 24 * 60;
    return Math.max(0, eMin - sMin);
  };

  // Recalcular métricas de tiempo
  useEffect(() => {
    if (failureTime && technicianArrivalTime) {
      setArrivalTimeMin(calcDiffMin(failureTime, technicianArrivalTime));
    } else {
      setArrivalTimeMin(undefined);
    }

    if (technicianArrivalTime && closingTime) {
      setRepairTimeMin(calcDiffMin(technicianArrivalTime, closingTime));
    } else {
      setRepairTimeMin(undefined);
    }

    if (failureTime && closingTime) {
      setTotalDowntimeMin(calcDiffMin(failureTime, closingTime));
    } else {
      setTotalDowntimeMin(undefined);
    }
  }, [failureTime, technicianArrivalTime, closingTime]);

  const handleStartNewReport = () => {
    const initialMachine = availableMachines[0] || MASTER_DATA.machines[0];
    const initialStation = userStation || MASTER_DATA.getStationForMachine(initialMachine) || 'Estación 51';

    const newReport: MaintenanceRecord = {
      id: 'rec-' + Date.now(),
      reportNumber: 'REP-' + Math.floor(100000 + Math.random() * 900000),
      module: 'MAINTENANCE',
      date: activeTurn?.date || new Date().toISOString().split('T')[0],
      station: initialStation,
      shift: activeTurn?.shift || MASTER_DATA.shifts[0],
      operator: session?.fullName || '',
      machine: initialMachine,
      failureTime: getNowTimeString(),
      status: 'EN_PROCESO'
    };

    setCurrentRecord(newReport);
    setIsFormOpen(true);
    setCurrentStep(1);
    setValidationAlert('');

    setMachine(initialMachine);
    setFailureTime(newReport.failureTime || getNowTimeString());
    setTechnicianArrivalTime('');
    setSelectedDefects([]);
    setCustomDefect('');
    setDefectFilter('');
    setSelectedSolutions([]);
    setCustomSolution('');
    setSolutionFilter('');
    setClosingTime('');
    setSolvingTechnician(MASTER_DATA.technicians[0]);
    setEffectiveSolution('Sí');

    RecordService.saveMaintenanceRecord(newReport).catch((err) => {
      console.error('Error saving new report to Firestore:', err);
    });
    triggerSaveNotification();
  };

  const getEffectiveDefect = () => {
    const parts = [...selectedDefects];
    if (customDefect.trim()) {
      parts.push(customDefect.trim().toUpperCase());
    }
    return parts.join(', ');
  };

  const getEffectiveDefectsList = () => {
    const parts = [...selectedDefects];
    if (customDefect.trim()) {
      parts.push(customDefect.trim().toUpperCase());
    }
    return parts;
  };

  const getEffectiveSolution = () => {
    const parts = [...selectedSolutions];
    if (customSolution.trim()) {
      parts.push(customSolution.trim().toUpperCase());
    }
    return parts.join(', ');
  };

  const getEffectiveSolutionsList = () => {
    const parts = [...selectedSolutions];
    if (customSolution.trim()) {
      parts.push(customSolution.trim().toUpperCase());
    }
    return parts;
  };

  const toggleDefect = (d: string) => {
    setSelectedDefects((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  const toggleSolution = (s: string) => {
    setSelectedSolutions((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const syncCurrentDraft = (extraStatus?: 'EN_PROCESO' | 'PAUSADO' | 'FINALIZADO') => {
    if (!currentRecord) return;
    const finalDef = getEffectiveDefect();
    const finalSol = getEffectiveSolution();
    const defsList = getEffectiveDefectsList();
    const solsList = getEffectiveSolutionsList();
    const currentMachineStation = MASTER_DATA.getStationForMachine(machine) || userStation || 'Estación 51';

    const updated: MaintenanceRecord = {
      ...currentRecord,
      station: currentMachineStation,
      machine,
      failureTime,
      technicianArrivalTime,
      arrivalTimeMin,
      defect: finalDef,
      defects: defsList,
      solution: finalSol,
      solutions: solsList,
      closingTime,
      repairTimeMin,
      totalDowntimeMin,
      solvingTechnician,
      technician: solvingTechnician,
      effectiveSolution,
      status: extraStatus || currentRecord.status
    };

    setCurrentRecord(updated);
    RecordService.saveMaintenanceRecord(updated).catch((err) => {
      console.error('Error saving report to Firestore:', err);
    });
    triggerSaveNotification();
  };

  const handleNextStep = () => {
    setValidationAlert('');
    // Validación por paso individual
    if (currentStep === 1 && !machine) {
      setValidationAlert('Por favor seleccione la máquina.');
      return;
    }
    if (currentStep === 2 && !failureTime) {
      setValidationAlert('Por favor ingrese la hora de parada.');
      return;
    }
    // Paso 3: Defecto Detectado
    if (currentStep === 3) {
      const defs = getEffectiveDefectsList();
      if (defs.length === 0) {
        setValidationAlert('Por favor seleccione al menos un defecto detectado o escriba uno nuevo.');
        return;
      }
    }
    // Paso 4: Hora de Llegada del Mecánico
    if (currentStep === 4) {
      if (!technicianArrivalTime) {
        setValidationAlert('Por favor ingrese la hora de llegada del mecánico.');
        return;
      }
      if (failureTime && compareTimes(technicianArrivalTime, failureTime) < 0) {
        setValidationAlert(`⚠️ La hora de llegada del mecánico (${technicianArrivalTime}) no puede ser menor que la hora de parada (${failureTime}).`);
        return;
      }
    }
    // Paso 5: Solución Aplicada
    if (currentStep === 5) {
      const sols = getEffectiveSolutionsList();
      if (sols.length === 0) {
        setValidationAlert('Por favor seleccione al menos una solución aplicada o escriba una nueva.');
        return;
      }
    }
    // Paso 6: Hora Final de Solución / Cierre
    if (currentStep === 6) {
      if (!closingTime) {
        setValidationAlert('Por favor ingrese la hora final de solución / cierre.');
        return;
      }
      if (failureTime && compareTimes(closingTime, failureTime) < 0) {
        setValidationAlert(`⚠️ La hora de cierre (${closingTime}) no puede ser menor que la hora de parada (${failureTime}).`);
        return;
      }
      if (technicianArrivalTime && compareTimes(closingTime, technicianArrivalTime) < 0) {
        setValidationAlert(`⚠️ La hora de cierre (${closingTime}) no puede ser menor que la hora de llegada del mecánico (${technicianArrivalTime}).`);
        return;
      }
    }

    syncCurrentDraft('EN_PROCESO');
    setCurrentStep((prev) => Math.min(7, prev + 1));
  };

  const handlePrevStep = () => {
    setValidationAlert('');
    syncCurrentDraft('EN_PROCESO');
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handlePauseReport = () => {
    if (!currentRecord) return;
    syncCurrentDraft('PAUSADO');
    setIsFormOpen(false);
    setCurrentRecord(null);
  };

  const handleFinalizeReport = () => {
    setValidationAlert('');
    const finalDef = getEffectiveDefect();
    const finalSol = getEffectiveSolution();
    const defsList = getEffectiveDefectsList();
    const solsList = getEffectiveSolutionsList();

    // Validación de campos vacíos en el paso final
    if (!machine || !failureTime || !technicianArrivalTime || defsList.length === 0 || solsList.length === 0 || !closingTime || !solvingTechnician) {
      setValidationAlert('Existen campos sin diligenciar. Por favor complete todos los pasos antes de finalizar.');
      return;
    }

    // Validación de coherencia de horas
    if (compareTimes(technicianArrivalTime, failureTime) < 0) {
      setValidationAlert(`⚠️ La hora de llegada del mecánico (${technicianArrivalTime}) no puede ser menor que la hora de parada (${failureTime}).`);
      return;
    }

    if (compareTimes(closingTime, failureTime) < 0) {
      setValidationAlert(`⚠️ La hora de cierre (${closingTime}) no puede ser menor que la hora de parada (${failureTime}).`);
      return;
    }

    if (compareTimes(closingTime, technicianArrivalTime) < 0) {
      setValidationAlert(`⚠️ La hora de cierre (${closingTime}) no puede ser menor que la hora de llegada del mecánico (${technicianArrivalTime}).`);
      return;
    }

    if (!currentRecord) return;
    const currentMachineStation = MASTER_DATA.getStationForMachine(machine) || userStation || 'Estación 51';

    const finalized: MaintenanceRecord = {
      ...currentRecord,
      station: currentMachineStation,
      machine,
      failureTime,
      technicianArrivalTime,
      arrivalTimeMin,
      defect: finalDef,
      defects: defsList,
      solution: finalSol,
      solutions: solsList,
      closingTime,
      repairTimeMin,
      totalDowntimeMin,
      solvingTechnician,
      technician: solvingTechnician,
      effectiveSolution,
      status: 'FINALIZADO'
    };

    RecordService.saveMaintenanceRecord(finalized).catch((err) => {
      console.error('Error saving finalized report to Firestore:', err);
    });

    setIsFormOpen(false);
    setCurrentRecord(null);
  };

  const handleResumeReport = (rec: MaintenanceRecord) => {
    setCurrentRecord(rec);
    setIsFormOpen(true);
    setCurrentStep(1);
    setValidationAlert('');

    setMachine(rec.machine || availableMachines[0] || MASTER_DATA.machines[0]);
    setFailureTime(rec.failureTime || getNowTimeString());
    setTechnicianArrivalTime(rec.technicianArrivalTime || '');

    // Cargar defectos (array o cadena separada por comas)
    if (rec.defects && rec.defects.length > 0) {
      const known = rec.defects.filter((d) => MASTER_DATA.defects.includes(d));
      const custom = rec.defects.filter((d) => !MASTER_DATA.defects.includes(d)).join(', ');
      setSelectedDefects(known);
      setCustomDefect(custom);
    } else if (rec.defect) {
      const parts = rec.defect.split(',').map((s) => s.trim());
      const known = parts.filter((d) => MASTER_DATA.defects.includes(d));
      const custom = parts.filter((d) => !MASTER_DATA.defects.includes(d)).join(', ');
      setSelectedDefects(known);
      setCustomDefect(custom);
    } else {
      setSelectedDefects([]);
      setCustomDefect('');
    }

    // Cargar soluciones (array o cadena separada por comas)
    if (rec.solutions && rec.solutions.length > 0) {
      const known = rec.solutions.filter((s) => MASTER_DATA.solutions.includes(s));
      const custom = rec.solutions.filter((s) => !MASTER_DATA.solutions.includes(s)).join(', ');
      setSelectedSolutions(known);
      setCustomSolution(custom);
    } else if (rec.solution) {
      const parts = rec.solution.split(',').map((s) => s.trim());
      const known = parts.filter((s) => MASTER_DATA.solutions.includes(s));
      const custom = parts.filter((s) => !MASTER_DATA.solutions.includes(s)).join(', ');
      setSelectedSolutions(known);
      setCustomSolution(custom);
    } else {
      setSelectedSolutions([]);
      setCustomSolution('');
    }

    setClosingTime(rec.closingTime || '');
    setSolvingTechnician(rec.solvingTechnician || rec.technician || MASTER_DATA.technicians[0]);
    setEffectiveSolution(rec.effectiveSolution || 'Sí');
  };

  const handleDeleteReport = async (id: string) => {
    if (session?.role !== 'Administrador') {
      alert('Acción restringida: solo los usuarios administradores pueden eliminar reportes.');
      return;
    }
    if (window.confirm('¿Está seguro de eliminar este reporte de mantenimiento?')) {
      try {
        await RecordService.deleteMaintenanceRecord(id);
        if (currentRecord?.id === id) {
          setIsFormOpen(false);
          setCurrentRecord(null);
        }
      } catch (e) {
        alert('Error al eliminar el reporte de la base de datos.');
      }
    }
  };

  // CONTROL DE ROLES (RBAC) PARA EL PANEL EN VIVO:
  // Usuario corriente: solo registros ingresados por él mismo durante su turno
  // Administrador: ve toda la información en tiempo real de todos los usuarios
  const roleFilteredRecords = records.filter((r) => {
    if (session?.role === 'Administrador') return true;
    const curName = session?.fullName?.trim().toUpperCase();
    const curUser = session?.user?.trim().toUpperCase();
    const recOperator = r.operator?.trim().toUpperCase();
    return recOperator === curName || recOperator === curUser;
  });

  // FILTROS GLOBALES: Por Fecha y Por Estación
  const liveTableRecords = roleFilteredRecords.filter((r) => {
    if (filterDate && r.date !== filterDate) return false;
    if (filterStation) {
      const recStation = r.station || MASTER_DATA.getStationForMachine(r.machine || '') || '';
      if (recStation !== filterStation) return false;
    }
    return true;
  });

  // Reportes pausados del usuario actual
  const userPausedReports = roleFilteredRecords.filter((r) => r.status === 'PAUSADO');

  // Si el usuario no ha iniciado turno, mostrar pantalla de bloqueo en Mantenimiento
  if (!activeTurn) {
    return (
      <section className="max-w-2xl w-full mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 my-auto">
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-200">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
            MÓDULO DE MANTENIMIENTO BLOQUEADO
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Debe registrar e iniciar su turno de producción en la pantalla de inicio antes de ingresar reportes de mantenimiento.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <button
            onClick={onOpenTurnModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Iniciar Registro de Turno
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="viewMaintenance" className="w-full space-y-4 animate-in fade-in">
      {/* HEADER DE MANTENIMIENTO & TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-maint-600 text-white rounded-xl shadow-md">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
              REGISTRO DE MANTENIMIENTO
            </h2>
            <p className="text-[11px] text-slate-500">
              Estación activa: <strong className="text-maint-700 font-bold">{userStation}</strong> | Operario: {session?.fullName}
            </p>
          </div>
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
          <button
            id="tab-maint-ingresar"
            onClick={() => setActiveTab('INGRESAR')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'INGRESAR'
                ? 'bg-maint-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Ingresar Datos
          </button>
          <button
            id="tab-maint-live"
            onClick={() => setActiveTab('LIVE')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'LIVE'
                ? 'bg-maint-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Panel en Vivo
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {liveTableRecords.length}
            </span>
          </button>
          {session?.role === 'Administrador' && (
            <button
              id="tab-maint-resumen"
              onClick={() => setActiveTab('RESUMEN')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'RESUMEN' || activeTab === 'DASHBOARD'
                  ? 'bg-maint-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Resumen
            </button>
          )}
        </div>
      </div>

      {/* AUTO-SAVE BADGE */}
      {showAutoSave && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-50 animate-in fade-in">
          <Save className="w-3.5 h-3.5" /> Sincronizado en tiempo real
        </div>
      )}

      {/* TAB 1: INGRESAR DATOS (FLUJO PASO A PASO / WIZARD) */}
      {activeTab === 'INGRESAR' && (
        <div className="space-y-4">
          {!isFormOpen ? (
            /* VISTA INICIAL: SOLO TÍTULO "REGISTRO DE MANTENIMIENTO" Y BOTÓN "NUEVO REPORTE" */
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6 max-w-xl mx-auto">
              <div className="w-14 h-14 bg-maint-50 text-maint-600 rounded-2xl flex items-center justify-center mx-auto border border-maint-200 shadow-sm">
                <Wrench className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  REGISTRO DE MANTENIMIENTO
                </h3>
                <p className="text-xs text-slate-500">
                  Estación asignada: <strong className="text-slate-800">{userStation}</strong>
                </p>
              </div>

              <button
                id="btn-nuevo-reporte-maint"
                onClick={handleStartNewReport}
                className="w-full bg-maint-600 hover:bg-maint-700 text-white font-black py-3.5 px-6 rounded-xl text-xs uppercase shadow-md hover:shadow-maint-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                NUEVO REPORTE
              </button>

              {/* SECCIÓN DE REPORTES PAUSADOS */}
              <div className="border-t border-slate-100 pt-5 text-left space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Pause className="w-3.5 h-3.5 text-amber-500" />
                  Reportes Pausados / En Espera
                </h4>

                {userPausedReports.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                    No hay ningún reporte de mantenimiento abierto actualmente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userPausedReports.map((p) => (
                      <div
                        key={p.id}
                        className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-900">{p.reportNumber}</span>
                            <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                              Máq. {p.machine}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-600 text-[11px]">{p.station}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Parada: <strong>{p.failureTime}</strong> | Falla: {p.defect || 'Por definir'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleResumeReport(p)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Reanudar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* FORMULARIO PASO A PASO (WIZARD 1 A 7) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto overflow-hidden">
              {/* ENCABEZADO DEL WIZARD CON PAUSAR Y ESTADO EN VIVO */}
              <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-maint-600 text-white text-xs font-black px-2 py-0.5 rounded-md">
                    PASO {currentStep} DE 7
                  </span>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wide">
                      {currentStep === 1 && '1. Selección de Máquina'}
                      {currentStep === 2 && '2. Hora de Parada'}
                      {currentStep === 3 && '3. Defecto Detectado'}
                      {currentStep === 4 && '4. Hora de Llegada del Mecánico'}
                      {currentStep === 5 && '5. Solución Aplicada'}
                      {currentStep === 6 && '6. Hora Final de Solución'}
                      {currentStep === 7 && '7. Mecánico y Efectividad'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Reporte: {currentRecord?.reportNumber} | {userStation}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePauseReport}
                  className="bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Pausar reporte para completarlo más tarde"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pausar</span>
                </button>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full bg-slate-100 h-1.5">
                <div
                  className="bg-maint-600 h-1.5 transition-all duration-300"
                  style={{ width: `${(currentStep / 7) * 100}%` }}
                ></div>
              </div>

              {/* MENSAJE DE VALIDACIÓN */}
              {validationAlert && (
                <div
                  id="maintValidationAlert"
                  className="m-4 p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-2 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {validationAlert}
                </div>
              )}

              {/* CUERPO DEL PASO ACTUAL */}
              <div className="p-6 space-y-4 text-left">
                {/* PASO 1: MÁQUINA COMO GRUPO DE CHIPS / ETIQUETAS (SOLO EL NÚMERO) */}
                {currentStep === 1 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Máquina ({userStation}) *
                      </label>
                      {machine && (
                        <span className="text-[11px] font-bold text-maint-700 bg-maint-50 px-2 py-0.5 rounded border border-maint-200">
                          Seleccionada: {machine}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {availableMachines.map((m) => {
                        const isSelected = machine === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            id={`chip-machine-${m}`}
                            onClick={() => {
                              setMachine(m);
                              setValidationAlert('');
                            }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer border ${
                              isSelected
                                ? 'bg-maint-600 text-white border-maint-600 shadow-md ring-2 ring-maint-400/40 scale-105'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 hover:border-slate-300'
                            }`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">
                      Toque el número de la máquina donde se presentó la novedad.
                    </p>
                  </div>
                )}

                {/* PASO 2: HORA DE PARADA */}
                {currentStep === 2 && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Hora de Parada *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        id="maintInpFailureTime"
                        value={failureTime}
                        onChange={(e) => {
                          setFailureTime(e.target.value);
                          setValidationAlert('');
                        }}
                        required
                        className="w-full border border-slate-300 p-3 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFailureTime(getNowTimeString());
                          setValidationAlert('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs uppercase shrink-0 transition"
                      >
                        Hora Actual
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Momento exacto en que la máquina detuvo su operación por falla o atasco.
                    </p>
                  </div>
                )}

                {/* PASO 3: DEFECTO DETECTADO (GRUPO DE CHIPS / ETIQUETAS CON SELECCIÓN MÚLTIPLE) */}
                {currentStep === 3 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Defecto Detectado (Selección Múltiple) *
                      </label>
                      <span className="text-[11px] font-bold text-maint-700 bg-maint-50 px-2 py-0.5 rounded border border-maint-200">
                        {selectedDefects.length} seleccionados
                      </span>
                    </div>

                    {/* Filtro rápido para defectos */}
                    <input
                      type="text"
                      value={defectFilter}
                      onChange={(e) => setDefectFilter(e.target.value)}
                      placeholder="🔍 Filtrar defectos (ej: V1, BORDE, PUNTA...)"
                      className="w-full border border-slate-200 p-2 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-maint-600 focus:outline-none"
                    />

                    {/* Contenedor de Chips de Defectos */}
                    <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                      {MASTER_DATA.defects
                        .filter((d) =>
                          d.toLowerCase().includes(defectFilter.toLowerCase())
                        )
                        .map((d) => {
                          const isSelected = selectedDefects.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                toggleDefect(d);
                                setValidationAlert('');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs text-left font-bold transition cursor-pointer border ${
                                isSelected
                                  ? 'bg-maint-600 text-white border-maint-600 shadow-xs'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{d}
                            </button>
                          );
                        })}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        O escribir defecto adicional (si no está en la lista):
                      </label>
                      <input
                        type="text"
                        id="maintInpCustomDefect"
                        value={customDefect}
                        onChange={(e) => {
                          setCustomDefect(e.target.value.toUpperCase());
                          setValidationAlert('');
                        }}
                        placeholder="Escriba aquí si desea especificar otro defecto..."
                        className="w-full border border-slate-300 p-2.5 rounded-lg text-xs uppercase font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* PASO 4: HORA DE LLEGADA DEL MECÁNICO (LIMPIO, SIN CUADROS DE ESPERA) */}
                {currentStep === 4 && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Hora de Llegada del Mecánico *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        id="maintInpArrivalTime"
                        value={technicianArrivalTime}
                        onChange={(e) => {
                          setTechnicianArrivalTime(e.target.value);
                          setValidationAlert('');
                        }}
                        required
                        className="w-full border border-slate-300 p-3 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setTechnicianArrivalTime(getNowTimeString());
                          setValidationAlert('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs uppercase shrink-0 transition"
                      >
                        Hora Actual
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Momento exacto en que el mecánico o técnico se presentó en la máquina.
                    </p>
                  </div>
                )}

                {/* PASO 5: SOLUCIÓN APLICADA (GRUPO DE CHIPS / ETIQUETAS CON SELECCIÓN MÚLTIPLE) */}
                {currentStep === 5 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Solución Aplicada (Selección Múltiple) *
                      </label>
                      <span className="text-[11px] font-bold text-maint-700 bg-maint-50 px-2 py-0.5 rounded border border-maint-200">
                        {selectedSolutions.length} seleccionadas
                      </span>
                    </div>

                    {/* Filtro rápido para soluciones */}
                    <input
                      type="text"
                      value={solutionFilter}
                      onChange={(e) => setSolutionFilter(e.target.value)}
                      placeholder="🔍 Filtrar soluciones (ej: S1, CUADRE, CAMBIO, LIMPIEZA...)"
                      className="w-full border border-slate-200 p-2 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-maint-600 focus:outline-none"
                    />

                    {/* Contenedor de Chips de Soluciones */}
                    <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                      {MASTER_DATA.solutions
                        .filter((s) =>
                          s.toLowerCase().includes(solutionFilter.toLowerCase())
                        )
                        .map((s) => {
                          const isSelected = selectedSolutions.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                toggleSolution(s);
                                setValidationAlert('');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs text-left font-bold transition cursor-pointer border ${
                                isSelected
                                  ? 'bg-maint-600 text-white border-maint-600 shadow-xs'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{s}
                            </button>
                          );
                        })}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        O escribir solución adicional (si no está en la lista):
                      </label>
                      <input
                        type="text"
                        id="maintInpCustomSolution"
                        value={customSolution}
                        onChange={(e) => {
                          setCustomSolution(e.target.value.toUpperCase());
                          setValidationAlert('');
                        }}
                        placeholder="Escriba aquí si desea especificar otra solución..."
                        className="w-full border border-slate-300 p-2.5 rounded-lg text-xs uppercase font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* PASO 6: HORA FINAL DE SOLUCIÓN / CIERRE (LIMPIO) */}
                {currentStep === 6 && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Hora Final de Solución / Cierre *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        id="maintInpClosingTime"
                        value={closingTime}
                        onChange={(e) => {
                          setClosingTime(e.target.value);
                          setValidationAlert('');
                        }}
                        required
                        className="w-full border border-slate-300 p-3 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setClosingTime(getNowTimeString());
                          setValidationAlert('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs uppercase shrink-0 transition"
                      >
                        Hora Actual
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Momento en que la máquina quedó reparada y lista para continuar producción.
                    </p>
                  </div>
                )}

                {/* PASO 7: MECÁNICO Y SOLUCIÓN EFECTIVA */}
                {currentStep === 7 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Mecánico Responsable *
                      </label>
                      <select
                        id="maintInpTech"
                        value={solvingTechnician}
                        onChange={(e) => setSolvingTechnician(e.target.value)}
                        required
                        className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      >
                        {MASTER_DATA.technicians.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                        ¿Solución Efectiva? *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          id="btn-solucion-efectiva-si"
                          onClick={() => setEffectiveSolution('Sí')}
                          className={`p-3 rounded-xl border font-black text-xs uppercase flex items-center justify-center gap-2 transition cursor-pointer ${
                            effectiveSolution === 'Sí'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Sí
                        </button>
                        <button
                          type="button"
                          id="btn-solucion-efectiva-no"
                          onClick={() => setEffectiveSolution('No')}
                          className={`p-3 rounded-xl border font-black text-xs uppercase flex items-center justify-center gap-2 transition cursor-pointer ${
                            effectiveSolution === 'No'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTONES DE NAVEGACIÓN PASO A PASO (ATRÁS / SIGUIENTE / FINALIZAR) */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <button
                  type="button"
                  id="btn-wizard-maint-prev"
                  onClick={handlePrevStep}
                  disabled={currentStep === 1}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>

                {currentStep < 7 ? (
                  <button
                    type="button"
                    id="btn-wizard-maint-next"
                    onClick={handleNextStep}
                    className="bg-maint-600 hover:bg-maint-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    Siguiente <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-wizard-maint-finish"
                    onClick={handleFinalizeReport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Finalizar Reporte
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PANEL EN VIVO (MANTENIMIENTO) */}
      {activeTab === 'LIVE' && (
        <div className="space-y-4">
          {/* FILTROS GLOBALES: SOLO DOS FILTROS PRINCIPALES (POR FECHA Y POR ESTACIÓN) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
              {/* FILTRO 1: POR FECHA */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Filtrar por Fecha
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="filterMaintDate"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none pl-8"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* FILTRO 2: POR ESTACIÓN */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Filtrar por Estación
                </label>
                <div className="relative">
                  <select
                    id="filterMaintStation"
                    value={filterStation}
                    onChange={(e) => setFilterStation(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-maint-600 focus:outline-none pl-8 min-w-[170px]"
                  >
                    <option value="">Todas las Estaciones</option>
                    {MASTER_DATA.stations.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {(filterDate || filterStation) && (
                <button
                  onClick={() => {
                    setFilterDate('');
                    setFilterStation('');
                  }}
                  className="text-xs text-maint-600 hover:underline font-bold px-2 py-1"
                >
                  Limpiar Filtros
                </button>
              )}
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-full border border-slate-200">
                {liveTableRecords.length} Registros
              </span>
            </div>
          </div>

          {/* TABLA EN VIVO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3">Reporte</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Estación</th>
                    <th className="p-3">Máquina</th>
                    <th className="p-3">Hora Parada</th>
                    <th className="p-3">Defecto</th>
                    <th className="p-3">Solución</th>
                    <th className="p-3">Mecánico</th>
                    <th className="p-3">Efectiva</th>
                    <th className="p-3">T. Muerto</th>
                    <th className="p-3">Estado</th>
                    {session?.role === 'Administrador' && <th className="p-3 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveTableRecords.length === 0 ? (
                    <tr>
                      <td colSpan={session?.role === 'Administrador' ? 12 : 11} className="p-8 text-center text-slate-400">
                        No hay reportes de mantenimiento para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    liveTableRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-slate-900">{r.reportNumber}</td>
                        <td className="p-3 font-medium text-slate-600">{r.date}</td>
                        <td className="p-3 font-semibold text-slate-800">
                          {r.station || MASTER_DATA.getStationForMachine(r.machine || '') || 'Estación'}
                        </td>
                        <td className="p-3 font-bold text-maint-700 bg-maint-50/50">Máq. {r.machine}</td>
                        <td className="p-3 font-mono text-slate-700">{r.failureTime}</td>
                        <td className="p-3 max-w-[150px] truncate text-slate-700" title={r.defect}>
                          {r.defect || '--'}
                        </td>
                        <td className="p-3 max-w-[150px] truncate text-slate-700" title={r.solution}>
                          {r.solution || '--'}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{r.solvingTechnician || r.technician || '--'}</td>
                        <td className="p-3">
                          {r.effectiveSolution === 'Sí' ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Sí
                            </span>
                          ) : (
                            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              No
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">
                          {r.totalDowntimeMin !== undefined ? `${r.totalDowntimeMin} min` : '--'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'FINALIZADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'PAUSADO'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        {session?.role === 'Administrador' && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteReport(r.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Eliminar reporte (Solo Administrador)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RESUMEN (SOLO ADMINISTRADORES) */}
      {(activeTab === 'RESUMEN' || activeTab === 'DASHBOARD') && session?.role === 'Administrador' && (
        <MaintenanceSummaryTab records={records} />
      )}
    </section>
  );
};
