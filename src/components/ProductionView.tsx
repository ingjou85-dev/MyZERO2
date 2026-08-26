import React, { useState, useEffect } from 'react';
import { MASTER_DATA } from '../constants/masterData.ts';
import { RecordService } from '../services/recordService.ts';
import { ProductionQualityRecord, UserSession } from '../types.ts';
import {
  FileText,
  Activity,
  BarChart3,
  Plus,
  CheckCircle2,
  Trash2,
  Download,
  Save,
  AlertCircle,
  Pencil,
  Check,
  Layers,
  Box,
  Scale,
  ShieldCheck,
  XCircle,
  Clock
} from 'lucide-react';

interface ProductionViewProps {
  session: UserSession | null;
  initialTab?: 'INGRESAR' | 'LIVE' | 'DASHBOARD';
  onSaved?: () => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  session,
  initialTab = 'INGRESAR',
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'INGRESAR' | 'LIVE' | 'DASHBOARD'>(initialTab);
  const [records, setRecords] = useState<ProductionQualityRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<ProductionQualityRecord | null>(null);
  const [validationAlert, setValidationAlert] = useState('');
  const [showAutoSave, setShowAutoSave] = useState(false);

  // Form Fields
  const [boxNumber, setBoxNumber] = useState<number>(1);
  const [shift, setShift] = useState(MASTER_DATA.shifts[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [machine, setMachine] = useState(MASTER_DATA.machines[0]);
  const [reference, setReference] = useState(MASTER_DATA.references[0]);
  const [packer, setPacker] = useState(session?.fullName || '');
  const [tech, setTech] = useState('');
  const [aux, setAux] = useState('');

  // Quality checks
  const [weightBottom, setWeightBottom] = useState<string>('');
  const [weightLid, setWeightLid] = useState<string>('');
  const [weightTotal, setWeightTotal] = useState<string>('');
  const [leakTest, setLeakTest] = useState<'CUMPLE' | 'NO_CUMPLE'>('CUMPLE');
  const [visualInspection, setVisualInspection] = useState<'CUMPLE' | 'NO_CUMPLE'>('CUMPLE');
  const [tearTest, setTearTest] = useState<'CUMPLE' | 'NO_CUMPLE'>('CUMPLE');
  const [approval, setApproval] = useState<'APROBADO' | 'RECHAZADO' | 'PENDIENTE'>('APROBADO');
  const [observations, setObservations] = useState('');

  // Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMachine, setFilterMachine] = useState('');
  const [filterPacker, setFilterPacker] = useState('');
  const [filterApproval, setFilterApproval] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const loadRecords = () => {
    const loaded = RecordService.getProductionQualityRecords();
    setRecords(loaded);
  };

  const triggerAutoSaveBadge = () => {
    setShowAutoSave(true);
    setTimeout(() => setShowAutoSave(false), 2000);
  };

  // Calcular peso total automáticamente al cambiar fondo o tapa si no se especifica manual
  useEffect(() => {
    const wb = parseFloat(weightBottom);
    const wl = parseFloat(weightLid);
    if (!isNaN(wb) && !isNaN(wl)) {
      setWeightTotal((wb + wl).toFixed(2));
    }
  }, [weightBottom, weightLid]);

  const handleStartNewBox = () => {
    // Buscar si el usuario actual tiene un turno activo para precargar sus datos
    const activeTurns = RecordService.getProductionTurnRecords();
    const userTurn = session
      ? activeTurns.find(
          (t) =>
            t.packer.toUpperCase() === session.fullName.toUpperCase() &&
            t.status !== 'Finalizado'
        )
      : null;

    const nextBoxNum =
      records.length > 0 ? Math.max(...records.map((r) => r.boxNumber || 0)) + 1 : 1;

    const newRec: ProductionQualityRecord = {
      id: 'pqr-' + Date.now(),
      reportNumber: 'CAJA-' + String(nextBoxNum).padStart(4, '0'),
      boxNumber: nextBoxNum,
      date: new Date().toISOString().split('T')[0],
      shift: userTurn?.shift || MASTER_DATA.shifts[0],
      machine: MASTER_DATA.machines[0],
      reference: userTurn?.reference || MASTER_DATA.references[0],
      packer: userTurn?.packer || session?.fullName || '',
      tech: userTurn?.tech || '',
      aux: userTurn?.aux || '',
      leakTest: 'CUMPLE',
      visualInspection: 'CUMPLE',
      tearTest: 'CUMPLE',
      approval: 'APROBADO',
      status: 'EN_PROCESO'
    };

    setCurrentRecord(newRec);
    setIsFormOpen(true);
    setValidationAlert('');

    setBoxNumber(nextBoxNum);
    setShift(newRec.shift);
    setDate(newRec.date);
    setMachine(newRec.machine);
    setReference(newRec.reference);
    setPacker(newRec.packer);
    setTech(newRec.tech);
    setAux(newRec.aux || '');
    setWeightBottom('');
    setWeightLid('');
    setWeightTotal('');
    setLeakTest('CUMPLE');
    setVisualInspection('CUMPLE');
    setTearTest('CUMPLE');
    setApproval('APROBADO');
    setObservations('');

    const saved = RecordService.saveProductionQualityRecord(newRec);
    setRecords(saved);
    triggerAutoSaveBadge();
  };

  const handleSaveBoxRecord = (status: 'EN_PROCESO' | 'FINALIZADO' | 'PAUSADO') => {
    if (!packer.trim()) {
      setValidationAlert('Por favor ingrese o verifique el nombre del empacador.');
      return;
    }
    if (!machine) {
      setValidationAlert('Por favor seleccione la máquina.');
      return;
    }
    if (!reference) {
      setValidationAlert('Por favor seleccione la referencia.');
      return;
    }

    setValidationAlert('');

    const wb = weightBottom ? parseFloat(weightBottom) : undefined;
    const wl = weightLid ? parseFloat(weightLid) : undefined;
    const wt = weightTotal ? parseFloat(weightTotal) : undefined;

    const recordToSave: ProductionQualityRecord = {
      id: currentRecord?.id || 'pqr-' + Date.now(),
      reportNumber: currentRecord?.reportNumber || 'CAJA-' + String(boxNumber).padStart(4, '0'),
      boxNumber,
      date,
      shift,
      machine,
      reference,
      packer: packer.trim().toUpperCase(),
      tech: tech.trim().toUpperCase(),
      aux: aux.trim().toUpperCase(),
      weightBottom: wb,
      weightLid: wl,
      weightTotal: wt,
      leakTest,
      visualInspection,
      tearTest,
      approval,
      observations: observations.trim().toUpperCase(),
      status
    };

    const updated = RecordService.saveProductionQualityRecord(recordToSave);
    setRecords(updated);
    triggerAutoSaveBadge();

    if (status === 'FINALIZADO' || status === 'PAUSADO') {
      setIsFormOpen(false);
      setCurrentRecord(null);
      if (onSaved) onSaved();
    }
  };

  const handleEditRecord = (rec: ProductionQualityRecord) => {
    setCurrentRecord(rec);
    setIsFormOpen(true);
    setValidationAlert('');

    setBoxNumber(rec.boxNumber || 1);
    setShift(rec.shift || MASTER_DATA.shifts[0]);
    setDate(rec.date || new Date().toISOString().split('T')[0]);
    setMachine(rec.machine || MASTER_DATA.machines[0]);
    setReference(rec.reference || MASTER_DATA.references[0]);
    setPacker(rec.packer || '');
    setTech(rec.tech || '');
    setAux(rec.aux || '');
    setWeightBottom(rec.weightBottom !== undefined ? String(rec.weightBottom) : '');
    setWeightLid(rec.weightLid !== undefined ? String(rec.weightLid) : '');
    setWeightTotal(rec.weightTotal !== undefined ? String(rec.weightTotal) : '');
    setLeakTest(rec.leakTest || 'CUMPLE');
    setVisualInspection(rec.visualInspection || 'CUMPLE');
    setTearTest(rec.tearTest || 'CUMPLE');
    setApproval(rec.approval || 'APROBADO');
    setObservations(rec.observations || '');

    setActiveTab('INGRESAR');
  };

  const handleDeleteRecord = (id: string) => {
    if (session?.role !== 'Administrador') {
      alert('Acción restringida: solo los usuarios administradores pueden eliminar registros de producción.');
      return;
    }
    if (window.confirm('¿Está seguro de eliminar esta caja de inspección de calidad?')) {
      const remaining = RecordService.deleteProductionQualityRecord(id);
      setRecords(remaining);
      if (currentRecord?.id === id) {
        setIsFormOpen(false);
        setCurrentRecord(null);
      }
    }
  };

  // Filtrado de la tabla
  const filteredRecords = records.filter((r) => {
    const s = filterSearch.toLowerCase();
    const matchSearch =
      !s ||
      r.reportNumber.toLowerCase().includes(s) ||
      (r.packer && r.packer.toLowerCase().includes(s)) ||
      (r.reference && r.reference.toLowerCase().includes(s)) ||
      (r.machine && r.machine.toLowerCase().includes(s));
    const matchMachine = !filterMachine || r.machine === filterMachine;
    const matchPacker = !filterPacker || r.packer === filterPacker;
    const matchApproval = !filterApproval || r.approval === filterApproval;
    const matchDate = !filterDate || r.date === filterDate;
    return matchSearch && matchMachine && matchPacker && matchApproval && matchDate;
  });

  // Métricas para el Dashboard
  const totalBoxes = records.length;
  const approvedBoxes = records.filter((r) => r.approval === 'APROBADO').length;
  const rejectedBoxes = records.filter((r) => r.approval === 'RECHAZADO').length;
  const approvalRate = totalBoxes > 0 ? Math.round((approvedBoxes / totalBoxes) * 100) : 0;

  // Cajas por Máquina
  const machineBoxesMap: { [key: string]: number } = {};
  records.forEach((r) => {
    if (r.machine) {
      machineBoxesMap[r.machine] = (machineBoxesMap[r.machine] || 0) + 1;
    }
  });
  const topMachines = Object.entries(machineBoxesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxBoxes = Math.max(...topMachines.map((m) => m[1]), 1);

  return (
    <section id="viewProduction" className="space-y-6 max-w-6xl mx-auto w-full">
      {/* PESTAÑAS NAVEGACIÓN INTERNA PRODUCCIÓN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm flex flex-wrap gap-1">
        <button
          id="tabBtnProdIngresar"
          onClick={() => setActiveTab('INGRESAR')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${
            activeTab === 'INGRESAR'
              ? 'bg-prod-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Ingresar Datos
        </button>
        <button
          id="tabBtnProdLive"
          onClick={() => setActiveTab('LIVE')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${
            activeTab === 'LIVE'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Panel en Vivo
        </button>
        <button
          id="tabBtnProdDash"
          onClick={() => setActiveTab('DASHBOARD')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${
            activeTab === 'DASHBOARD'
              ? 'bg-prod-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* PESTAÑA 1: INGRESAR DATOS (INSPECCIÓN DE CALIDAD POR CAJA) */}
      {activeTab === 'INGRESAR' && (
        <div id="prodTabIngresar" className="space-y-6">
          <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase">
                CONTROL DE CALIDAD POR CAJA FABRICADA
              </h2>
              <p className="text-xs text-slate-500">
                Inspección de pesos, hermeticidad, goteo, rasgado y visto bueno de producción
              </p>
            </div>
            <button
              id="btnNewProdBox"
              onClick={handleStartNewBox}
              className="bg-prod-600 hover:bg-prod-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Nueva Caja
            </button>
          </div>

          {isFormOpen ? (
            <div
              id="prodFormContainer"
              className="bg-white p-6 rounded-2xl border-2 border-prod-600 shadow-xl space-y-6 animate-in fade-in"
            >
              {/* CABECERA FORMULARIO */}
              <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3 gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-white bg-prod-600 px-3 py-1 rounded-lg uppercase flex items-center gap-1">
                    <Box className="w-3.5 h-3.5" />
                    Caja #{boxNumber}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    Código: <strong className="text-slate-800">{currentRecord?.reportNumber}</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  {showAutoSave && (
                    <span
                      id="autoSaveIndicatorProd"
                      className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Sincronizado
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveBoxRecord('PAUSADO')}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-black px-3.5 py-1.5 rounded-xl text-xs shadow flex items-center gap-1 transition"
                  >
                    PAUSAR CAJA
                  </button>
                </div>
              </div>

              {validationAlert && (
                <div
                  id="prodFormValidationAlert"
                  className="p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  {validationAlert}
                </div>
              )}

              {/* SECCIÓN 1: DATOS OPERATIVOS DEL TURNO */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-prod-600"></span>
                  1. Datos Operativos de la Caja
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      N° de Caja
                    </label>
                    <input
                      type="number"
                      id="inpBoxNumber"
                      value={boxNumber}
                      onChange={(e) => setBoxNumber(parseInt(e.target.value) || 1)}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-black text-prod-700 focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Turno *
                    </label>
                    <select
                      id="inpProdShift"
                      value={shift}
                      onChange={(e) => setShift(e.target.value)}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-prod-600 focus:outline-none"
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
                      Fecha *
                    </label>
                    <input
                      type="date"
                      id="inpProdDate"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Máquina (Oficial) *
                    </label>
                    <select
                      id="inpProdMachine"
                      value={machine}
                      onChange={(e) => setMachine(e.target.value)}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs bg-white font-bold text-prod-700 focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    >
                      {MASTER_DATA.machines.map((m) => (
                        <option key={m} value={m}>
                          Máquina {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Referencia *
                    </label>
                    <select
                      id="inpProdReference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs bg-white font-semibold focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    >
                      {MASTER_DATA.references.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Empacador *
                    </label>
                    <input
                      type="text"
                      id="inpProdPacker"
                      value={packer}
                      onChange={(e) => setPacker(e.target.value.toUpperCase())}
                      placeholder="Nombre empacador"
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs uppercase font-semibold focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Técnico
                    </label>
                    <select
                      id="inpProdTech"
                      value={tech}
                      onChange={(e) => setTech(e.target.value)}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    >
                      <option value="">-- Seleccionar --</option>
                      {MASTER_DATA.technicians.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Auxiliar
                    </label>
                    <select
                      id="inpProdAux"
                      value={aux}
                      onChange={(e) => setAux(e.target.value)}
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    >
                      <option value="">-- Seleccionar --</option>
                      {MASTER_DATA.auxiliaries.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: CONTROL DE PESOS (g) */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-prod-600" />
                  2. Control de Pesos (gramos)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Peso Fondo (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="inpWeightBottom"
                      value={weightBottom}
                      onChange={(e) => setWeightBottom(e.target.value)}
                      placeholder="Ej: 12.50"
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Peso Tapa (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="inpWeightLid"
                      value={weightLid}
                      onChange={(e) => setWeightLid(e.target.value)}
                      placeholder="Ej: 8.30"
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Peso Total Conjunto (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="inpWeightTotal"
                      value={weightTotal}
                      onChange={(e) => setWeightTotal(e.target.value)}
                      placeholder="Ej: 20.80"
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-black text-prod-700 bg-white focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: PRUEBAS DE CALIDAD */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  3. Pruebas de Calidad e Inspección
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* PRUEBA GOTEO */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Prueba de Goteo (Hermeticidad)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLeakTest('CUMPLE')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                          leakTest === 'CUMPLE'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-300'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> Cumple
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeakTest('NO_CUMPLE')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                          leakTest === 'NO_CUMPLE'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-300'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Falla
                      </button>
                    </div>
                  </div>

                  {/* INSPECCIÓN VISUAL */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Inspección Visual (Acabado)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setVisualInspection('CUMPLE')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                          visualInspection === 'CUMPLE'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-300'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> Cumple
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisualInspection('NO_CUMPLE')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                          visualInspection === 'NO_CUMPLE'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-300'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Falla
                      </button>
                    </div>
                  </div>

                  {/* PRUEBA DE RASGADO */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Prueba de Rasgado / Resistencia
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTearTest('CUMPLE')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                          tearTest === 'CUMPLE'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-300'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> Cumple
                      </button>
                      <button
                        type="button"
                        onClick={() => setTearTest('NO_CUMPLE')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                          tearTest === 'NO_CUMPLE'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-300'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Falla
                      </button>
                    </div>
                  </div>
                </div>

                {/* VISTO BUENO Y OBSERVACIONES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Visto Bueno / Dictamen Calidad *
                    </label>
                    <select
                      id="inpProdApproval"
                      value={approval}
                      onChange={(e) => setApproval(e.target.value as any)}
                      className={`w-full border p-2.5 rounded-xl text-xs font-black uppercase focus:outline-none ${
                        approval === 'APROBADO'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : approval === 'RECHAZADO'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="APROBADO">✓ APROBADO</option>
                      <option value="RECHAZADO">✗ RECHAZADO</option>
                      <option value="PENDIENTE">⏳ PENDIENTE</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Observaciones / Defectos Detectados
                    </label>
                    <input
                      type="text"
                      id="inpProdObs"
                      value={observations}
                      onChange={(e) => setObservations(e.target.value.toUpperCase())}
                      placeholder="Describa incidencias de calidad, rebabas, porosidad..."
                      className="w-full border border-slate-300 p-2.5 rounded-xl text-xs uppercase font-medium focus:ring-2 focus:ring-prod-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSaveBoxRecord('PAUSADO')}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs shadow flex items-center gap-1.5 transition"
                >
                  Pausar Caja
                </button>
                <button
                  type="button"
                  id="btn-finalize-prod-box"
                  onClick={() => handleSaveBoxRecord('FINALIZADO')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md flex items-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  GUARDAR Y FINALIZAR CAJA
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <p className="text-sm font-bold text-slate-600">
                No hay ninguna caja de producción en proceso de registro.
              </p>
              <p className="text-xs text-slate-400">
                Haga clic en <strong>"Nueva Caja"</strong> para registrar la inspección de una caja fabricada o consulte el <strong>"Panel en Vivo"</strong>.
              </p>
              <button
                onClick={handleStartNewBox}
                className="bg-prod-600 hover:bg-prod-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow inline-flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Registrar Nueva Caja
              </button>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: PANEL EN VIVO (TABLA COMPLETA + EXPORTACIÓN EXCEL) */}
      {activeTab === 'LIVE' && (
        <div id="prodTabLive" className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-3">
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  PANEL EN VIVO — INSPECCIONES DE CALIDAD PRODUCCIÓN
                </h3>
                <p className="text-xs text-slate-500">
                  Monitoreo de cajas, pesos, pruebas de hermeticidad y dictamen de calidad
                </p>
              </div>
              <button
                id="btn-export-prod-excel"
                onClick={() => RecordService.exportProductionQualityToExcel(records)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow uppercase flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                EXPORTAR A EXCEL
              </button>
            </div>

            {/* FILTROS */}
            <div className="p-4 bg-slate-50 border-b grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                type="text"
                id="filterProdSearch"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Buscar caja, empacador, ref..."
                className="border border-slate-300 p-2 rounded-xl text-xs uppercase bg-white focus:ring-2 focus:ring-prod-600 focus:outline-none"
              />
              <select
                id="filterProdMachine"
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                className="border border-slate-300 p-2 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-prod-600 focus:outline-none"
              >
                <option value="">Todas las Máquinas</option>
                {MASTER_DATA.machines.map((m) => (
                  <option key={m} value={m}>
                    Máquina {m}
                  </option>
                ))}
              </select>
              <input
                type="text"
                id="filterProdPacker"
                value={filterPacker}
                onChange={(e) => setFilterPacker(e.target.value)}
                placeholder="Filtrar por empacador..."
                className="border border-slate-300 p-2 rounded-xl text-xs uppercase bg-white focus:ring-2 focus:ring-prod-600 focus:outline-none"
              />
              <select
                id="filterProdApproval"
                value={filterApproval}
                onChange={(e) => setFilterApproval(e.target.value)}
                className="border border-slate-300 p-2 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-prod-600 focus:outline-none"
              >
                <option value="">Todos los Dictámenes</option>
                <option value="APROBADO">APROBADO</option>
                <option value="RECHAZADO">RECHAZADO</option>
                <option value="PENDIENTE">PENDIENTE</option>
              </select>
              <input
                type="date"
                id="filterProdDate"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="border border-slate-300 p-2 rounded-xl text-xs bg-white focus:ring-2 focus:ring-prod-600 focus:outline-none font-bold"
              />
            </div>

            {/* TABLA DE REGISTROS DE PRODUCCIÓN */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold uppercase text-slate-600 border-b">
                    <th className="p-3">Turno</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">N° Caja</th>
                    <th className="p-3">Máquina</th>
                    <th className="p-3">Referencia</th>
                    <th className="p-3">Empacador</th>
                    <th className="p-3">P. Fondo</th>
                    <th className="p-3">P. Tapa</th>
                    <th className="p-3">P. Total</th>
                    <th className="p-3">Goteo</th>
                    <th className="p-3">Visual</th>
                    <th className="p-3">Rasgado</th>
                    <th className="p-3">Visto Bueno</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody id="tblProdBody" className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-6 text-center text-slate-400">
                        Sin registros de calidad de producción almacenados.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const approvalBadge =
                        r.approval === 'APROBADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.approval === 'RECHAZADO'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-semibold text-slate-700">{r.shift || '-'}</td>
                          <td className="p-3 font-medium">{r.date}</td>
                          <td className="p-3 font-black text-prod-700">#{r.boxNumber}</td>
                          <td className="p-3 font-bold text-slate-800">{r.machine}</td>
                          <td className="p-3 font-medium text-emerald-700">{r.reference}</td>
                          <td className="p-3 uppercase max-w-[120px] truncate" title={r.packer}>
                            {r.packer}
                          </td>
                          <td className="p-3">{r.weightBottom ? `${r.weightBottom}g` : '-'}</td>
                          <td className="p-3">{r.weightLid ? `${r.weightLid}g` : '-'}</td>
                          <td className="p-3 font-bold text-slate-800">{r.weightTotal ? `${r.weightTotal}g` : '-'}</td>
                          <td className="p-3">
                            <span className={r.leakTest === 'CUMPLE' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {r.leakTest === 'CUMPLE' ? '✓' : '✗'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={r.visualInspection === 'CUMPLE' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {r.visualInspection === 'CUMPLE' ? '✓' : '✗'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={r.tearTest === 'CUMPLE' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {r.tearTest === 'CUMPLE' ? '✓' : '✗'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${approvalBadge}`}
                            >
                              {r.approval || 'APROBADO'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditRecord(r)}
                                className="text-slate-600 hover:text-prod-700 bg-slate-100 hover:bg-prod-50 p-1.5 rounded-lg transition"
                                title="Editar inspección"
                              >
                                <Pencil className="w-3.5 h-3.5 text-prod-600" />
                              </button>

                              {/* RESTRINGIR ELIMINAR A ADMINISTRADORES */}
                              {session?.role === 'Administrador' && (
                                <button
                                  onClick={() => handleDeleteRecord(r.id)}
                                  className="text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 p-1.5 rounded-lg transition"
                                  title="Eliminar registro (Solo Administrador)"
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

      {/* PESTAÑA 3: DASHBOARD DE PRODUCCIÓN */}
      {activeTab === 'DASHBOARD' && (
        <div id="prodTabDash" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Total Cajas Fabricadas
              </span>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalBoxes}</p>
              <p className="text-[11px] text-slate-400 mt-1">Registradas e inspeccionadas</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Tasa de Calidad
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{approvalRate}%</p>
              <p className="text-[11px] text-slate-400 mt-1">{approvedBoxes} cajas conformes</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Cajas Rechazadas
              </span>
              <p className="text-2xl font-black text-rose-600 mt-1">{rejectedBoxes}</p>
              <p className="text-[11px] text-slate-400 mt-1">No conformes con calidad</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500">
                Máquinas Activas
              </span>
              <p className="text-2xl font-black text-prod-600 mt-1">
                {Object.keys(machineBoxesMap).length}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">En producción este turno</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CAJAS POR MÁQUINA */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase text-slate-800 border-b pb-2">
                Cajas Fabricadas por Máquina
              </h4>
              <div className="space-y-3">
                {topMachines.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin datos de producción por máquina.</p>
                ) : (
                  topMachines.map(([mName, count]) => {
                    const pct = Math.round((count / maxBoxes) * 100);
                    return (
                      <div key={mName} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>Máquina {mName}</span>
                          <span className="text-prod-700 font-bold">{count} cajas</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-prod-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ESTADO DE CONFORMIDAD DE CALIDAD */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-bold text-xs uppercase text-slate-800 border-b pb-2">
                Resumen de Visto Bueno de Calidad
              </h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-700">Aprobadas</span>
                    <span className="font-bold">{approvedBoxes} ({totalBoxes ? Math.round((approvedBoxes / totalBoxes) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${totalBoxes ? (approvedBoxes / totalBoxes) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-700">Rechazadas</span>
                    <span className="font-bold">{rejectedBoxes} ({totalBoxes ? Math.round((rejectedBoxes / totalBoxes) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${totalBoxes ? (rejectedBoxes / totalBoxes) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-700">Pendientes</span>
                    <span className="font-bold">
                      {totalBoxes - approvedBoxes - rejectedBoxes} ({totalBoxes ? Math.round(((totalBoxes - approvedBoxes - rejectedBoxes) / totalBoxes) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full"
                      style={{ width: `${totalBoxes ? ((totalBoxes - approvedBoxes - rejectedBoxes) / totalBoxes) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
