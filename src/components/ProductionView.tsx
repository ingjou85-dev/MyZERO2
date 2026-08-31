import React, { useState, useEffect } from 'react';
import { MASTER_DATA } from '../constants/masterData.ts';
import { RecordService } from '../services/recordService.ts';
import { ProductionQualityRecord, UserSession, ProductionTurnRecord } from '../types.ts';
import { ProductionSummaryTab } from './ProductionSummaryTab.tsx';
import {
  FileText,
  Activity,
  Plus,
  CheckCircle2,
  Trash2,
  Save,
  AlertCircle,
  Pencil,
  Layers,
  Box,
  Scale,
  ShieldCheck,
  Pause,
  ArrowLeft,
  ArrowRight,
  Lock,
  Calendar,
  X,
  Clock,
  FileSpreadsheet,
  Settings2
} from 'lucide-react';

interface ProductionViewProps {
  session: UserSession | null;
  initialTab?: 'INGRESAR' | 'LIVE' | 'DASHBOARD' | 'RESUMEN';
  activeTurn?: ProductionTurnRecord | null;
  onOpenTurnModal?: () => void;
  onSaved?: () => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  session,
  initialTab = 'INGRESAR',
  activeTurn,
  onOpenTurnModal,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'INGRESAR' | 'LIVE' | 'DASHBOARD' | 'RESUMEN'>(initialTab);
  const [records, setRecords] = useState<ProductionQualityRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [currentRecord, setCurrentRecord] = useState<ProductionQualityRecord | null>(null);
  const [validationAlert, setValidationAlert] = useState('');
  const [showAutoSave, setShowAutoSave] = useState(false);

  // Form Fields
  const [boxNumber, setBoxNumber] = useState<number>(1);
  const [machine, setMachine] = useState('');
  const [reference, setReference] = useState('');
  const [station, setStation] = useState('');

  // Paso 2: Control de Pesos
  // Peso Vaso Individual (g), Peso Caja Plegadiza (g), Peso Final Caja (g)
  const [weightBottom, setWeightBottom] = useState<string>('');
  const [weightLid, setWeightLid] = useState<string>('');
  const [weightTotal, setWeightTotal] = useState<string>('');

  // Paso 3: Pruebas de Calidad (3 pruebas) y Cantidades Editables
  const [leakTest, setLeakTest] = useState<'CUMPLE' | 'NO_CUMPLE'>('CUMPLE');
  const [leakTestQty, setLeakTestQty] = useState<number>(6);
  const [visualInspection, setVisualInspection] = useState<'CUMPLE' | 'NO_CUMPLE'>('CUMPLE');
  const [visualInspectionQty, setVisualInspectionQty] = useState<number>(200);
  const [tearTest, setTearTest] = useState<'CUMPLE' | 'NO_CUMPLE'>('CUMPLE');
  const [tearTestQty, setTearTestQty] = useState<number>(6);
  const [isEditingQty, setIsEditingQty] = useState<boolean>(false);

  // Paso 4: Aprobado por y Hora de Inspección
  const [approvedBy, setApprovedBy] = useState<'PHINEAS' | 'ALEXANDRA' | string>('PHINEAS');
  const [inspectionTime, setInspectionTime] = useState<string>('');

  // Global Filters for Live Panel (Solo 2: Fecha y Estación)
  const [filterDate, setFilterDate] = useState('');
  const [filterStation, setFilterStation] = useState('');

  const getNowTimeString = (): string => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const userStation = activeTurn?.station || (session?.role === 'Administrador' ? '' : 'Estación 51');
  const availableMachines = userStation
    ? MASTER_DATA.getMachinesForStation(userStation)
    : MASTER_DATA.machines;

