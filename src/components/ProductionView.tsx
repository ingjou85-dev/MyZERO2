import React, { useState, useEffect } from 'react';
import { MASTER_DATA } from '../constants/masterData.ts';
import { RecordService } from '../services/recordService.ts';
import { ProductionQualityRecord, UserSession, ProductionTurnRecord, ProductionTraceabilityRecord, ProductionWasteRecord } from '../types.ts';
import { formatPersonName, formatFirstNameUpper } from '../utils/formatters.ts';
import { ProductionSummaryTab } from './ProductionSummaryTab.tsx';
import { ExcelExportService } from '../services/excelExportService.ts';
import { TimeInput } from './TimeInput.tsx';
import { ProductionAuxiliaryCard } from './ProductionAuxiliaryCard.tsx';
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
  Settings2,
  Download
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
  const [leakTest, setLeakTest] = useState<'CUMPLE' | 'NO_CUMPLE' | ''>('');
  const [leakTestQty, setLeakTestQty] = useState<number>(6);
  const [visualInspection, setVisualInspection] = useState<'CUMPLE' | 'NO_CUMPLE' | ''>('');
  const [visualInspectionQty, setVisualInspectionQty] = useState<number>(200);
  const [tearTest, setTearTest] = useState<'CUMPLE' | 'NO_CUMPLE' | ''>('');
  const [tearTestQty, setTearTestQty] = useState<number>(6);
  const [isEditingQty, setIsEditingQty] = useState<boolean>(false);

  // Paso 4: Aprobado por y Hora de Inspección
  const [approvedBy, setApprovedBy] = useState<string>('');
  const [inspectionTime, setInspectionTime] = useState<string>('');
  const [isDeletingBulk, setIsDeletingBulk] = useState<boolean>(false);

  // Global Filters for Live Panel (Solo 2: Fecha y Estación)
  const [filterDate, setFilterDate] = useState('');
  const [filterStation, setFilterStation] = useState('');

  // Estados complementarios para exportación consolidada en vivo (Admin)
  const [turnRecords, setTurnRecords] = useState<ProductionTurnRecord[]>([]);
  const [traceabilityRecords, setTraceabilityRecords] = useState<ProductionTraceabilityRecord[]>([]);
  const [wasteRecords, setWasteRecords] = useState<ProductionWasteRecord[]>([]);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  const getNowTimeString = (): string => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const userStation = activeTurn?.station || (session?.role === 'Administrador' ? 'Estación 51' : 'Estación 51');
  const availableMachines = session?.role === 'Administrador' && !activeTurn
    ? MASTER_DATA.machines
    : userStation
    ? MASTER_DATA.getMachinesForStation(userStation)
    : MASTER_DATA.machines;

  // Referencias para auto-pausar en desmontaje si el formulario quedó en proceso
  const currentRecordRef = React.useRef<ProductionQualityRecord | null>(null);
  const isFormOpenRef = React.useRef<boolean>(false);
  const currentStepRef = React.useRef<number>(1);
  const finalizedIdsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    currentRecordRef.current = currentRecord;
    isFormOpenRef.current = isFormOpen;
    currentStepRef.current = currentStep;
  }, [currentRecord, isFormOpen, currentStep]);

  // Helper para verificar si un registro de caja fue ingresado por el usuario de la sesión actual
  const isMyBox = (r: ProductionQualityRecord): boolean => {
    const curName = session?.fullName?.trim().toUpperCase();
    const curUser = session?.user?.trim().toUpperCase();
    const recPacker = r.packer?.trim().toUpperCase();
    if (!recPacker) return false;
    return (
      (!!curName && recPacker === curName) ||
      (!!curUser && recPacker === curUser) ||
      (curUser === 'DDUVAN' && (recPacker === 'DUVÁN' || recPacker === 'DUVAN'))
    );
  };

  // Si un registro del usuario actual permanece en 'EN_PROCESO' y no está abierto en el formulario,
  // el sistema cambia su estado automáticamente a 'PAUSADO'. Nunca afecta a cajas finalizadas ni de otros usuarios.
  useEffect(() => {
    records.forEach((r) => {
      if (
        r.status === 'EN_PROCESO' &&
        r.id !== currentRecord?.id &&
        !finalizedIdsRef.current.has(r.id) &&
        isMyBox(r)
      ) {
        RecordService.saveProductionQualityRecord({
          ...r,
          status: 'PAUSADO'
        }).catch((e) => console.error('Error auto-pausing orphaned box record:', e));
      }
    });
  }, [records, currentRecord?.id, session?.fullName, session?.user]);

  // Al desmontar la vista o salir, si hay una caja en proceso activa, se guarda automáticamente como PAUSADO
  useEffect(() => {
    return () => {
      if (
        currentRecordRef.current &&
        isFormOpenRef.current &&
        currentRecordRef.current.status === 'EN_PROCESO' &&
        !finalizedIdsRef.current.has(currentRecordRef.current.id)
      ) {
        RecordService.saveProductionQualityRecord({
          ...currentRecordRef.current,
          currentStep: currentStepRef.current,
          status: 'PAUSADO'
        }).catch((e) => console.error('Auto-pause box on unmount error:', e));
      }
    };
  }, []);

  useEffect(() => {
    const unsub = RecordService.subscribeProductionQualityRecords((loaded) => {
      setRecords(loaded);
    });
    const unsubTurns = RecordService.subscribeProductionTurnRecords((turns) => {
      setTurnRecords(turns);
    });
    const unsubTrace = RecordService.subscribeTraceabilityRecords((traz) => {
      setTraceabilityRecords(traz);
    });
    const unsubWaste = RecordService.subscribeWasteRecords((waste) => {
      setWasteRecords(waste);
    });
    return () => {
      unsub();
      unsubTurns();
      unsubTrace();
      unsubWaste();
    };
  }, []);

  const handleExportExcel = async () => {
    if (session?.role !== 'Administrador') return;
    try {
      setIsExportingExcel(true);
      const [traz, waste, turns] = await Promise.all([
        RecordService.getTraceabilityRecords(),
        RecordService.getWasteRecords(),
        RecordService.getProductionTurnsAsync()
      ]);

      ExcelExportService.exportProductionConsolidatedToExcel({
        boxes: records,
        turns: turns.length > 0 ? turns : turnRecords,
        traceability: traz.length > 0 ? traz : traceabilityRecords,
        waste: waste.length > 0 ? waste : wasteRecords,
        filterDate,
        filterStation
      });
    } catch (err) {
      console.error('Error al exportar consolidado de producción a Excel:', err);
      ExcelExportService.exportProductionConsolidatedToExcel({
        boxes: records,
        turns: turnRecords,
        traceability: traceabilityRecords,
        waste: wasteRecords,
        filterDate,
        filterStation
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

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
      if (session?.role === 'Administrador' && !activeTurn) return true;
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
    const initialStation = userStation || 'Estación 51';
    const defaultMachine = availableMachines.length > 0 ? availableMachines[0] : '';

    const newRec: ProductionQualityRecord = {
      id: 'pqr-' + Date.now(),
      reportNumber: 'CAJA-' + String(nextBoxNum).padStart(4, '0'),
      boxNumber: nextBoxNum,
      station: initialStation,
      date: activeTurn?.date || new Date().toISOString().split('T')[0],
      shift: activeTurn?.shift || '',
      machine: defaultMachine,
      reference: activeTurn?.reference || '',
      packer: (session?.fullName || activeTurn?.packer || 'Administrador').toUpperCase(),
      tech: activeTurn?.tech || '',
      aux: activeTurn?.aux || '',
      leakTest: '',
      leakTestQty: 6,
      visualInspection: '',
      visualInspectionQty: 200,
      tearTest: '',
      tearTestQty: 6,
      approval: 'APROBADO',
      approvedBy: '',
      inspectionTime: '',
      testDetails: '',
      currentStep: 1,
      status: 'EN_PROCESO'
    };

    setCurrentRecord(newRec);
    setIsFormOpen(true);
    setCurrentStep(1);
    setValidationAlert('');
    setIsEditingQty(false);

    setBoxNumber(nextBoxNum);
    setStation(initialStation);
    setMachine(defaultMachine);
    setReference(activeTurn?.reference || '');
    setWeightBottom('');
    setWeightLid('');
    setWeightTotal('');
    setLeakTest('');
    setLeakTestQty(6);
    setVisualInspection('');
    setVisualInspectionQty(200);
    setTearTest('');
    setTearTestQty(6);
    setApprovedBy('');
    setInspectionTime('');
  };

  const getFullTestDetailsString = () => {
    return `PRUEBA DE GOTEO (${leakTestQty}): ${leakTest} | INSPECCIÓN VISUAL (${visualInspectionQty}): ${visualInspection} | PRUEBA DE RASGADO (${tearTestQty}): ${tearTest}`;
  };

  const syncBoxDraft = (extraStatus?: 'EN_PROCESO' | 'PAUSADO' | 'FINALIZADO', stepOverride?: number) => {
    if (!currentRecord) return;
    const wb = weightBottom ? parseFloat(weightBottom) : undefined;
    const wl = weightLid ? parseFloat(weightLid) : undefined;
    const wt = weightTotal ? parseFloat(weightTotal) : undefined;

    const fullTestDetails = getFullTestDetailsString();
    const effectiveStep = stepOverride !== undefined ? stepOverride : currentStep;

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
      currentStep: effectiveStep,
      status: extraStatus || currentRecord.status
    };

    setCurrentRecord(updated);
    RecordService.saveProductionQualityRecord(updated).catch((err) => {
      console.error('Error updating box record to Firestore:', err);
    });
    // Actualización inmediata en el estado local para que el Panel en Vivo refleje el avance en tiempo real
    setRecords((prev) =>
      prev.some((r) => r.id === updated.id)
        ? prev.map((r) => (r.id === updated.id ? updated : r))
        : [updated, ...prev]
    );
    triggerAutoSaveBadge();
  };

  const handleNextStep = () => {
    setValidationAlert('');
    if (currentStep === 1) {
      if (!weightBottom || !weightLid || !weightTotal) {
        setValidationAlert('Por favor ingrese o seleccione los valores de control de peso (Vaso individual, Caja plegadiza y Final caja).');
        return;
      }
    }
    if (currentStep === 2) {
      if (!leakTest || !visualInspection || !tearTest) {
        setValidationAlert('Por favor seleccione el resultado (CUMPLE o NO CUMPLE) para cada una de las pruebas de calidad.');
        return;
      }
    }

    const nextStep = Math.min(3, currentStep + 1);
    syncBoxDraft('EN_PROCESO', nextStep);
    setCurrentStep(nextStep);
  };

  const handlePrevStep = () => {
    setValidationAlert('');
    const prevStep = Math.max(1, currentStep - 1);
    syncBoxDraft('EN_PROCESO', prevStep);
    setCurrentStep(prevStep);
  };

  const handlePauseBox = () => {
    if (!currentRecord) return;
    syncBoxDraft('PAUSADO', currentStep);
    setIsFormOpen(false);
    setCurrentRecord(null);
  };

  const handleFinalizeBox = () => {
    setValidationAlert('');
    if (!machine) {
      setValidationAlert('Por favor seleccione la máquina.');
      return;
    }
    if (!weightBottom || !weightLid || !weightTotal) {
      setValidationAlert('Faltan valores de peso requeridos (Vaso Individual, Caja Plegadiza y Final Caja).');
      return;
    }
    if (!leakTest || !visualInspection || !tearTest) {
      setValidationAlert('Por favor complete las 3 pruebas de calidad seleccionando CUMPLE o NO CUMPLE.');
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
      currentStep: 3,
      status: 'FINALIZADO'
    };

    finalizedIdsRef.current.add(finalized.id);

    // Actualización inmediata en estado local para reflejar 'FINALIZADO' en el Panel en Vivo al instante
    setRecords((prev) => prev.map((r) => (r.id === finalized.id ? finalized : r)));

    setIsFormOpen(false);
    setCurrentRecord(null);

    RecordService.saveProductionQualityRecord(finalized).catch((err) => {
      console.error('Error finalizing box record:', err);
    });

    if (onSaved) onSaved();
  };

  const handleResumeBox = (rec: ProductionQualityRecord) => {
    setCurrentRecord(rec);
    setIsFormOpen(true);
    setValidationAlert('');
    setIsEditingQty(false);

    // Reanudar exactamente en el paso adecuado (1 a 3)
    const targetStep = rec.approvedBy
      ? 3
      : rec.leakTest
      ? 2
      : rec.currentStep
      ? Math.min(3, rec.currentStep === 4 ? 3 : rec.currentStep === 3 ? 2 : rec.currentStep)
      : (rec.weightBottom !== undefined && rec.weightLid !== undefined && rec.weightTotal !== undefined)
      ? 2
      : 1;
    setCurrentStep(targetStep);

    setBoxNumber(rec.boxNumber || 1);
    setStation(rec.station || userStation || 'Estación 51');
    setMachine(rec.machine || availableMachines[0]);
    setReference(rec.reference || activeTurn?.reference || MASTER_DATA.references[0]);
    setWeightBottom(rec.weightBottom !== undefined ? String(rec.weightBottom) : '');
    setWeightLid(rec.weightLid !== undefined ? String(rec.weightLid) : '');
    setWeightTotal(rec.weightTotal !== undefined ? String(rec.weightTotal) : '');
    setLeakTest(rec.leakTest || '');
    setLeakTestQty(rec.leakTestQty || 6);
    setVisualInspection(rec.visualInspection || '');
    setVisualInspectionQty(rec.visualInspectionQty || 200);
    setTearTest(rec.tearTest || '');
    setTearTestQty(rec.tearTestQty || 6);
    setApprovedBy(rec.approvedBy || '');
    setInspectionTime(rec.inspectionTime || getNowTimeString());

    // Marcar como activo / en proceso en la base de datos
    RecordService.saveProductionQualityRecord({
      ...rec,
      status: 'EN_PROCESO',
      currentStep: targetStep
    }).catch((err) => console.error('Error updating resumed box:', err));
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

  const handleBulkDeleteProduction = async () => {
    if (session?.role !== 'Administrador') return;
    if (sequentialRecords.length === 0) return;

    const count = sequentialRecords.length;
    const confirmMessage = `¿Está seguro de eliminar masivamente los ${count} registro(s) visualizados en este panel en vivo?\n\nEsta acción es irreversible y eliminará los registros de forma definitiva de la base de datos.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setIsDeletingBulk(true);
      const idsToDelete = sequentialRecords.map((r) => r.id);
      await RecordService.bulkDeleteProductionQualityRecords(idsToDelete);
      setRecords((prev) => prev.filter((r) => !idsToDelete.includes(r.id)));
      setIsDeletingBulk(false);
    } catch (error) {
      console.error('Error bulk deleting production records:', error);
      alert('Ocurrió un error al intentar eliminar los registros.');
      setIsDeletingBulk(false);
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

  // FILTROS GLOBALES: Exclusivo para Administrador (Fecha y Estación). Para usuarios corrientes sin filtros.
  // Permite visualizar el avance continuo del proceso en tiempo real (EN_PROCESO, PAUSADO, FINALIZADO)
  const liveTableFiltered = roleFilteredRecords.filter((r) => {
    if (!r.boxNumber && !r.reportNumber) return false;
    if (session?.role === 'Administrador') {
      if (filterDate && r.date !== filterDate) return false;
      if (filterStation) {
        const recStation = r.station || MASTER_DATA.getStationForMachine(r.machine || '') || '';
        if (recStation !== filterStation) return false;
      }
    }
    return true;
  });

  // ORDENAMIENTO SECUENCIAL (Caja #1 arriba, consecutivas hacia abajo - Orden Ascendente por boxNumber)
  const sequentialRecords = [...liveTableFiltered].sort((a, b) => (a.boxNumber || 0) - (b.boxNumber || 0));

  // PRIMER REQUERIMIENTO: Para TODOS los usuarios (incluyendo administradores),
  // la sección de "Cajas Pausadas / En Proceso" muestra ÚNICA Y EXCLUSIVAMENTE
  // los registros ingresados por el usuario con sesión iniciada.
  const userPausedBoxes = records.filter(
    (r) =>
      (r.status === 'PAUSADO' || r.status === 'EN_PROCESO') &&
      r.id !== currentRecord?.id &&
      !finalizedIdsRef.current.has(r.id) &&
      isMyBox(r)
  );

  // Bloqueo si no ha iniciado turno (excepto para usuarios administradores)
  if (session?.role !== 'Administrador' && !activeTurn) {
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
              Estación activa: <strong className="text-prod-700 font-bold">{userStation || 'General'}</strong> | Ref: {activeTurn?.reference || 'General'} | Empacador: {formatPersonName(session?.fullName, session?.user)} {session?.role === 'Administrador' && '(Admin)'}
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
            /* VISTA INICIAL DE CONTROL DE CAJAS CON TARJETA SECUNDARIA A LA DERECHA */
            <div className="flex flex-col md:flex-row items-start justify-center gap-5 lg:gap-6 w-full max-w-5xl mx-auto">
              {/* CONTENEDOR PRINCIPAL: INSPECCIÓN Y CONTROL DE CAJAS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center space-y-6 flex-1 w-full max-w-xl mx-auto md:mx-0">
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

              {/* TARJETA SECUNDARIA COMPACTA Y DE TAMAÑO REDUCIDO AL LADO DERECHO */}
              <ProductionAuxiliaryCard
                session={session}
                activeTurn={activeTurn}
                userStation={userStation}
                availableMachines={availableMachines}
              />
            </div>
          ) : (
            /* WIZARD PASO A PASO (1 A 3) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto overflow-hidden">
              {/* ENCABEZADO */}
              <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="bg-prod-600 text-white text-xs font-black px-2 py-0.5 rounded-md">
                    PASO {currentStep} DE 3
                  </span>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wide">
                      {currentStep === 1 && 'Control de Peso'}
                      {currentStep === 2 && 'Pruebas de Calidad'}
                      {currentStep === 3 && 'Aprobación Final e Inspección'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {userStation} | Ref: {reference}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {showAutoSave && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium animate-pulse bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Guardado automático</span>
                    </span>
                  )}
                  <button
                    onClick={handlePauseBox}
                    className="bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    title="Pausar caja"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pausar</span>
                  </button>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full bg-slate-100 h-1.5">
                <div
                  className="bg-prod-600 h-1.5 transition-all duration-300"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
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
                {/* PASO 1: CONTROL DE PESO (CON VISTA COMPACTA DEL CONSECUTIVO DE TURNO) */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {/* VISTA COMPACTA DEL CONSECUTIVO DE TURNO */}
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        Consecutivo de Turno:
                      </span>
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                        Caja {boxNumber}
                      </span>
                    </div>

                    {/* CONTROL DE PESOS */}
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
                            onClick={() => {
                              setWeightBottom(String(w));
                              setValidationAlert('');
                            }}
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
                        onChange={(e) => {
                          setWeightBottom(e.target.value);
                          setValidationAlert('');
                        }}
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
                            onClick={() => {
                              setWeightLid(String(w));
                              setValidationAlert('');
                            }}
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
                        onChange={(e) => {
                          setWeightLid(e.target.value);
                          setValidationAlert('');
                        }}
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
                            onClick={() => {
                              setWeightTotal(String(w));
                              setValidationAlert('');
                            }}
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
                        onChange={(e) => {
                          setWeightTotal(e.target.value);
                          setValidationAlert('');
                        }}
                        placeholder="O ingrese valor manual de peso final caja..."
                        className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-prod-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* PASO 2: PRUEBAS DE CALIDAD */}
                {currentStep === 2 && (
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

                {/* PASO 3: APROBACIÓN FINAL E INSPECCIÓN */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    {/* APROBADO POR */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                          Aprobado por *
                        </label>
                        {!approvedBy && (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Seleccionar
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {MASTER_DATA.approvers.map((app) => {
                          const isSelected = approvedBy === app;
                          return (
                            <button
                              key={app}
                              type="button"
                              id={`btn-approver-${app}`}
                              onClick={() => {
                                setApprovedBy(app);
                                setValidationAlert('');
                              }}
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
                    <TimeInput
                      id="prodInpInspectionTime"
                      label="Hora de Inspección *"
                      value={inspectionTime}
                      onChange={(val) => {
                        setInspectionTime(val);
                        setValidationAlert('');
                      }}
                      required
                      accentColor="prod"
                      placeholder="HH:MM (24h)"
                      helperText="Momento exacto en que se realiza la inspección de calidad."
                      onNowClick={() => {
                        setInspectionTime(getNowTimeString());
                        setValidationAlert('');
                      }}
                    />
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
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>

                {currentStep < 3 ? (
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
          {/* BARRA SUPERIOR DEL PANEL EN VIVO */}
          {session?.role === 'Administrador' ? (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
              {/* FILTROS A LA IZQUIERDA */}
              <div className="flex flex-wrap items-end gap-3">
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
                      className="h-9 border border-slate-300 px-2.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-prod-600 focus:outline-none pl-8 bg-white"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
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
                      className="h-9 border border-slate-300 px-2.5 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-prod-600 focus:outline-none pl-8 pr-7 min-w-[170px]"
                    >
                      <option value="">Todas las Estaciones</option>
                      {MASTER_DATA.stations.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <Layers className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {(filterDate || filterStation) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDate('');
                      setFilterStation('');
                    }}
                    className="h-9 px-2 text-xs text-prod-600 hover:text-prod-800 hover:underline font-bold flex items-center transition cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>

              {/* OPCIONES DE CONTROL A LA DERECHA */}
              <div className="flex items-center gap-2.5 self-end shrink-0">
                <span className="h-9 px-3.5 inline-flex items-center justify-center text-xs bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-xs whitespace-nowrap">
                  {sequentialRecords.length} Cajas
                </span>
                {session?.role === 'Administrador' && (
                  <button
                    id="btn-export-excel-production"
                    type="button"
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                    className="h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Descargar archivo en Excel (.xlsx) consolidado"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isExportingExcel ? 'Exportando...' : 'Descargar Excel'}</span>
                  </button>
                )}
                <button
                  id="btn-bulk-delete-production"
                  type="button"
                  onClick={handleBulkDeleteProduction}
                  disabled={sequentialRecords.length === 0 || isDeletingBulk}
                  className="h-9 w-9 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Eliminar registros visualizados"
                  aria-label="Eliminar registros visualizados"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* VISTA PARA USUARIOS CORRIENTES: SIN OPCIONES DE FILTRADO */
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Mis Cajas Registradas</h3>
                <p className="text-xs text-slate-500">Cajas producidas e inspeccionadas durante tu turno de trabajo</p>
              </div>
              <span className="h-9 px-3.5 inline-flex items-center justify-center text-xs bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 whitespace-nowrap">
                {sequentialRecords.length} Cajas
              </span>
            </div>
          )}

          {/* TABLA EN VIVO SECUENCIAL (Caja #1 arriba, consecutivas abajo) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3">USUARIO</th>
                    <th className="p-3"># CAJA</th>
                    <th className="p-3">ESTACION</th>
                    <th className="p-3">TURNO</th>
                    <th className="p-3">FECHA</th>
                    <th className="p-3">REFERENCIA</th>
                    <th className="p-3">PESO VASO INDIVIDUAL</th>
                    <th className="p-3">PESO PLEGADIZA</th>
                    <th className="p-3">PESO FINAL CAJA</th>
                    <th className="p-3 text-center">PRUEBA GOTEO</th>
                    <th className="p-3 text-center">INSPECCION VISUAL</th>
                    <th className="p-3 text-center">PRUEBA RASGADO</th>
                    <th className="p-3">APROBADO POR</th>
                    <th className="p-3">ESTADO</th>
                    <th className="p-3 text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sequentialRecords.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="p-8 text-center text-slate-400">
                        No hay registros de cajas para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    sequentialRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        {/* 1) USUARIO (mostrando el primer nombre) */}
                        <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                          {formatFirstNameUpper(r.packer, r.userId) || '--'}
                        </td>

                        {/* 2) # CAJA */}
                        <td className="p-3 font-mono font-bold text-prod-700 bg-prod-50/40 whitespace-nowrap">
                          Caja #{r.boxNumber}
                        </td>

                        {/* 3) ESTACION */}
                        <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                          {r.station || MASTER_DATA.getStationForMachine(r.machine || '') || 'Estación'}
                        </td>

                        {/* 4) TURNO */}
                        <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                          {r.shift || '--'}
                        </td>

                        {/* 5) FECHA */}
                        <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                          {r.date}
                        </td>

                        {/* 6) REFERENCIA */}
                        <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                          {r.reference || '--'}
                        </td>

                        {/* 7) PESO VASO INDIVIDUAL */}
                        <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                          {r.weightBottom !== undefined && r.weightBottom !== '' ? `${r.weightBottom}g` : '--'}
                        </td>

                        {/* 8) PESO PLEGADIZA */}
                        <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                          {r.weightLid !== undefined && r.weightLid !== '' ? `${r.weightLid}g` : '--'}
                        </td>

                        {/* 9) PESO FINAL CAJA */}
                        <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {r.weightTotal !== undefined && r.weightTotal !== '' ? `${r.weightTotal}g` : '--'}
                        </td>

                        {/* 10) PRUEBA GOTEO */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {r.leakTest ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${r.leakTest === 'CUMPLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {r.leakTest} ({r.leakTestQty || 6})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">--</span>
                          )}
                        </td>

                        {/* 11) INSPECCION VISUAL */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {r.visualInspection ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${r.visualInspection === 'CUMPLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {r.visualInspection} ({r.visualInspectionQty || 200})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">--</span>
                          )}
                        </td>

                        {/* 12) PRUEBA RASGADO */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {r.tearTest ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${r.tearTest === 'CUMPLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {r.tearTest} ({r.tearTestQty || 6})
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">--</span>
                          )}
                        </td>

                        {/* 13) APROBADO POR */}
                        <td className="p-3 font-bold text-emerald-700 uppercase whitespace-nowrap">
                          {r.approvedBy || <span className="text-slate-400 font-mono font-normal">--</span>}
                        </td>

                        {/* 14) ESTADO */}
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

                        {/* 15) ACCIONES */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {r.status !== 'FINALIZADO' && (
                              <button
                                onClick={() => {
                                  setActiveTab('INGRESAR');
                                  handleResumeBox(r);
                                }}
                                className="p-1 text-amber-600 hover:text-amber-700 transition cursor-pointer"
                                title="Reanudar registro de caja"
                              >
                                <Pencil className="w-4 h-4 inline" />
                              </button>
                            )}
                            {session?.role === 'Administrador' ? (
                              <button
                                onClick={() => handleDeleteBox(r.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Eliminar registro (Solo Administrador)"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            ) : r.status === 'FINALIZADO' ? (
                              <span className="text-slate-300 font-mono text-[11px]">--</span>
                            ) : null}
                          </div>
                        </td>
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
