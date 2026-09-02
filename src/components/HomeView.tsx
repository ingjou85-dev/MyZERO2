import React, { useState, useEffect } from 'react';
import { AppView, ProductionTurnRecord, ProductionQualityRecord, UserSession } from '../types.ts';
import { RecordService } from '../services/recordService.ts';
import { formatPersonName } from '../utils/formatters.ts';
import { TurnFinalizeSummaryModal } from './TurnFinalizeSummaryModal.tsx';
import {
  Plus,
  Wrench,
  Layers,
  Pencil,
  AlertTriangle,
  CheckCircle,
  PowerOff,
  UserCheck,
  Lock,
  ArrowRight
} from 'lucide-react';

interface HomeViewProps {
  session: UserSession | null;
  onNavigate: (view: AppView, tab?: 'INGRESAR' | 'LIVE' | 'DASHBOARD') => void;
  onOpenProductionModal: (recordToEdit?: ProductionTurnRecord | null) => void;
  recentProductionRecords: ProductionTurnRecord[];
  onRefreshData: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  session,
  onNavigate,
  onOpenProductionModal,
  recentProductionRecords,
  onRefreshData
}) => {
  const [finalizeAlert, setFinalizeAlert] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const [moduleLockAlert, setModuleLockAlert] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [qualityRecords, setQualityRecords] = useState<ProductionQualityRecord[]>([]);

  useEffect(() => {
    const unsub = RecordService.subscribeProductionQualityRecords((recs) => {
      setQualityRecords(recs);
    });
    return () => unsub();
  }, []);

  // PRIVACIDAD POR SESIÓN: El usuario solo ve su propio turno activo
  const currentUserTurn = session
    ? recentProductionRecords.find((r) => {
        if (r.status === 'Finalizado') return false;
        const pk = r.packer?.trim().toUpperCase();
        const curName = session.fullName?.trim().toUpperCase();
        const curUser = session.user?.trim().toUpperCase();
        return (
          (!!curName && pk === curName) ||
          (!!curUser && pk === curUser) ||
          (curUser === 'DDUVAN' && (pk === 'DUVÁN' || pk === 'DUVAN'))
        );
      })
    : null;

  const isAdmin = session?.role === 'Administrador';
  const hasAccess = isAdmin || !!currentUserTurn;

  const handleRegisterOrEditClick = () => {
    setFinalizeAlert(null);
    setModuleLockAlert(null);
    if (currentUserTurn) {
      onOpenProductionModal(currentUserTurn);
    } else {
      onOpenProductionModal(null);
    }
  };

  const handleModuleClick = (view: AppView) => {
    setModuleLockAlert(null);
    // BLOQUEO DE MÓDULOS: Los administradores pueden ingresar sin registrar turno. Los operarios requieren turno activo.
    if (!isAdmin && !currentUserTurn) {
      setModuleLockAlert(
        '⚠️ Debe registrar e iniciar su turno antes de ingresar a los módulos de Mantenimiento o Producción.'
      );
      return;
    }
    onNavigate(view);
  };

  const handleFinalizeTurnClick = () => {
    setFinalizeAlert(null);
    setModuleLockAlert(null);

    if (!currentUserTurn) {
      setFinalizeAlert({
        type: 'error',
        message: 'No tiene ningún turno activo para finalizar.'
      });
      return;
    }

    // SEGUNDO REQUERIMIENTO: La validación evalúa únicamente la carga del usuario actual
    const { hasPending, countMaint, countProd } = RecordService.hasPendingRecords(
      undefined,
      qualityRecords,
      session?.fullName,
      session?.user
    );

    if (hasPending) {
      const details = [];
      if (countMaint > 0) details.push(`${countMaint} reporte(s) de MANTENIMIENTO`);
      if (countProd > 0) details.push(`${countProd} caja(s) de PRODUCCIÓN`);

      setFinalizeAlert({
        type: 'error',
        message: `Tiene registros pendientes por terminar (${details.join(', ')} en proceso o pausados). Debe completarlos antes de finalizar su turno.`
      });
      return;
    }

    // Si todo está OK y diligenciado, abre la ventana de resumen
    setIsSummaryModalOpen(true);
  };

  const handleConfirmFinalizeTurn = async () => {
    if (!session?.fullName) return;

    try {
      setIsFinalizing(true);
      await RecordService.finalizeActiveTurnForUser(session.fullName);
      onRefreshData();
      setIsSummaryModalOpen(false);

      setFinalizeAlert({
        type: 'success',
        message: 'Turno finalizado exitosamente. ¡Excelente labor!'
      });
    } catch (err) {
      setFinalizeAlert({
        type: 'error',
        message: 'Ocurrió un error al intentar finalizar el turno.'
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <section
      id="viewHome"
      className="flex flex-col justify-center items-center py-4 text-center space-y-5 w-full max-w-3xl mx-auto"
    >
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
          MÓDULOS DE OPERACIÓN
        </h2>
        <p className="text-slate-500 text-xs max-w-md mx-auto">
          Inicie su turno para habilitar los registros de mantenimiento e inspección de producción.
        </p>
      </div>

      {moduleLockAlert && (
        <div
          id="homeModuleLockAlert"
          className="w-full p-3 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center justify-between gap-2 shadow-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2 text-left">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{moduleLockAlert}</span>
          </div>
          <button
            onClick={handleRegisterOrEditClick}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-[11px] uppercase font-bold shrink-0"
          >
            Iniciar Turno
          </button>
        </div>
      )}

      {/* BLOQUE SUPERIOR COMPACTO: REGISTRO DE TURNO & CIERRE OPERATIVO */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
        {/* 1. TARJETA COMPACTA DE CONTROL DE TURNO */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Registro de Turno
              </span>
              {currentUserTurn ? (
                <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-200">
                  <UserCheck className="w-2.5 h-2.5 text-blue-600" /> Turno Activo
                </span>
              ) : (
                <span className="text-[9px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">
                  Sin Iniciar
                </span>
              )}
            </div>

            <h3 className="font-bold text-slate-800 text-xs uppercase">
              {currentUserTurn ? 'Turno en Curso' : 'Iniciar Nuevo Turno'}
            </h3>

            {currentUserTurn ? (
              <div className="mt-1.5 text-[10px] text-slate-600 grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="col-span-2 pb-1.5 mb-0.5 border-b border-slate-200/70 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Operario:</span>
                  <strong className="text-slate-900 font-bold text-[11px]">
                    {formatPersonName(session?.fullName || currentUserTurn.packer, session?.user)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Estación: </span>
                  <strong className="text-slate-800 font-bold">{currentUserTurn.station || 'Estación 51'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Turno: </span>
                  <strong className="text-slate-800 font-bold">{currentUserTurn.shift}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Auxiliar: </span>
                  <strong className="text-slate-800 font-bold">{currentUserTurn.aux}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Ref: </span>
                  <strong className="text-emerald-700 font-bold">{currentUserTurn.reference}</strong>
                </div>
              </div>
            ) : (
              <div className="mt-1.5 text-[10px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Operario:</span>
                  <strong className="text-slate-900 font-bold text-[11px]">
                    {formatPersonName(session?.fullName, session?.user)}
                  </strong>
                </div>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Registre estación, turno, técnico, auxiliar y referencia para iniciar labores.
                </p>
              </div>
            )}
          </div>

          <button
            id="btn-registrar-turno"
            onClick={handleRegisterOrEditClick}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-2.5 rounded-lg text-[11px] uppercase shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {currentUserTurn ? (
              <>
                <Pencil className="w-3 h-3" />
                Editar Registro Turno
              </>
            ) : (
              <>
                <Plus className="w-3 h-3 stroke-[3]" />
                Registrar Turno
              </>
            )}
          </button>
        </div>

        {/* 2. CIERRE OPERATIVO DE TURNO COMPACTO */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                <PowerOff className="w-2.5 h-2.5 text-rose-600" />
                Cierre Operativo
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">
                Finalización
              </span>
            </div>

            <h3 className="font-bold text-slate-800 text-xs uppercase">
              Cierre de Turno
            </h3>

            <p className="text-[10px] text-slate-500 mt-1 leading-normal">
              Finalice su turno activo. Verifique que no queden reportes ni cajas pausadas.
            </p>

            {finalizeAlert && (
              <div
                id="alert-finalizar-turno"
                className={`mt-1.5 p-2 rounded-md text-[10px] font-bold flex items-start gap-1 ${
                  finalizeAlert.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {finalizeAlert.type === 'error' ? (
                  <AlertTriangle className="w-3 h-3 shrink-0 text-rose-600 mt-0.5" />
                ) : (
                  <CheckCircle className="w-3 h-3 shrink-0 text-emerald-600 mt-0.5" />
                )}
                <span>{finalizeAlert.message}</span>
              </div>
            )}
          </div>

          <button
            id="btn-finalizar-turno"
            onClick={handleFinalizeTurnClick}
            disabled={!currentUserTurn}
            className="w-full bg-slate-900 hover:bg-rose-600 text-white font-bold py-1.5 px-2.5 rounded-lg text-[11px] uppercase shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PowerOff className="w-3 h-3" />
            Finalizar mi Turno
          </button>
        </div>
      </div>

      {/* TARJETAS DESTACADAS DE MÓDULOS DE OPERACIÓN (MÁS GRANDES Y PROMINENTES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full pt-1">
        {/* MANTENIMIENTO */}
        <button
          id="card-module-maintenance"
          onClick={() => handleModuleClick('MAINTENANCE')}
          className={`border-2 rounded-2xl sm:rounded-3xl p-6 sm:p-7 text-left transition transform hover:-translate-y-1 shadow-lg hover:shadow-xl flex flex-col justify-between min-h-[200px] sm:min-h-[230px] group cursor-pointer ${
            hasAccess
              ? 'bg-slate-900 hover:bg-maint-600 border-slate-800 hover:border-maint-400'
              : 'bg-slate-800/95 border-slate-700 opacity-95'
          }`}
        >
          <div className="flex justify-between items-center w-full">
            <span className="p-3.5 sm:p-4 bg-maint-500/20 group-hover:bg-white/20 rounded-2xl text-maint-400 group-hover:text-white transition shadow-inner">
              <Wrench className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.2]" />
            </span>
            {!hasAccess ? (
              <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-500/40">
                <Lock className="w-3.5 h-3.5" /> Requiere Turno
              </span>
            ) : (
              <span className="text-xs font-bold text-maint-400 group-hover:text-white flex items-center gap-1 bg-white/5 group-hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 transition">
                Acceder <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-1" />
              </span>
            )}
          </div>
          <div className="space-y-1 mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              MANTENIMIENTO
            </h3>
            <p className="text-slate-300 group-hover:text-maint-50 text-xs sm:text-sm leading-relaxed">
              Registro paso a paso de paradas, fallas, soluciones efectivas y panel en vivo de máquinas.
            </p>
          </div>
        </button>

        {/* PRODUCCIÓN */}
        <button
          id="card-module-production"
          onClick={() => handleModuleClick('PRODUCTION')}
          className={`border-2 rounded-2xl sm:rounded-3xl p-6 sm:p-7 text-left transition transform hover:-translate-y-1 shadow-lg hover:shadow-xl flex flex-col justify-between min-h-[200px] sm:min-h-[230px] group cursor-pointer ${
            hasAccess
              ? 'bg-slate-900 hover:bg-prod-600 border-slate-800 hover:border-prod-400'
              : 'bg-slate-800/95 border-slate-700 opacity-95'
          }`}
        >
          <div className="flex justify-between items-center w-full">
            <span className="p-3.5 sm:p-4 bg-prod-500/20 group-hover:bg-white/20 rounded-2xl text-prod-400 group-hover:text-white transition">
              <Layers className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.2]" />
            </span>
            {!hasAccess ? (
              <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-500/40">
                <Lock className="w-3.5 h-3.5" /> Requiere Turno
              </span>
            ) : (
              <span className="text-xs font-bold text-prod-400 group-hover:text-white flex items-center gap-1 bg-white/5 group-hover:bg-white/10 px-3 py-1 rounded-full border border-white/10 transition">
                Acceder <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-1" />
              </span>
            )}
          </div>
          <div className="space-y-1 mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              PRODUCCIÓN
            </h3>
            <p className="text-slate-300 group-hover:text-prod-50 text-xs sm:text-sm leading-relaxed">
              Control de calidad por caja: pesaje, pruebas de hermeticidad, aprobación y panel en vivo.
            </p>
          </div>
        </button>
      </div>

      {/* MODAL DE RESUMEN DE CIERRE DE TURNO */}
      <TurnFinalizeSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        onConfirmFinalize={handleConfirmFinalizeTurn}
        turn={currentUserTurn}
        session={session}
        qualityRecords={qualityRecords}
        isFinalizing={isFinalizing}
      />
    </section>
  );
};


