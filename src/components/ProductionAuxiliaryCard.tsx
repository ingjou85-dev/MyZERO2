import React, { useState } from 'react';
import { UserSession, ProductionTurnRecord, ProductionTraceabilityRecord, ProductionWasteRecord, WasteItem } from '../types.ts';
import { RecordService } from '../services/recordService.ts';
import {
  Layers,
  QrCode,
  Scale,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Tag
} from 'lucide-react';

interface ProductionAuxiliaryCardProps {
  session: UserSession | null;
  activeTurn?: ProductionTurnRecord | null;
  userStation: string;
  availableMachines: string[];
}

const WASTE_REASONS = [
  'CUADRE MÁQUINA',
  'PUNTA',
  'ENCERADO',
  'MERMA',
  'ROLLO',
  'OTROS'
] as const;

export const ProductionAuxiliaryCard: React.FC<ProductionAuxiliaryCardProps> = ({
  session,
  activeTurn,
  userStation,
  availableMachines
}) => {
  // Sección actualmente desplegada ('TRAZABILIDAD' | 'DESPERDICIO' | null)
  const [expandedSection, setExpandedSection] = useState<'TRAZABILIDAD' | 'DESPERDICIO' | null>(null);

  // --- ESTADO TRAZABILIDAD ---
  const [trazMachine, setTrazMachine] = useState<string>('');
  const [trazRollCode, setTrazRollCode] = useState<string>('');
  const [isSavingTraz, setIsSavingTraz] = useState<boolean>(false);
  const [trazAlert, setTrazAlert] = useState<string>('');
  const [trazSuccess, setTrazSuccess] = useState<string>('');

  // --- ESTADO DESPERDICIO ---
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [otherDescription, setOtherDescription] = useState<string>('');
  const [wasteMachine, setWasteMachine] = useState<string>(availableMachines[0] || '');
  const [isSavingWaste, setIsSavingWaste] = useState<boolean>(false);
  const [wasteAlert, setWasteAlert] = useState<string>('');
  const [wasteSuccess, setWasteSuccess] = useState<string>('');

  const getNowTimeString = (): string => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const toggleSection = (section: 'TRAZABILIDAD' | 'DESPERDICIO') => {
    setTrazAlert('');
    setTrazSuccess('');
    setWasteAlert('');
    setWasteSuccess('');
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // --- LÓGICA DE TRAZABILIDAD ---
  const handleFinalizeTraceability = async () => {
    setTrazAlert('');
    setTrazSuccess('');

    if (!trazMachine) {
      setTrazAlert('Por favor seleccione una máquina.');
      return;
    }
    if (!trazRollCode.trim()) {
      setTrazAlert('Por favor ingrese el Código del Rollo.');
      return;
    }

    try {
      setIsSavingTraz(true);
      const record: ProductionTraceabilityRecord = {
        id: 'traz-' + Date.now(),
        date: activeTurn?.date || new Date().toISOString().split('T')[0],
        time: getNowTimeString(),
        station: userStation,
        shift: activeTurn?.shift || '',
        machine: trazMachine,
        rollCode: trazRollCode.trim().toUpperCase(),
        operator: (session?.fullName || activeTurn?.packer || 'Operario').toUpperCase(),
        userId: session?.user || '',
        createdAt: new Date().toISOString(),
        status: 'FINALIZADO'
      };

      await RecordService.saveTraceabilityRecord(record);
      setTrazSuccess(`✓ Rollo ${record.rollCode} guardado exitosamente en Firestore.`);
      setTrazMachine('');
      setTrazRollCode('');
      setIsSavingTraz(false);
    } catch (error) {
      console.error('Error al guardar trazabilidad:', error);
      setTrazAlert('Error al conectar con Firestore. Intente de nuevo.');
      setIsSavingTraz(false);
    }
  };

  // --- LÓGICA DE DESPERDICIO ---
  const handleToggleReason = (reason: string) => {
    setWasteAlert('');
    setWasteSuccess('');
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) {
        next.delete(reason);
        setWeights((prevWeights) => {
          const updated = { ...prevWeights };
          delete updated[reason];
          return updated;
        });
        if (reason === 'OTROS') {
          setOtherDescription('');
        }
      } else {
        next.add(reason);
      }
      return next;
    });
  };

  const handleWeightChange = (reason: string, val: string) => {
    setWasteAlert('');
    setWasteSuccess('');
    setWeights((prev) => ({
      ...prev,
      [reason]: val
    }));
  };

  const totalWasteKg = Object.entries(weights).reduce((acc, [reason, val]) => {
    if (selectedReasons.has(reason)) {
      const num = parseFloat(String(val));
      return acc + (isNaN(num) ? 0 : num);
    }
    return acc;
  }, 0);

  const handleFinalizeWaste = async () => {
    setWasteAlert('');
    setWasteSuccess('');

    if (selectedReasons.size === 0) {
      setWasteAlert('Seleccione al menos un motivo de desperdicio.');
      return;
    }

    const items: WasteItem[] = [];
    for (const reason of selectedReasons) {
      const wVal = parseFloat(weights[reason] || '0');
      if (isNaN(wVal) || wVal <= 0) {
        setWasteAlert(`Ingrese un peso válido en kg para: ${reason}.`);
        return;
      }
      if (reason === 'OTROS' && !otherDescription.trim()) {
        setWasteAlert('Especifique la descripción para OTROS.');
        return;
      }
      items.push({
        reason,
        weightKg: wVal,
        otherDescription: reason === 'OTROS' ? otherDescription.trim().toUpperCase() : undefined
      });
    }

    try {
      setIsSavingWaste(true);
      const record: ProductionWasteRecord = {
        id: 'waste-' + Date.now(),
        date: activeTurn?.date || new Date().toISOString().split('T')[0],
        time: getNowTimeString(),
        station: userStation,
        shift: activeTurn?.shift || '',
        machine: wasteMachine || availableMachines[0] || '',
        operator: (session?.fullName || activeTurn?.packer || 'Operario').toUpperCase(),
        userId: session?.user || '',
        items,
        totalWeightKg: parseFloat(totalWasteKg.toFixed(2)),
        createdAt: new Date().toISOString(),
        status: 'FINALIZADO'
      };

      await RecordService.saveWasteRecord(record);
      setWasteSuccess(`✓ Desperdicio (${totalWasteKg.toFixed(2)} kg) guardado en Firestore.`);
      setSelectedReasons(new Set());
      setWeights({});
      setOtherDescription('');
      setIsSavingWaste(false);
    } catch (error) {
      console.error('Error al guardar desperdicio:', error);
      setWasteAlert('Error al conectar con Firestore. Intente de nuevo.');
      setIsSavingWaste(false);
    }
  };

  const isTrazOpen = expandedSection === 'TRAZABILIDAD';
  const isWasteOpen = expandedSection === 'DESPERDICIO';

  return (
    <div className="w-full md:w-80 lg:w-84 shrink-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3 text-left transition-all">
      {/* CABECERA DE LA TARJETA */}
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
            REGISTROS OPERATIVOS
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">
            Accesos directos de estación
          </p>
        </div>
      </div>

      {/* CONTENEDOR VERTICAL (FLEX-COL) CON LAS OPCIONES APILADAS ESTRICTAMENTE */}
      <div className="flex flex-col space-y-3">
        {/* ============================================================ */}
        {/* OPCIÓN 1: TRAZABILIDAD (EN LA PARTE SUPERIOR)                 */}
        {/* ============================================================ */}
        <div
          className={`rounded-xl border transition-all duration-200 overflow-hidden ${
            isTrazOpen
              ? 'border-prod-500 bg-prod-50/20 shadow-xs ring-1 ring-prod-500/20'
              : 'border-slate-200 bg-slate-50/60 hover:bg-prod-50/30 hover:border-prod-300'
          }`}
        >
          {/* BOTÓN / CABECERA DE TRAZABILIDAD */}
          <button
            type="button"
            id="btn-desplegar-trazabilidad"
            onClick={() => toggleSection('TRAZABILIDAD')}
            className="w-full text-left p-3 flex items-center justify-between cursor-pointer group select-none"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition ${
                  isTrazOpen
                    ? 'bg-prod-600 text-white border-prod-600 shadow-xs'
                    : 'bg-prod-100 text-prod-700 border-prod-200 group-hover:bg-prod-600 group-hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h4
                  className={`text-xs font-black uppercase tracking-tight transition ${
                    isTrazOpen ? 'text-prod-800' : 'text-slate-900 group-hover:text-prod-700'
                  }`}
                >
                  TRAZABILIDAD
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Máquina y código del rollo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-prod-700">
              <span className="text-[10px] uppercase tracking-wider">
                {isTrazOpen ? 'Cerrar' : 'Abrir'}
              </span>
              {isTrazOpen ? (
                <ChevronUp className="w-4 h-4 text-prod-700" />
              ) : (
                <ChevronDown className="w-4 h-4 text-prod-600 group-hover:translate-y-0.5 transition" />
              )}
            </div>
          </button>

          {/* FORMULARIO DESPLEGADO DE TRAZABILIDAD */}
          {isTrazOpen && (
            <div className="p-3 pt-1 border-t border-prod-100/80 space-y-3 bg-white animate-in fade-in duration-150">
              {/* Alertas */}
              {trazAlert && (
                <div className="p-2 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{trazAlert}</span>
                </div>
              )}
              {trazSuccess && (
                <div className="p-2 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{trazSuccess}</span>
                </div>
              )}

              {/* REUTILIZACIÓN EXACTA DEL SELECTOR DE MÁQUINA DE MANTENIMIENTO */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Máquina ({userStation}) *
                  </label>
                  {trazMachine ? (
                    <span className="text-[9px] font-bold text-prod-700 bg-prod-50 px-1.5 py-0.5 rounded border border-prod-200">
                      {trazMachine}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400">
                      Seleccionar
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {availableMachines.map((m) => {
                    const isSelected = trazMachine === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        id={`traz-chip-machine-${m}`}
                        onClick={() => {
                          setTrazMachine(m);
                          setTrazAlert('');
                          setTrazSuccess('');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-prod-600 text-white border-prod-600 shadow-xs ring-2 ring-prod-400/30'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CAMPO CÓDIGO DEL ROLLO */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Código del Rollo *
                </label>
                <input
                  type="text"
                  id="inp-traz-codigo-rollo"
                  value={trazRollCode}
                  onChange={(e) => {
                    setTrazRollCode(e.target.value.toUpperCase());
                    setTrazAlert('');
                    setTrazSuccess('');
                  }}
                  placeholder="EJ: ROL-451-9824"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 uppercase focus:bg-white focus:ring-2 focus:ring-prod-600 focus:outline-none"
                />
              </div>

              {/* BOTÓN FINALIZAR TRAZABILIDAD */}
              <button
                type="button"
                id="btn-finalizar-trazabilidad"
                onClick={handleFinalizeTraceability}
                disabled={isSavingTraz}
                className="w-full bg-prod-600 hover:bg-prod-700 text-white font-black py-2 px-3 rounded-lg text-xs uppercase shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSavingTraz ? 'Guardando...' : 'Finalizar'}
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* OPCIÓN 2: DESPERDICIO (UBICADO DIRECTAMENTE ABAJO)            */}
        {/* ============================================================ */}
        <div
          className={`rounded-xl border transition-all duration-200 overflow-hidden ${
            isWasteOpen
              ? 'border-amber-500 bg-amber-50/20 shadow-xs ring-1 ring-amber-500/20'
              : 'border-slate-200 bg-slate-50/60 hover:bg-amber-50/30 hover:border-amber-300'
          }`}
        >
          {/* BOTÓN / CABECERA DE DESPERDICIO */}
          <button
            type="button"
            id="btn-desplegar-desperdicio"
            onClick={() => toggleSection('DESPERDICIO')}
            className="w-full text-left p-3 flex items-center justify-between cursor-pointer group select-none"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition ${
                  isWasteOpen
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-100 text-amber-800 border-amber-200 group-hover:bg-amber-600 group-hover:text-white'
                }`}
              >
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h4
                  className={`text-xs font-black uppercase tracking-tight transition ${
                    isWasteOpen ? 'text-amber-900' : 'text-slate-900 group-hover:text-amber-800'
                  }`}
                >
                  DESPERDICIO
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Motivos y peso (kg)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
              <span className="text-[10px] uppercase tracking-wider">
                {isWasteOpen ? 'Cerrar' : 'Abrir'}
              </span>
              {isWasteOpen ? (
                <ChevronUp className="w-4 h-4 text-amber-800" />
              ) : (
                <ChevronDown className="w-4 h-4 text-amber-700 group-hover:translate-y-0.5 transition" />
              )}
            </div>
          </button>

          {/* FORMULARIO DESPLEGADO DE DESPERDICIO */}
          {isWasteOpen && (
            <div className="p-3 pt-1 border-t border-amber-100/80 space-y-3 bg-white animate-in fade-in duration-150">
              {/* Alertas */}
              {wasteAlert && (
                <div className="p-2 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{wasteAlert}</span>
                </div>
              )}
              {wasteSuccess && (
                <div className="p-2 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{wasteSuccess}</span>
                </div>
              )}

              {/* LISTA DE MOTIVOS CON ENTRADA CONTIGUA EN KG */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Motivos de Desperdicio *
                  </label>
                  <span className="text-[9px] font-bold text-slate-400">
                    Peso (kg)
                  </span>
                </div>

                <div className="space-y-1.5 bg-slate-50/70 p-2 rounded-lg border border-slate-200">
                  {WASTE_REASONS.map((reason) => {
                    const isSelected = selectedReasons.has(reason);
                    return (
                      <div key={reason} className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          {/* Checkbox y motivo */}
                          <button
                            type="button"
                            onClick={() => handleToggleReason(reason)}
                            className="flex items-center gap-2 flex-1 text-left cursor-pointer group select-none"
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition shrink-0 ${
                                isSelected
                                  ? 'bg-amber-600 border-amber-600 text-white'
                                  : 'bg-white border-slate-300 group-hover:border-slate-400'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span
                              className={`text-[11px] font-bold uppercase transition ${
                                isSelected ? 'text-amber-950' : 'text-slate-700 group-hover:text-slate-900'
                              }`}
                            >
                              {reason}
                            </span>
                          </button>

                          {/* Entrada numérica contigua */}
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={!isSelected}
                              value={weights[reason] || ''}
                              onChange={(e) => handleWeightChange(reason, e.target.value)}
                              placeholder="0.00"
                              className={`w-18 px-1.5 py-0.5 text-right font-mono text-[11px] font-bold border rounded focus:outline-none focus:ring-1 focus:ring-amber-500 transition ${
                                isSelected
                                  ? 'bg-white border-slate-300 text-slate-900 shadow-2xs'
                                  : 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                              }`}
                            />
                            <span
                              className={`text-[10px] font-bold ${
                                isSelected ? 'text-slate-600' : 'text-slate-300'
                              }`}
                            >
                              kg
                            </span>
                          </div>
                        </div>

                        {/* Campo libre para OTROS */}
                        {reason === 'OTROS' && isSelected && (
                          <div className="pl-5 pt-0.5">
                            <input
                              type="text"
                              value={otherDescription}
                              onChange={(e) => {
                                setOtherDescription(e.target.value.toUpperCase());
                                setWasteAlert('');
                              }}
                              placeholder="Especifique otro motivo..."
                              className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-[11px] text-slate-800 uppercase focus:ring-1 focus:ring-amber-500 focus:outline-none placeholder:normal-case placeholder:text-slate-400"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TOTALIZADOR EN KG */}
              <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-950">
                <span className="text-[11px]">Total acumulado:</span>
                <span className="font-mono text-xs font-black text-amber-900">
                  {totalWasteKg.toFixed(2)} kg
                </span>
              </div>

              {/* BOTÓN FINALIZAR DESPERDICIO */}
              <button
                type="button"
                id="btn-finalizar-desperdicio"
                onClick={handleFinalizeWaste}
                disabled={isSavingWaste}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-2 px-3 rounded-lg text-xs uppercase shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSavingWaste ? 'Guardando...' : 'Finalizar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
