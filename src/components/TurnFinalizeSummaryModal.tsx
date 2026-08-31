import React from 'react';
import { ProductionTurnRecord, ProductionQualityRecord, UserSession } from '../types.ts';
import {
  X,
  CheckCircle2,
  Package,
  Layers,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  PowerOff
} from 'lucide-react';

interface TurnFinalizeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFinalize: () => void;
  turn: ProductionTurnRecord | null;
  session: UserSession | null;
  qualityRecords: ProductionQualityRecord[];
  isFinalizing?: boolean;
}

export const TurnFinalizeSummaryModal: React.FC<TurnFinalizeSummaryModalProps> = ({
  isOpen,
  onClose,
  onConfirmFinalize,
  turn,
  session,
  qualityRecords,
  isFinalizing = false
}) => {
  if (!isOpen) return null;

  const currentPacker = (session?.fullName || turn?.packer || '').toUpperCase();

  // Filtrar registros de producción del turno / operario actual
  const userRecords = qualityRecords.filter((r) => {
    if (!r.packer) return false;
    const isSamePacker = r.packer.toUpperCase() === currentPacker;
    if (turn?.date) {
      return isSamePacker && r.date === turn.date;
    }
    return isSamePacker;
  });

  // Agrupar cantidad de cajas según su referencia
  const referenceMap: Record<string, { count: number; boxes: number[] }> = {};
  let totalBoxes = 0;
  let compliantCount = 0;

  userRecords.forEach((rec) => {
    const ref = rec.reference || turn?.reference || 'Sin Referencia';
    if (!referenceMap[ref]) {
      referenceMap[ref] = { count: 0, boxes: [] };
    }
    referenceMap[ref].count += 1;
    if (rec.boxNumber) {
      referenceMap[ref].boxes.push(rec.boxNumber);
    }
    totalBoxes += 1;

    if (
      rec.leakTest === 'CUMPLE' &&
      rec.visualInspection === 'CUMPLE' &&
      rec.tearTest === 'CUMPLE'
    ) {
      compliantCount += 1;
    }
  });

  // Si no hay registros específicos del usuario en esta fecha pero el turno tiene una referencia
  const refEntries = Object.entries(referenceMap);

  return (
    <div
      id="modalTurnSummary"
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transform transition-all my-auto max-h-[92vh] flex flex-col">
        {/* HEADER */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-wide">
                RESUMEN DE CIERRE DE TURNO
              </h3>
              <p className="text-[11px] text-slate-400">
                Verificación y balance de cajas registradas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL CON SCROLL */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-left">
          {/* TARJETA DATOS DEL TURNO */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-700 uppercase flex items-center gap-1.5 text-[11px]">
                <User className="w-3.5 h-3.5 text-prod-600" />
                Operario: <strong className="text-slate-900">{session?.fullName || turn?.packer}</strong>
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Listo para Cierre
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600 pt-0.5 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Estación:</span>
                <strong className="text-slate-800 font-bold">{turn?.station || 'Estación 51'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Turno:</span>
                <strong className="text-slate-800 font-bold">{turn?.shift || 'Turno 1'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Fecha:</span>
                <strong className="text-slate-800 font-bold">{turn?.date || new Date().toISOString().split('T')[0]}</strong>
              </div>
              {turn?.tech && (
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Técnico:</span>
                  <strong className="text-slate-800">{turn.tech}</strong>
                </div>
              )}
              {turn?.aux && (
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Auxiliar:</span>
                  <strong className="text-slate-800">{turn.aux}</strong>
                </div>
              )}
            </div>
          </div>

          {/* DESGLOSE DE CAJAS SEGÚN SU REFERENCIA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-prod-600" />
                Cajas Registradas por Referencia
              </span>
              <span className="text-xs font-mono font-bold text-prod-700 bg-prod-50 px-2.5 py-0.5 rounded-full border border-prod-200">
                Total: {totalBoxes} {totalBoxes === 1 ? 'caja' : 'cajas'}
              </span>
            </div>

            {refEntries.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500 text-xs">
                <Package className="w-6 h-6 mx-auto text-slate-400 mb-1 opacity-60" />
                <p className="font-bold text-slate-700">Sin cajas registradas en este turno</p>
                <p className="text-[11px] text-slate-500">
                  Referencia asignada al turno: <strong className="text-slate-800">{turn?.reference || 'N/A'}</strong>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {refEntries.map(([refName, data]) => {
                  const percentage = totalBoxes > 0 ? Math.round((data.count / totalBoxes) * 100) : 0;
                  return (
                    <div
                      key={refName}
                      className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 hover:border-prod-300 transition"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs sm:text-sm text-slate-900 uppercase truncate">
                            {refName}
                          </span>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono shrink-0">
                            {percentage}%
                          </span>
                        </div>
                        {data.boxes.length > 0 && (
                          <p className="text-[10px] text-slate-500 truncate">
                            Cajas #{data.boxes.join(', #')}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base sm:text-lg font-black text-prod-700 font-mono block">
                          {data.count}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {data.count === 1 ? 'Caja' : 'Cajas'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* INDICADORES RÁPIDOS DE CALIDAD */}
          {totalBoxes > 0 && (
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Conformes
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-800 font-mono mt-0.5">
                  {compliantCount} / {totalBoxes} ({Math.round((compliantCount / totalBoxes) * 100)}%)
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Estado Cajas
                </div>
                <div className="text-sm sm:text-base font-black text-slate-800 font-mono mt-0.5">
                  100% Finalizadas
                </div>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
            <PowerOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Al confirmar, el turno cambiará a estado <strong>Finalizado</strong> y quedará registrado el total de cajas e inspecciones.
            </span>
          </div>
        </div>

        {/* FOOTER ACCIONES */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isFinalizing}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Volver
          </button>
          <button
            type="button"
            id="btn-confirm-turn-finalize"
            onClick={onConfirmFinalize}
            disabled={isFinalizing}
            className="bg-slate-900 hover:bg-rose-600 text-white font-black px-6 py-2.5 rounded-xl text-xs uppercase shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <PowerOff className="w-4 h-4" />
            {isFinalizing ? 'Finalizando...' : 'Confirmar y Finalizar Turno'}
          </button>
        </div>
      </div>
    </div>
  );
};