  useEffect(() => {
    const unsub = RecordService.subscribeProductionQualityRecords((loaded) => {
      setRecords(loaded);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const triggerAutoSaveBadge = () => {
    setShowAutoSave(true);
    setTimeout(() => setShowAutoSave(false), 2000);
  };

  // Obtener cajas del usuario en el turno actual
  const getUserTurnBoxes = () => {
    const curName = session?.fullName?.trim().toUpperCase();
    const curUser = session?.user?.trim().toUpperCase();
    return records.filter((r) => {
      const recPacker = r.packer?.trim().toUpperCase();
      const isUser = recPacker === curName || recPacker === curUser;
      if (!isUser) return false;
      if (activeTurn) {
        return r.date === activeTurn.date && r.shift === activeTurn.shift;
      }
      return true;
    });
  };

  const nextUserBoxNumber = (() => {
    const uBoxes = getUserTurnBoxes();
    return uBoxes.length > 0 ? Math.max(...uBoxes.map((r) => r.boxNumber || 0)) + 1 : 1;
  })();

  const handleStartNewBox = () => {
    const nextBoxNum = nextUserBoxNumber;

    const initialMachine = availableMachines[0] || MASTER_DATA.machines[0];
    const initialStation = userStation || MASTER_DATA.getStationForMachine(initialMachine) || 'Estación 51';
    const currentTime = getNowTimeString();

    const fullTestDetails = `PRUEBA DE GOTEO (${leakTestQty}): ${leakTest} | INSPECCIÓN VISUAL (${visualInspectionQty}): ${visualInspection} | PRUEBA DE RASGADO (${tearTestQty}): ${tearTest}`;

    const newRec: ProductionQualityRecord = {
      id: 'pqr-' + Date.now(),
      reportNumber: 'CAJA-' + String(nextBoxNum).padStart(4, '0'),
      boxNumber: nextBoxNum,
      station: initialStation,
      date: activeTurn?.date || new Date().toISOString().split('T')[0],
      shift: activeTurn?.shift || MASTER_DATA.shifts[0],
      machine: initialMachine,
      reference: activeTurn?.reference || MASTER_DATA.references[0],
      packer: (session?.fullName || activeTurn?.packer || '').toUpperCase(),
      tech: activeTurn?.tech || '',
      aux: activeTurn?.aux || '',
      leakTest: 'CUMPLE',
      leakTestQty: 6,
      visualInspection: 'CUMPLE',
      visualInspectionQty: 200,
      tearTest: 'CUMPLE',
      tearTestQty: 6,
      approval: 'APROBADO',
      approvedBy: 'PHINEAS',
      inspectionTime: currentTime,
      testDetails: fullTestDetails,
      status: 'EN_PROCESO'
    };

    setCurrentRecord(newRec);
    setIsFormOpen(true);
    setCurrentStep(1);
    setValidationAlert('');
    setIsEditingQty(false);

    setBoxNumber(nextBoxNum);
    setStation(initialStation);
    setMachine(initialMachine);
    setReference(newRec.reference);
    setWeightBottom('');
    setWeightLid('');
    setWeightTotal('');
    setLeakTest('CUMPLE');
    setLeakTestQty(6);
    setVisualInspection('CUMPLE');
    setVisualInspectionQty(200);
    setTearTest('CUMPLE');
    setTearTestQty(6);
    setApprovedBy('PHINEAS');
    setInspectionTime(currentTime);

    RecordService.saveProductionQualityRecord(newRec).catch((err) => {
      console.error('Error saving new box record to Firestore:', err);
    });
    triggerAutoSaveBadge();
  };

  const getFullTestDetailsString = () => {
    return `PRUEBA DE GOTEO (${leakTestQty}): ${leakTest} | INSPECCIÓN VISUAL (${visualInspectionQty}): ${visualInspection} | PRUEBA DE RASGADO (${tearTestQty}): ${tearTest}`;
  };

  const syncBoxDraft = (extraStatus?: 'EN_PROCESO' | 'PAUSADO' | 'FINALIZADO') => {
    if (!currentRecord) return;
    const wb = weightBottom ? parseFloat(weightBottom) : undefined;
    const wl = weightLid ? parseFloat(weightLid) : undefined;
    const wt = weightTotal ? parseFloat(weightTotal) : undefined;

    const fullTestDetails = getFullTestDetailsString();

    const updated: ProductionQualityRecord = {
      ...currentRecord,
      boxNumber,
      station: station || userStation || MASTER_DATA.getStationForMachine(machine) || 'Estación 51',
      machine,
      reference,
      weightBottom: wb,
      weightLid: wl,
      weightTotal: wt,
      leakTest,
      leakTestQty,
      visualInspection,
      visualInspectionQty,
      tearTest,
      tearTestQty,
      testDetails: fullTestDetails,
      approvedBy,
      inspectionTime: inspectionTime || getNowTimeString(),
      approval: 'APROBADO',
      status: extraStatus || currentRecord.status
    };

    setCurrentRecord(updated);
    RecordService.saveProductionQualityRecord(updated).catch((err) => {
      console.error('Error updating box record to Firestore:', err);
    });
    triggerAutoSaveBadge();
  };

  const handleNextStep = () => {
    setValidationAlert('');
    if (currentStep === 1 && !machine) {
      setValidationAlert('Por favor seleccione la máquina.');
      return;
    }
    if (currentStep === 2 && (!weightBottom || !weightLid || !weightTotal)) {
      setValidationAlert('Por favor ingrese o seleccione los valores de control de peso (Vaso individual, Caja plegadiza y Final caja).');
      return;
    }

    syncBoxDraft('EN_PROCESO');
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const handlePrevStep = () => {
    setValidationAlert('');
    syncBoxDraft('EN_PROCESO');
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handlePauseBox = () => {
    if (!currentRecord) return;
    syncBoxDraft('PAUSADO');
    setIsFormOpen(false);
    setCurrentRecord(null);
  };

  const handleFinalizeBox = () => {
    setValidationAlert('');
    if (!weightBottom || !weightLid || !weightTotal) {
      setValidationAlert('Faltan valores de peso requeridos (Vaso Individual, Caja Plegadiza y Final Caja).');
      return;
    }
    if (!approvedBy) {
      setValidationAlert('Por favor seleccione quién aprueba la caja.');
      return;
    }
    if (!inspectionTime) {
      setValidationAlert('Por favor ingrese la hora de inspección.');
      return;
    }

    if (!currentRecord) return;
    const wb = parseFloat(weightBottom);
    const wl = parseFloat(weightLid);
    const wt = parseFloat(weightTotal);

    const fullTestDetails = getFullTestDetailsString();

    const finalized: ProductionQualityRecord = {
      ...currentRecord,
      boxNumber,
      station: station || userStation || MASTER_DATA.getStationForMachine(machine) || 'Estación 51',
      machine,
      reference,
      weightBottom: wb,
      weightLid: wl,
      weightTotal: wt,
      leakTest,
      leakTestQty,
      visualInspection,
      visualInspectionQty,
      tearTest,
      tearTestQty,
      testDetails: fullTestDetails,
      approvedBy,
      inspectionTime: inspectionTime || getNowTimeString(),
      approval: 'APROBADO',
      status: 'FINALIZADO'
    };

    RecordService.saveProductionQualityRecord(finalized).catch((err) => {
      console.error('Error finalizing box record:', err);
    });

    setIsFormOpen(false);
    setCurrentRecord(null);
    if (onSaved) onSaved();
  };

  const handleResumeBox = (rec: ProductionQualityRecord) => {
    setCurrentRecord(rec);
    setIsFormOpen(true);
    setCurrentStep(1);
    setValidationAlert('');
    setIsEditingQty(false);

    setBoxNumber(rec.boxNumber || 1);
    setStation(rec.station || userStation || 'Estación 51');
    setMachine(rec.machine || availableMachines[0]);
    setReference(rec.reference || activeTurn?.reference || MASTER_DATA.references[0]);
    setWeightBottom(rec.weightBottom !== undefined ? String(rec.weightBottom) : '');
    setWeightLid(rec.weightLid !== undefined ? String(rec.weightLid) : '');
    setWeightTotal(rec.weightTotal !== undefined ? String(rec.weightTotal) : '');
    setLeakTest(rec.leakTest || 'CUMPLE');
    setLeakTestQty(rec.leakTestQty || 6);
    setVisualInspection(rec.visualInspection || 'CUMPLE');
    setVisualInspectionQty(rec.visualInspectionQty || 200);
    setTearTest(rec.tearTest || 'CUMPLE');
    setTearTestQty(rec.tearTestQty || 6);
    setApprovedBy((rec.approvedBy as 'PHINEAS' | 'ALEXANDRA') || 'PHINEAS');
    setInspectionTime(rec.inspectionTime || getNowTimeString());
  };

  const handleDeleteBox = async (id: string) => {
    if (session?.role !== 'Administrador') {
      alert('Acción restringida: solo administradores pueden eliminar registros.');
      return;
    }
    if (window.confirm('¿Está seguro de eliminar este registro de caja?')) {
      try {
        await RecordService.deleteProductionQualityRecord(id);
        if (currentRecord?.id === id) {
          setIsFormOpen(false);
          setCurrentRecord(null);
        }
      } catch (e) {
        alert('Error al eliminar el registro.');
      }
    }
  };

  // CONTROL DE ROLES (RBAC) PARA EL PANEL EN VIVO:
  // Para usuarios corrientes: solo registros ingresados por ellos mismos durante el turno
  // Para Administrador: toda la información en tiempo real
  const roleFilteredRecords = records.filter((r) => {
    if (session?.role === 'Administrador') return true;
    const curName = session?.fullName?.trim().toUpperCase();
    const curUser = session?.user?.trim().toUpperCase();
    const recPacker = r.packer?.trim().toUpperCase();
    return recPacker === curName || recPacker === curUser;
  });

  // FILTROS GLOBALES: Por Fecha y Por Estación
  const liveTableFiltered = roleFilteredRecords.filter((r) => {
    if (filterDate && r.date !== filterDate) return false;
    if (filterStation) {
      const recStation = r.station || MASTER_DATA.getStationForMachine(r.machine || '') || '';
      if (recStation !== filterStation) return false;
    }
    return true;
  });

  // ORDENAMIENTO SECUENCIAL (Caja #1 arriba, consecutivas hacia abajo - Orden Ascendente por boxNumber)
  const sequentialRecords = [...liveTableFiltered].sort((a, b) => (a.boxNumber || 0) - (b.boxNumber || 0));

  // Cajas pausadas del usuario
  const userPausedBoxes = roleFilteredRecords.filter((r) => r.status === 'PAUSADO');

  // Bloqueo si no ha iniciado turno
  if (!activeTurn) {
    return (
      <section className="max-w-2xl w-full mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 my-auto">
        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-200">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
            MÓDULO DE PRODUCCIÓN BLOQUEADO
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Debe registrar e iniciar su turno de producción en la pantalla de inicio antes de ingresar el control de cajas.
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
    <section id="viewProduction" className="w-full space-y-4 animate-in fade-in">
      {/* HEADER DE PRODUCCIÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-prod-600 text-white rounded-xl shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
              CONTROL DE CALIDAD Y PRODUCCIÓN
            </h2>
            <p className="text-[11px] text-slate-500">
              Estación activa: <strong className="text-prod-700 font-bold">{userStation}</strong> | Ref: {activeTurn?.reference} | Empacador: {session?.fullName}
            </p>
          </div>
        </div>

        {/* PESTAÑAS */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
          <button
            id="tab-prod-ingresar"
            onClick={() => setActiveTab('INGRESAR')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'INGRESAR'
                ? 'bg-prod-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Control de Cajas
          </button>
          <button
            id="tab-prod-live"
            onClick={() => setActiveTab('LIVE')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'LIVE'
                ? 'bg-prod-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Panel en Vivo
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {sequentialRecords.length}
            </span>
          </button>
          {session?.role === 'Administrador' && (
            <button
              id="tab-prod-resumen"
              onClick={() => setActiveTab('RESUMEN')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'RESUMEN' || activeTab === 'DASHBOARD'
                  ? 'bg-prod-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Resumen
            </button>
          )}
        </div>
      </div>

      {showAutoSave && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-50 animate-in fade-in">
          <Save className="w-3.5 h-3.5" /> Guardado en tiempo real
        </div>
      )}

      {/* TAB 1: INGRESAR DATOS (WIZARD DE CAJAS PASO A PASO) */}
      {activeTab === 'INGRESAR' && (
        <div className="space-y-4">
          {!isFormOpen ? (
            /* VISTA INICIAL DE CONTROL DE CAJAS */
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6 max-w-xl mx-auto">
              <div className="w-14 h-14 bg-prod-50 text-prod-600 rounded-2xl flex items-center justify-center mx-auto border border-prod-200 shadow-sm">
                <Box className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  INSPECCIÓN Y CONTROL DE CAJAS
                </h3>
                <p className="text-xs text-slate-500">
                  {userStation} | Ref: {activeTurn?.reference} | Próxima: Caja #{nextUserBoxNumber}
                </p>
              </div>

              <button
                id="btn-nueva-caja-prod"
                onClick={handleStartNewBox}
                className="w-full bg-prod-600 hover:bg-prod-700 text-white font-black py-3.5 px-6 rounded-xl text-xs uppercase shadow-md hover:shadow-prod-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                REGISTRAR NUEVA CAJA
              </button>

              {/* SECCIÓN DE CAJAS PAUSADAS */}
              <div className="border-t border-slate-100 pt-5 text-left space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Pause className="w-3.5 h-3.5 text-amber-500" />
                  Cajas Pausadas / En Proceso
                </h4>

                {userPausedBoxes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                    No hay cajas pausadas actualmente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userPausedBoxes.map((p) => (
                      <div
                        key={p.id}
                        className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-900">Caja #{p.boxNumber}</span>
                            <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                              Máq. {p.machine}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-600">{p.reference}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Vaso Ind: {p.weightBottom || '--'}g | Plegadiza: {p.weightLid || '--'}g | Final: {p.weightTotal || '--'}g
                          </p>
                        </div>
                        <button
                          onClick={() => handleResumeBox(p)}
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
            /* WIZARD PASO A PASO (1 A 4) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto overflow-hidden">
              {/* ENCABEZADO */}
              <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-prod-600 text-white text-xs font-black px-2 py-0.5 rounded-md">
                    PASO {currentStep} DE 4
                  </span>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wide">
                      {currentStep === 1 && `Caja número ${boxNumber}`}
                      {currentStep === 2 && 'Control de Pesos'}
                      {currentStep === 3 && 'Pruebas de Calidad'}
                      {currentStep === 4 && 'Aprobación Final e Inspección'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {userStation} | Ref: {reference}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePauseBox}
                  className="bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Pausar caja"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pausar</span>
                </button>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full bg-slate-100 h-1.5">
                <div
                  className="bg-prod-600 h-1.5 transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>

              {/* VALIDATION ALERT */}
              {validationAlert && (
                <div className="m-4 p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {validationAlert}
                </div>
              )}

              {/* CUERPO DEL PASO */}
              <div className="p-6 space-y-4 text-left">
                {/* PASO 1: CAJA NÚMERO X Y MÁQUINA EN CHIPS */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">Consecutivo por Usuario y Turno</span>
                        <h4 className="text-xl font-black text-emerald-950">Caja número {boxNumber}</h4>
                      </div>
                      <span className="bg-emerald-600 text-white font-mono font-bold px-3 py-1 rounded-lg text-sm shadow-sm">
                        #{boxNumber}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                          Máquina de la {userStation} *
                        </label>
                        {machine && (
                          <span className="text-[11px] font-bold text-prod-700 bg-prod-50 px-2 py-0.5 rounded border border-prod-200">
                            Seleccionada: Máq. {machine}
                          </span>
                        )}
                      </div>

                      {/* CHIPS / ETIQUETAS CON SOLO EL NÚMERO DE LA MÁQUINA */}
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {availableMachines.map((m) => {
                          const isSelected = machine === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              id={`chip-prod-machine-${m}`}
                              onClick={() => {
                                setMachine(m);
                                setValidationAlert('');
                              }}
                              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer border ${
                                isSelected
                                  ? 'bg-prod-600 text-white border-prod-600 shadow-md ring-2 ring-prod-400/40 scale-105'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 hover:border-slate-300'
                              }`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-slate-500 pt-0.5">
                        Seleccione el número de la máquina correspondiente a esta caja.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Referencia:</span>
                        <strong className="text-slate-800">{reference}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Empacador:</span>
                        <strong className="text-slate-800">{session?.fullName}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* PASO 2: CONTROL DE PESOS (PESO VASO INDIVIDUAL, PESO CAJA PLEGADIZA, PESO FINAL CAJA) */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase pb-1 border-b border-slate-100">
                      <Scale className="w-4 h-4 text-prod-600" />
                      Control de Pesos
                    </div>

                    {/* 1) PESO VASO INDIVIDUAL (Estándar: 1.4, 1.7, 2.4) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          PESO VASO INDIVIDUAL (g) *
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Estándar:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {MASTER_DATA.standardWeights.individualCup.map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWeightBottom(String(w))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                              weightBottom === String(w)
                                ? 'bg-prod-600 text-white border-prod-600 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {w}g
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        id="prodInpWeightBottom"
                        value={weightBottom}
                        onChange={(e) => setWeightBottom(e.target.value)}
                        placeholder="O ingrese valor manual de peso vaso individual..."
                        className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-prod-600 focus:outline-none"
                      />
                    </div>

                    {/* 2) PESO CAJA PLEGADIZA (Estándar: 29.5, 34, 47.7) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          PESO CAJA PLEGADIZA (g) *
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Estándar:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {MASTER_DATA.standardWeights.foldingBox.map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWeightLid(String(w))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                              weightLid === String(w)
                                ? 'bg-prod-600 text-white border-prod-600 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {w}g
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        id="prodInpWeightLid"
                        value={weightLid}
                        onChange={(e) => setWeightLid(e.target.value)}
                        placeholder="O ingrese valor manual de peso caja plegadiza..."
                        className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-prod-600 focus:outline-none"
                      />
                    </div>

                    {/* 3) PESO FINAL CAJA (Estándar: 89, 103, 129) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          PESO FINAL CAJA (g) *
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Estándar:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pb-1">
                        {MASTER_DATA.standardWeights.finalBox.map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWeightTotal(String(w))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                              weightTotal === String(w)
                                ? 'bg-prod-600 text-white border-prod-600 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {w}g
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        id="prodInpWeightTotal"
                        value={weightTotal}
                        onChange={(e) => setWeightTotal(e.target.value)}
                        placeholder="O ingrese valor manual de peso final caja..."
                        className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-prod-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* PASO 3: PRUEBAS DE CALIDAD (NOMBRES EN MAYÚSCULAS SIN 1, 2, 3) */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        PRUEBAS DE CALIDAD
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingQty(!isEditingQty)}
                        className="text-[11px] font-bold text-prod-700 hover:text-prod-800 flex items-center gap-1 cursor-pointer bg-prod-50 px-2 py-0.5 rounded border border-prod-200"
                      >
                        <Settings2 className="w-3 h-3" />
                        {isEditingQty ? 'Ocultar Edición' : 'Editar Cantidades'}
                      </button>
                    </div>

                    {/* PRUEBA DE GOTEO */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block uppercase">
                            PRUEBA DE GOTEO
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Cantidad establecida: <strong className="text-slate-800">{leakTestQty} vasos</strong>
                          </span>
                        </div>
                        {isEditingQty ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-bold">Cant:</span>
                            <input
                              type="number"
                              min="1"
                              value={leakTestQty}
                              onChange={(e) => setLeakTestQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold bg-white text-center"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded">
                            Cant: {leakTestQty}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setLeakTest('CUMPLE')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            leakTest === 'CUMPLE'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CUMPLE
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeakTest('NO_CUMPLE')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            leakTest === 'NO_CUMPLE'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          NO CUMPLE
                        </button>
                      </div>
                    </div>

                    {/* INSPECCIÓN VISUAL */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block uppercase">
                            INSPECCIÓN VISUAL
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Cantidad establecida: <strong className="text-slate-800">{visualInspectionQty} vasos</strong>
                          </span>
                        </div>
                        {isEditingQty ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-bold">Cant:</span>
                            <input
                              type="number"
                              min="1"
                              value={visualInspectionQty}
                              onChange={(e) => setVisualInspectionQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold bg-white text-center"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded">
                            Cant: {visualInspectionQty}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setVisualInspection('CUMPLE')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            visualInspection === 'CUMPLE'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CUMPLE
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisualInspection('NO_CUMPLE')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            visualInspection === 'NO_CUMPLE'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          NO CUMPLE
                        </button>
                      </div>
                    </div>

                    {/* PRUEBA DE RASGADO */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block uppercase">
                            PRUEBA DE RASGADO
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Cantidad establecida: <strong className="text-slate-800">{tearTestQty} vasos</strong>
                          </span>
                        </div>
                        {isEditingQty ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-bold">Cant:</span>
                            <input
                              type="number"
                              min="1"
                              value={tearTestQty}
                              onChange={(e) => setTearTestQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold bg-white text-center"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded">
                            Cant: {tearTestQty}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setTearTest('CUMPLE')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            tearTest === 'CUMPLE'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CUMPLE
                        </button>
                        <button
                          type="button"
                          onClick={() => setTearTest('NO_CUMPLE')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                            tearTest === 'NO_CUMPLE'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          NO CUMPLE
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* PASO 4: APROBADO POR EN MAYÚSCULAS Y HORA DE INSPECCIÓN */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    {/* APROBADO POR */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Aprobado por *
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {MASTER_DATA.approvers.map((app) => {
                          const isSelected = approvedBy === app;
                          return (
                            <button
                              key={app}
                              type="button"
                              id={`btn-approver-${app}`}
                              onClick={() => setApprovedBy(app)}
                              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase transition border cursor-pointer ${
                                isSelected
                                  ? 'bg-prod-600 text-white border-prod-600 shadow-md ring-2 ring-prod-400/30'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {app}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* HORA DE INSPECCIÓN */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-prod-600" />
                          Hora de Inspección *
                        </label>
                        <button
                          type="button"
                          onClick={() => setInspectionTime(getNowTimeString())}
                          className="text-[10px] font-bold text-prod-600 hover:underline cursor-pointer"
                        >
                          Hora Actual
                        </button>
                      </div>
                      <input
                        type="time"
                        id="prodInpInspectionTime"
                        value={inspectionTime}
                        onChange={(e) => setInspectionTime(e.target.value)}
                        required
                        className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-prod-600 focus:outline-none"
                      />
                    </div>

                    {/* OPCIÓN PARA EDITAR CANTIDADES EN PASO 4 */}
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                          <Settings2 className="w-3.5 h-3.5 text-prod-600" />
                          Cantidades Establecidas de Vasos
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingQty(!isEditingQty)}
                          className="text-[11px] font-bold text-prod-700 hover:text-prod-800 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-slate-200 shadow-xs"
                        >
                          {isEditingQty ? 'Listo' : 'Editar Cantidades'}
                        </button>
                      </div>

                      {isEditingQty ? (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">
                              P. Goteo
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={leakTestQty}
                              onChange={(e) => setLeakTestQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold bg-white text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">
                              Insp. Visual
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={visualInspectionQty}
                              onChange={(e) => setVisualInspectionQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold bg-white text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">
                              P. Rasgado
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={tearTestQty}
                              onChange={(e) => setTearTestQty(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold bg-white text-center"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-bold">GOTEO</div>
                            <div className="font-mono font-bold text-slate-900">{leakTestQty} vasos</div>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-bold">INSP. VISUAL</div>
                            <div className="font-mono font-bold text-slate-900">{visualInspectionQty} vasos</div>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-bold">RASGADO</div>
                            <div className="font-mono font-bold text-slate-900">{tearTestQty} vasos</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RESUMEN DE LA CAJA */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                      <h5 className="font-bold text-slate-800 uppercase text-[11px] flex items-center justify-between">
                        <span>Resumen de la Caja</span>
                        <span className="text-prod-700 font-mono font-bold">#{boxNumber}</span>
                      </h5>
                      <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                        <div>Máquina: <strong className="text-slate-900">Máq. {machine}</strong></div>
                        <div>Hora Insp: <strong className="text-slate-900">{inspectionTime || '--:--'}</strong></div>
                        <div>Vaso Indiv: <strong className="text-slate-900">{weightBottom || '--'}g</strong></div>
                        <div>Caja Pleg: <strong className="text-slate-900">{weightLid || '--'}g</strong></div>
                        <div>Final Caja: <strong className="text-slate-900">{weightTotal || '--'}g</strong></div>
                        <div>Aprobador: <strong className="text-emerald-700 font-black">{approvedBy}</strong></div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <div>
                          PRUEBA DE GOTEO ({leakTestQty} vasos):{' '}
                          <strong className={leakTest === 'CUMPLE' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {leakTest}
                          </strong>
                        </div>
                        <div>
                          INSPECCIÓN VISUAL ({visualInspectionQty} vasos):{' '}
                          <strong className={visualInspection === 'CUMPLE' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {visualInspection}
                          </strong>
                        </div>
                        <div>
                          PRUEBA DE RASGADO ({tearTestQty} vasos):{' '}
                          <strong className={tearTest === 'CUMPLE' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            {tearTest}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTONES DE NAVEGACIÓN PASO A PASO */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <button
                  type="button"
                  id="btn-wizard-prod-prev"
                  onClick={handlePrevStep}
                  disabled={currentStep === 1}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    id="btn-wizard-prod-next"
                    onClick={handleNextStep}
                    className="bg-prod-600 hover:bg-prod-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    Siguiente <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-wizard-prod-finish"
                    onClick={handleFinalizeBox}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Finalizar Caja
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PANEL EN VIVO (ORDEN SECUENCIAL ASCENDENTE: Caja #1, #2, #3...) */}
      {activeTab === 'LIVE' && (
        <div className="space-y-4">
          {/* FILTROS GLOBALES: SOLO DOS (FECHA Y ESTACIÓN) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Filtrar por Fecha
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="filterProdDate"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-prod-600 focus:outline-none pl-8"
                  />
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Filtrar por Estación
                </label>
                <div className="relative">
                  <select
                    id="filterProdStation"
                    value={filterStation}
                    onChange={(e) => setFilterStation(e.target.value)}
                    className="border border-slate-300 p-2 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-prod-600 focus:outline-none pl-8 min-w-[170px]"
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
                  className="text-xs text-prod-600 hover:underline font-bold px-2 py-1"
                >
                  Limpiar Filtros
                </button>
              )}
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-full border border-slate-200">
                {sequentialRecords.length} Cajas ({session?.role === 'Administrador' ? 'Vista Global' : 'Mis Cajas'})
              </span>
            </div>
          </div>

          {/* TABLA EN VIVO SECUENCIAL (Caja #1 arriba, consecutivas abajo) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3">Caja #</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Hora</th>
                    <th className="p-3">Estación</th>
                    <th className="p-3">Máquina</th>
                    <th className="p-3">Referencia</th>
                    <th className="p-3">P. Vaso Ind.</th>
                    <th className="p-3">P. Plegadiza</th>
                    <th className="p-3">P. Final Caja</th>
                    <th className="p-3 text-center">P. Goteo</th>
                    <th className="p-3 text-center">Insp. Visual</th>
                    <th className="p-3 text-center">P. Rasgado</th>
                    <th className="p-3">Aprobado Por</th>
                    <th className="p-3">Estado</th>
                    {session?.role === 'Administrador' && <th className="p-3 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sequentialRecords.length === 0 ? (
                    <tr>
                      <td colSpan={session?.role === 'Administrador' ? 15 : 14} className="p-8 text-center text-slate-400">
                        No hay registros de cajas para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    sequentialRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-prod-700 bg-prod-50/40 whitespace-nowrap">
                          Caja #{r.boxNumber}
                        </td>
                        <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                          {r.date}
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-600 whitespace-nowrap">
                          {r.inspectionTime || '--:--'}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                          {r.station || MASTER_DATA.getStationForMachine(r.machine || '') || 'Estación'}
                        </td>
                        <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{r.machine}</td>
                        <td className="p-3 font-medium text-slate-700 whitespace-nowrap">{r.reference}</td>
                        <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{r.weightBottom !== undefined ? `${r.weightBottom}g` : '--'}</td>
                        <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{r.weightLid !== undefined ? `${r.weightLid}g` : '--'}</td>
                        <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{r.weightTotal !== undefined ? `${r.weightTotal}g` : '--'}</td>
                        
                        {/* 3 COLUMNAS SEPARADAS DE PRUEBAS DE CALIDAD */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${r.leakTest === 'CUMPLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {r.leakTest || 'CUMPLE'} ({r.leakTestQty || 6})
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${r.visualInspection === 'CUMPLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {r.visualInspection || 'CUMPLE'} ({r.visualInspectionQty || 200})
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${r.tearTest === 'CUMPLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {r.tearTest || 'CUMPLE'} ({r.tearTestQty || 6})
                          </span>
                        </td>

                        <td className="p-3 font-bold text-emerald-700 uppercase whitespace-nowrap">{r.approvedBy || 'PHINEAS'}</td>
                        <td className="p-3 whitespace-nowrap">
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
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteBox(r.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Eliminar registro (Solo Administrador)"
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
        <ProductionSummaryTab records={records} />
      )}
    </section>
  );
};
