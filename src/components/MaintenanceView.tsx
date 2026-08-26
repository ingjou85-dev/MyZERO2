import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, MaintTab, UserSession } from '../types.ts';
import { MASTER_DATA } from '../constants/masterData.ts';
import { RecordService } from '../services/recordService.ts';
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
  Check
} from 'lucide-react';

interface MaintenanceViewProps {
  session: UserSession | null;
  records: MaintenanceRecord[];
  onUpdateRecords: (records: MaintenanceRecord[]) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  session,
  records,
  onUpdateRecords
}) => {
  const [activeTab, setActiveTab] = useState<MaintTab>('INGRESAR');
  const [currentRecord, setCurrentRecord] = useState<MaintenanceRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [validationAlert, setValidationAlert] = useState('');
  const [showAutoSave, setShowAutoSave] = useState(false);

  // Form Fields State
  const [operator, setOperator] = useState('');
  const [shift, setShift] = useState(MASTER_DATA.shifts[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [technician, setTechnician] = useState('');
  const [machine, setMachine] = useState('');
  const [reference, setReference] = useState('');

  // Tiempos
  const [failureTime, setFailureTime] = useState('');
  const [technicianArrivalTime, setTechnicianArrivalTime] = useState('');
  const [arrivalTimeMin, setArrivalTimeMin] = useState<number | undefined>(undefined);

  // Selección Múltiple de Defectos
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [customDefect, setCustomDefect] = useState('');
  const [showCustomDefectInput, setShowCustomDefectInput] = useState(false);

  // Selección Múltiple de Soluciones
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [customSolution, setCustomSolution] = useState('');
  const [showCustomSolutionInput, setShowCustomSolutionInput] = useState(false);

  // Cierre y Resolución
  const [closingTime, setClosingTime] = useState('');
  const [repairTimeMin, setRepairTimeMin] = useState<number | undefined>(undefined);
  const [totalDowntimeMin, setTotalDowntimeMin] = useState<number | undefined>(undefined);
  const [solvingTechnician, setSolvingTechnician] = useState('');

  // Table Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMachine, setFilterMachine] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const triggerSaveNotification = () => {
    setShowAutoSave(true);
    setTimeout(() => setShowAutoSave(false), 2000);
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

  const getNowTimeString = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Recalcular tiempos automáticamente en cambios
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
    const newReport: MaintenanceRecord = {
      id: 'rec-' + Date.now(),
      reportNumber: 'REP-' + Math.floor(100000 + Math.random() * 900000),
      module: 'MAINTENANCE',
      date: new Date().toISOString().split('T')[0],
      shift: MASTER_DATA.shifts[0],
      operator: session?.fullName || '',
      status: 'EN_PROCESO'
    };

    // Guardado inicial y sync en vivo
    setCurrentRecord(newReport);
    setIsFormOpen(true);
    setValidationAlert('');

    setOperator(session?.fullName || '');
    setShift(MASTER_DATA.shifts[0]);
    setDate(newReport.date);
    setTechnician('');
    setMachine('');
    setReference('');

    setFailureTime(getNowTimeString());
    setTechnicianArrivalTime('');
    setArrivalTimeMin(undefined);

    setSelectedDefects([]);
    setCustomDefect('');
    setShowCustomDefectInput(false);

    setSelectedSolutions([]);
    setCustomSolution('');
    setShowCustomSolutionInput(false);

    setClosingTime('');
    setRepairTimeMin(undefined);
    setTotalDowntimeMin(undefined);
    setSolvingTechnician('');

    RecordService.saveMaintenanceRecord(newReport).catch((err) => {
      console.error('Error saving new report to Firestore:', err);
    });
    triggerSaveNotification();
  };

  const toggleDefectSelection = (def: string) => {
    setSelectedDefects((prev) => {
      const exists = prev.includes(def);
      const next = exists ? prev.filter((d) => d !== def) : [...prev, def];
      syncFormStateToRecord({ defects: next });
      return next;
    });
  };

  const toggleSolutionSelection = (sol: string) => {
    setSelectedSolutions((prev) => {
      const exists = prev.includes(sol);
      const next = exists ? prev.filter((s) => s !== sol) : [...prev, sol];
      syncFormStateToRecord({ solutions: next });
      return next;
    });
  };

  // Sync en vivo de cambios al registro
  const syncFormStateToRecord = (overrideFields: Partial<MaintenanceRecord> = {}) => {
    if (!currentRecord) return;

    const allDefects = [...selectedDefects];
    if (customDefect.trim() && !allDefects.includes(customDefect.trim().toUpperCase())) {
      allDefects.push(customDefect.trim().toUpperCase());
    }

    const allSolutions = [...selectedSolutions];
    if (customSolution.trim() && !allSolutions.includes(customSolution.trim().toUpperCase())) {
      allSolutions.push(customSolution.trim().toUpperCase());
    }

    const updated: MaintenanceRecord = {
      ...currentRecord,
      operator: operator.trim().toUpperCase(),
      shift,
      date,
      technician,
      machine,
      reference,
      failureTime,
      technicianArrivalTime,
      arrivalTimeMin,
      defects: allDefects,
      defect: allDefects.join(', '),
      solutions: allSolutions,
      solution: allSolutions.join(', '),
      closingTime,
      repairTimeMin,
      totalDowntimeMin,
      solvingTechnician,
      ...overrideFields
    };

    setCurrentRecord(updated);
    RecordService.saveMaintenanceRecord(updated).catch((err) => {
      console.error('Error saving updated report to Firestore:', err);
    });
  };

  const handlePauseReport = () => {
    if (!currentRecord) return;
    const allDefects = [...selectedDefects];
    if (customDefect.trim()) allDefects.push(customDefect.trim().toUpperCase());
    const allSolutions = [...selectedSolutions];
    if (customSolution.trim()) allSolutions.push(customSolution.trim().toUpperCase());

    const paused: MaintenanceRecord = {
      ...currentRecord,
      operator: operator.trim().toUpperCase(),
      shift,
      date,
      technician,
      machine,
      reference,
      failureTime,
      technicianArrivalTime,
      arrivalTimeMin,
      defects: allDefects,
      defect: allDefects.join(', '),
      solutions: allSolutions,
      solution: allSolutions.join(', '),
      closingTime,
      repairTimeMin,
      totalDowntimeMin,
      solvingTechnician,
      status: 'PAUSADO'
    };

    RecordService.saveMaintenanceRecord(paused).catch((err) => {
      console.error('Error saving paused report to Firestore:', err);
    });
    setIsFormOpen(false);
    setCurrentRecord(null);
  };

  const handleFinalizeReport = () => {
    if (!currentRecord) return;

    if (!operator.trim()) {
      setValidationAlert('Por favor ingrese el nombre del operario.');
      return;
    }
    if (!technician) {
      setValidationAlert('Por favor seleccione el técnico responsable.');
      return;
    }
    if (!machine) {
      setValidationAlert('Por favor seleccione la máquina.');
      return;
    }
    if (!failureTime) {
      setValidationAlert('Por favor especifique la hora de inicio de la falla.');
      return;
    }
    if (!technicianArrivalTime) {
      setValidationAlert('Por favor especifique la hora de llegada del técnico.');
      return;
    }
    const allDefects = [...selectedDefects];
    if (customDefect.trim()) allDefects.push(customDefect.trim().toUpperCase());
    if (allDefects.length === 0) {
      setValidationAlert('Por favor seleccione o describa al menos un defecto detectado.');
      return;
    }
    const allSolutions = [...selectedSolutions];
    if (customSolution.trim()) allSolutions.push(customSolution.trim().toUpperCase());
    if (allSolutions.length === 0) {
      setValidationAlert('Por favor seleccione o describa al menos una solución aplicada.');
      return;
    }
    if (!closingTime) {
      setValidationAlert('Por favor especifique la hora de solución / cierre.');
      return;
    }
    if (!solvingTechnician) {
      setValidationAlert('Por favor seleccione el técnico que solucionó la falla.');
      return;
    }

    setValidationAlert('');

    const finalized: MaintenanceRecord = {
      ...currentRecord,
      operator: operator.trim().toUpperCase(),
      shift,
      date,
      technician,
      machine,
      reference,
      failureTime,
      technicianArrivalTime,
      arrivalTimeMin,
      defects: allDefects,
      defect: allDefects.join(', '),
      solutions: allSolutions,
      solution: allSolutions.join(', '),
      closingTime,
      repairTimeMin,
      totalDowntimeMin,
      solvingTechnician,
      status: 'FINALIZADO'
    };

    RecordService.saveMaintenanceRecord(finalized).catch((err) => {
      console.error('Error saving finalized report to Firestore:', err);
    });
    setIsFormOpen(false);
    setCurrentRecord(null);
  };

  const handleContinueOrEditReport = (rec: MaintenanceRecord) => {
    setCurrentRecord(rec);
    setIsFormOpen(true);
    setValidationAlert('');

    setOperator(rec.operator || '');
    setShift(rec.shift || MASTER_DATA.shifts[0]);
    setDate(rec.date || new Date().toISOString().split('T')[0]);
    setTechnician(rec.technician || '');
    setMachine(rec.machine || '');
    setReference(rec.reference || '');

    setFailureTime(rec.failureTime || '');
    setTechnicianArrivalTime(rec.technicianArrivalTime || '');
    setArrivalTimeMin(rec.arrivalTimeMin);

    // Defectos
    const defArray = rec.defects || (rec.defect ? rec.defect.split(',').map((s) => s.trim()) : []);
    const standardDefects = defArray.filter((d) => MASTER_DATA.defects.includes(d));
    const extraDefects = defArray.filter((d) => !MASTER_DATA.defects.includes(d));
    setSelectedDefects(standardDefects);
    if (extraDefects.length > 0) {
      setCustomDefect(extraDefects.join(', '));
      setShowCustomDefectInput(true);
    } else {
      setCustomDefect('');
      setShowCustomDefectInput(false);
    }

    // Soluciones
    const solArray = rec.solutions || (rec.solution ? rec.solution.split(',').map((s) => s.trim()) : []);
    const standardSolutions = solArray.filter((s) => MASTER_DATA.solutions.includes(s));
    const extraSolutions = solArray.filter((s) => !MASTER_DATA.solutions.includes(s));
    setSelectedSolutions(standardSolutions);
    if (extraSolutions.length > 0) {
      setCustomSolution(extraSolutions.join(', '));
      setShowCustomSolutionInput(true);
    } else {
      setCustomSolution('');
      setShowCustomSolutionInput(false);
    }

    setClosingTime(rec.closingTime || '');
    setRepairTimeMin(rec.repairTimeMin);
    setTotalDowntimeMin(rec.totalDowntimeMin);
    setSolvingTechnician(rec.solvingTechnician || '');

    // Cambiar a la pestaña de ingresar datos para editar
    setActiveTab('INGRESAR');
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

  const filteredRecords = records.filter((r) => {
    const s = filterSearch.toLowerCase();
    const matchSearch =
      !s ||
      r.reportNumber.toLowerCase().includes(s) ||
      (r.operator && r.operator.toLowerCase().includes(s)) ||
      (r.machine && r.machine.toLowerCase().includes(s));
    const matchMachine = !filterMachine || r.machine === filterMachine;
    const matchTech = !filterTechnician || r.technician === filterTechnician;
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchDate = !filterDate || r.date === filterDate;
    return matchSearch && matchMachine && matchTech && matchStatus && matchDate;
  });

  // Metrics for Dashboard
  const finalizedRecords = records.filter((r) => r.status === 'FINALIZADO');
  const inProcessCount = records.filter((r) => r.status === 'EN_PROCESO').length;
  const pausedCount = records.filter((r) => r.status === 'PAUSADO').length;

  const avgArrival = finalizedRecords.length
    ? Math.round(
        finalizedRecords.reduce((acc, r) => acc + (r.arrivalTimeMin || 0), 0) /
          finalizedRecords.length
      )
    : 0;

  const avgRepair = finalizedRecords.length
    ? Math.round(
        finalizedRecords.reduce((acc, r) => acc + (r.repairTimeMin || 0), 0) /
          finalizedRecords.length
      )
    : 0;

  const totalDowntime = records.reduce(
    (acc, r) => acc + (r.totalDowntimeMin || 0),
    0
  );

  // Machine Downtime Distribution
  const machineDowntimeMap: { [key: string]: number } = {};
  records.forEach((r) => {
    if (r.machine) {
      machineDowntimeMap[r.machine] =
        (machineDowntimeMap[r.machine] || 0) + (r.totalDowntimeMin || 1);
    }
  });
  const topMachines = Object.entries(machineDowntimeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxMachineDowntime = Math.max(...topMachines.map((m) => m[1]), 1);

  // Defects Frequency
  const defectCountMap: { [key: string]: number } = {};
  records.forEach((r) => {
    const list = r.defects || (r.defect ? [r.defect] : []);
    list.forEach((d) => {
      defectCountMap[d] = (defectCountMap[d] || 0) + 1;
    });
  });
  const topDefects = Object.entries(defectCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxDefectCount = Math.max(...topDefects.map((d) => d[1]), 1);

  return (
    <section id="viewMaintenance" className="space-y-6 max-w-6xl mx-auto w-full">
      {/* PESTAÑAS NAVEGACIÓN INTERNA MANTENIMIENTO */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm flex flex-wrap gap-1">
        <button
          id="tabBtnMaintIngresar"
          onClick={() => setActiveTab('INGRESAR')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${
            activeTab === 'INGRESAR'
              ? 'bg-maint-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Ingresar Datos
        </button>
        <button
          id="tabBtnMaintLive"
          onClick={() => setActiveTab('LIVE')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${
            activeTab === 'LIVE'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          Panel en Vivo
        </button>
        <button
          id="tabBtnMaintDash"
          onClick={() => setActiveTab('DASHBOARD')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${
            activeTab === 'DASHBOARD'
              ? 'bg-maint-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: INGRESAR DATOS (FORMULARIO DIRECTO Y UNIFICADO) */}
      {activeTab === 'INGRESAR' && (
        <div id="maintTabIngresar" className="space-y-6">
          {/* HEADER MÓDULO */}
          <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase">
                REGISTRO DE MANTENIMIENTO CORRECTIVO
              </h2>
              <p className="text-xs text-slate-500">
                Formulario directo en una sola interfaz con selección múltiple y actualización en vivo
              </p>
            </div>
            <button
              id="btnNewMaint"
              onClick={handleStartNewReport}
              className="bg-maint-600 hover:bg-maint-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Nuevo Reporte
            </button>
          </div>

          {/* FORMULARIO DIRECTO UNIFICADO (SIN ETAPAS POR PASOS SEPARADOS) */}
          {isFormOpen && currentRecord ? (
            <div
              id="maintFormContainer"
              className="bg-white p-6 rounded-2xl border-2 border-maint-600 shadow-xl space-y-6 animate-in fade-in"
            >
              {/* CABECERA FORMULARIO */}
              <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3 gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-white bg-maint-600 px-3 py-1 rounded-lg uppercase">
                    {currentRecord.reportNumber}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    Estado: <strong className="text-blue-600 uppercase">{currentRecord.status}</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  {showAutoSave && (
                    <span
                      id="autoSaveIndicator"
                      className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Sincronizado en Vivo
                    </span>
                  )}
                  <button
                    id="btn-pause-maint-form"
                    type="button"
                    onClick={handlePauseReport}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-black px-3.5 py-1.5 rounded-xl text-xs shadow flex items-center gap-1 transition"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    PAUSAR REPORTE
                  </button>
                </div>
              </div>

              {validationAlert && (
                <div
                  id="maintFormValidationAlert"
                  className="p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  {validationAlert}
                </div>
              )}

              {/* SECCIÓN 1: DATOS GENERALES */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-maint-600"></span>
                  1. Información General del Turno y Máquina
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Nombre Operario *
                    </label>
                    <input
                      type="text"
                      id="inpOperator"
                      value={operator}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setOperator(val);
                        syncFormStateToRecord({ operator: val });
                      }}
                      placeholder="Nombre de operario"
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs uppercase font-semibold focus:ring-2 focus:ring-maint-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Turno *
                    </label>
                    <select
                      id="inpShift"
                      value={shift}
                      onChange={(e) => {
                        setShift(e.target.value);
                        syncFormStateToRecord({ shift: e.target.value });
                      }}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
                    >
                      {MASTER_DATA.shifts.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Día / Fecha *
                    </label>
                    <input
                      type="date"
                      id="inpDate"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        syncFormStateToRecord({ date: e.target.value });
                      }}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-maint-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Técnico Responsable *
                    </label>
                    <select
                      id="inpTechnician"
                      value={technician}
                      onChange={(e) => {
                        setTechnician(e.target.value);
                        syncFormStateToRecord({ technician: e.target.value });
                      }}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
                    >
                      <option value="">-- Seleccionar Técnico --</option>
                      {MASTER_DATA.technicians.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Máquina (Lista Oficial) *
                    </label>
                    <select
                      id="inpMachine"
                      value={machine}
                      onChange={(e) => {
                        setMachine(e.target.value);
                        syncFormStateToRecord({ machine: e.target.value });
                      }}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs bg-white font-bold text-maint-700 focus:ring-2 focus:ring-maint-600 focus:outline-none"
                    >
                      <option value="">-- Seleccionar Máquina --</option>
                      {MASTER_DATA.machines.map((m) => (
                        <option key={m} value={m}>
                          Máquina {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Referencia
                    </label>
                    <select
                      id="inpReference"
                      value={reference}
                      onChange={(e) => {
                        setReference(e.target.value);
                        syncFormStateToRecord({ reference: e.target.value });
                      }}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
                    >
                      <option value="">-- Seleccionar Referencia --</option>
                      {MASTER_DATA.references.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: TIEMPO DE FALLA Y LLEGADA DE TÉCNICO */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-maint-600" />
                  2. Tiempos de Respuesta
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Hora Inicio de Falla *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        id="inpHoraFallo"
                        value={failureTime}
                        onChange={(e) => {
                          setFailureTime(e.target.value);
                          syncFormStateToRecord({ failureTime: e.target.value });
                        }}
                        className="w-full border border-slate-300 p-2 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const t = getNowTimeString();
                          setFailureTime(t);
                          syncFormStateToRecord({ failureTime: t });
                        }}
                        className="bg-white border border-slate-300 text-maint-700 px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 whitespace-nowrap"
                      >
                        Hora Actual
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Hora Llegada de Técnico *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        id="inpHoraLlegada"
                        value={technicianArrivalTime}
                        onChange={(e) => {
                          setTechnicianArrivalTime(e.target.value);
                          syncFormStateToRecord({ technicianArrivalTime: e.target.value });
                        }}
                        className="w-full border border-slate-300 p-2 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const t = getNowTimeString();
                          setTechnicianArrivalTime(t);
                          syncFormStateToRecord({ technicianArrivalTime: t });
                        }}
                        className="bg-white border border-slate-300 text-maint-700 px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 whitespace-nowrap"
                      >
                        Hora Actual
                      </button>
                    </div>
                  </div>
                </div>

                {arrivalTimeMin !== undefined && (
                  <p id="lblTiempoLlegada" className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block">
                    ⏱ Tiempo de respuesta técnico: <strong>{arrivalTimeMin} minutos</strong>
                  </p>
                )}
              </div>

              {/* SECCIÓN 3: DEFECTOS DETECTADOS (SELECCIÓN MÚLTIPLE) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-maint-600"></span>
                    3. Defectos Detectados (Selección Múltiple) *
                  </h4>
                  <span className="text-[11px] text-maint-700 font-bold">
                    {selectedDefects.length + (customDefect ? 1 : 0)} seleccionados
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {MASTER_DATA.defects.map((def) => {
                    const isSelected = selectedDefects.includes(def);
                    return (
                      <button
                        key={def}
                        type="button"
                        onClick={() => toggleDefectSelection(def)}
                        className={`p-2 rounded-xl text-xs font-semibold text-left transition flex items-center justify-between border ${
                          isSelected
                            ? 'bg-maint-50 text-maint-900 border-maint-500 font-bold ring-1 ring-maint-400'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-maint-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-1">{def}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-maint-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1">
                  {!showCustomDefectInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomDefectInput(true)}
                      className="text-xs text-maint-600 hover:text-maint-800 font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Añadir otro defecto personalizado
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={customDefect}
                        onChange={(e) => {
                          setCustomDefect(e.target.value.toUpperCase());
                          syncFormStateToRecord();
                        }}
                        placeholder="Escriba defecto personalizado..."
                        className="w-full max-w-md border border-slate-300 p-2 rounded-lg text-xs uppercase font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 4: SOLUCIONES APLICADAS (SELECCIÓN MÚLTIPLE) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-maint-600"></span>
                    4. Soluciones Aplicadas (Selección Múltiple) *
                  </h4>
                  <span className="text-[11px] text-maint-700 font-bold">
                    {selectedSolutions.length + (customSolution ? 1 : 0)} seleccionadas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {MASTER_DATA.solutions.map((sol) => {
                    const isSelected = selectedSolutions.includes(sol);
                    return (
                      <button
                        key={sol}
                        type="button"
                        onClick={() => toggleSolutionSelection(sol)}
                        className={`p-2 rounded-xl text-xs font-semibold text-left transition flex items-center justify-between border ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-500 font-bold ring-1 ring-emerald-400'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-1">{sol}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1">
                  {!showCustomSolutionInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomSolutionInput(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Añadir otra solución personalizada
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={customSolution}
                        onChange={(e) => {
                          setCustomSolution(e.target.value.toUpperCase());
                          syncFormStateToRecord();
                        }}
                        placeholder="Escriba solución personalizada..."
                        className="w-full max-w-md border border-slate-300 p-2 rounded-lg text-xs uppercase font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 5: CIERRE Y TÉCNICO RESOLUTOR */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-maint-600" />
                  5. Hora de Solución / Cierre y Técnico Responsable
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Hora de Cierre / Solución *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        id="inpHoraCierre"
                        value={closingTime}
                        onChange={(e) => {
                          setClosingTime(e.target.value);
                          syncFormStateToRecord({ closingTime: e.target.value });
                        }}
                        className="w-full border border-slate-300 p-2 rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-maint-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const t = getNowTimeString();
                          setClosingTime(t);
                          syncFormStateToRecord({ closingTime: t });
                        }}
                        className="bg-white border border-slate-300 text-maint-700 px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 whitespace-nowrap"
                      >
                        Hora Actual
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Técnico que Realizó la Solución *
                    </label>
                    <select
                      id="inpSolvingTechnician"
                      value={solvingTechnician}
                      onChange={(e) => {
                        setSolvingTechnician(e.target.value);
                        syncFormStateToRecord({ solvingTechnician: e.target.value });
                      }}
                      className="w-full border border-slate-300 p-2 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
                    >
                      <option value="">-- Seleccionar Técnico --</option>
                      {MASTER_DATA.technicians.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-bold pt-2">
                  {repairTimeMin !== undefined && (
                    <span id="lblTiempoReparacion" className="text-maint-700 bg-maint-50 px-2.5 py-1 rounded border border-maint-100">
                      🔧 Tiempo de reparación: {repairTimeMin} min
                    </span>
                  )}
                  {totalDowntimeMin !== undefined && (
                    <span id="lblTiempoTotalParada" className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-100">
                      🛑 Parada total máquina: {totalDowntimeMin} min
                    </span>
                  )}
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePauseReport}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs shadow flex items-center gap-1.5 transition"
                >
                  <Pause className="w-4 h-4" />
                  Pausar Reporte
                </button>
                <button
                  type="button"
                  id="btn-finalize-maint-report"
                  onClick={handleFinalizeReport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  FINALIZAR REPORTE
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <p className="text-sm font-bold text-slate-600">
                No hay ningún reporte de mantenimiento abierto actualmente.
              </p>
              <p className="text-xs text-slate-400">
                Haga clic en <strong>"Nuevo Reporte"</strong> para registrar una falla o seleccione un reporte en la pestaña <strong>"Panel en Vivo"</strong> para continuar.
              </p>
              <button
                onClick={handleStartNewReport}
                className="bg-maint-600 hover:bg-maint-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow inline-flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                Iniciar Formulario de Mantenimiento
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: PANEL EN VIVO (PANEL CENTRAL DE REGISTROS) */}
      {activeTab === 'LIVE' && (
        <div id="maintTabLive" className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-3">
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  PANEL EN VIVO — REGISTROS DE MANTENIMIENTO
                </h3>
                <p className="text-xs text-slate-500">
                  Actualización en tiempo real de fallas, tiempos operativos y soluciones
                </p>
              </div>
              <button
                id="btn-export-excel"
                onClick={() => RecordService.exportMaintenanceToExcel(records)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow uppercase flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                EXPORTAR A EXCEL
              </button>
            </div>

            {/* FILTROS DE BÚSQUEDA */}
            <div className="p-4 bg-slate-50 border-b grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                type="text"
                id="filterSearch"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Buscar reporte, operario..."
                className="border border-slate-300 p-2 rounded-xl text-xs uppercase bg-white focus:ring-2 focus:ring-maint-600 focus:outline-none"
              />
              <select
                id="filterMachine"
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                className="border border-slate-300 p-2 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
              >
                <option value="">Todas las Máquinas</option>
                {MASTER_DATA.machines.map((m) => (
                  <option key={m} value={m}>
                    Máquina {m}
                  </option>
                ))}
              </select>
              <select
                id="filterTechnician"
                value={filterTechnician}
                onChange={(e) => setFilterTechnician(e.target.value)}
                className="border border-slate-300 p-2 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
              >
                <option value="">Todos los Técnicos</option>
                {MASTER_DATA.technicians.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-slate-300 p-2 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-maint-600 focus:outline-none"
              >
                <option value="">Todos los Estados</option>
                <option value="EN_PROCESO">EN PROCESO</option>
                <option value="PAUSADO">PAUSADO</option>
                <option value="FINALIZADO">FINALIZADO</option>
              </select>
              <input
                type="date"
                id="filterDate"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="border border-slate-300 p-2 rounded-xl text-xs bg-white focus:ring-2 focus:ring-maint-600 focus:outline-none font-bold"
              />
            </div>

            {/* TABLA DE REGISTROS EN VIVO */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold uppercase text-slate-600 border-b">
                    <th className="p-3">Turno</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Máquina</th>
                    <th className="p-3">H. Inicio Falla</th>
                    <th className="p-3">H. Llegada Técnico</th>
                    <th className="p-3">Defecto</th>
                    <th className="p-3">Solución</th>
                    <th className="p-3">H. Solución</th>
                    <th className="p-3">Técnico</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody id="tblMaintBody" className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400">
                        Sin registros de mantenimiento almacenados.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const badgeColor =
                        r.status === 'FINALIZADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'PAUSADO'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800';

                      const defectText =
                        r.defects && r.defects.length > 0
                          ? r.defects.join(', ')
                          : r.defect || '-';

                      const solutionText =
                        r.solutions && r.solutions.length > 0
                          ? r.solutions.join(', ')
                          : r.solution || '-';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-semibold text-slate-700">{r.shift || '-'}</td>
                          <td className="p-3 font-medium">{r.date}</td>
                          <td className="p-3 font-bold text-maint-700">{r.machine || '-'}</td>
                          <td className="p-3">{r.failureTime || '-'}</td>
                          <td className="p-3">{r.technicianArrivalTime || '-'}</td>
                          <td className="p-3 uppercase max-w-[150px] truncate" title={defectText}>
                            {defectText}
                          </td>
                          <td className="p-3 uppercase max-w-[150px] truncate" title={solutionText}>
                            {solutionText}
                          </td>
                          <td className="p-3">{r.closingTime || '-'}</td>
                          <td className="p-3 font-semibold uppercase">{r.solvingTechnician || r.technician || '-'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${badgeColor}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleContinueOrEditReport(r)}
                                className="text-slate-600 hover:text-maint-700 bg-slate-100 hover:bg-maint-50 p-1.5 rounded-lg transition"
                                title="Editar / Continuar reporte"
                              >
                                <Pencil className="w-3.5 h-3.5 text-maint-600" />
                              </button>

                              {/* RESTRINGIR ELIMINAR A ADMINISTRADORES EXCLUSIVAMENTE */}
                              {session?.role === 'Administrador' && (
                                <button
                                  onClick={() => handleDeleteReport(r.id)}
                                  className="text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 p-1.5 rounded-lg transition"
                                  title="Eliminar reporte (Solo Administrador)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: DASHBOARD */}
      {activeTab === 'DASHBOARD' && (
        <div id="maintTabDash" className="space-y-6">
          {/* TARJETAS DE MÉTRICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Total Reportes
              </span>
              <p className="text-2xl font-black text-slate-800 mt-1">{records.length}</p>
              <div className="flex gap-2 text-[10px] font-bold mt-2">
                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {finalizedRecords.length} Finalizados
                </span>
                <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  {pausedCount} Pausados
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                T. Promedio Respuesta
              </span>
              <p className="text-2xl font-black text-indigo-600 mt-1">{avgArrival} min</p>
              <p className="text-[11px] text-slate-400 mt-1">Llegada del técnico a máquina</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                T. Promedio Reparación
              </span>
              <p className="text-2xl font-black text-maint-600 mt-1">{avgRepair} min</p>
              <p className="text-[11px] text-slate-400 mt-1">Tiempo de ejecución de solución</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Parada Total Acumulada
              </span>
              <p className="text-2xl font-black text-rose-600 mt-1">{totalDowntime} min</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {(totalDowntime / 60).toFixed(1)} horas sin operar
              </p>
            </div>
          </div>

          {/* DISTRIBUCIONES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DEFECTOS MÁS FRECUENTES */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase text-slate-800 border-b pb-2">
                Defectos Más Frecuentes
              </h4>
              <div className="space-y-3">
                {topDefects.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin datos de defectos.</p>
                ) : (
                  topDefects.map(([name, count]) => {
                    const pct = Math.round((count / maxDefectCount) * 100);
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="truncate uppercase max-w-[250px]">{name}</span>
                          <span className="text-slate-500">{count} eventos</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-maint-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* MÁQUINAS CON MAYOR TIEMPO DE PARADA */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase text-slate-800 border-b pb-2">
                Máquinas con Mayor Tiempo de Parada (min)
              </h4>
              <div className="space-y-3">
                {topMachines.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin datos de máquinas.</p>
                ) : (
                  topMachines.map(([mName, dTime]) => {
                    const pct = Math.round((dTime / maxMachineDowntime) * 100);
                    return (
                      <div key={mName} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>Máquina {mName}</span>
                          <span className="text-rose-600 font-bold">{dTime} min</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
