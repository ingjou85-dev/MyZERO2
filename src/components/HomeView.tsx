import React, { useState } from 'react';
import { AppView, ProductionTurnRecord, UserSession } from '../types.ts';
import { RecordService } from '../services/recordService.ts';
import {
  Plus,
  Wrench,
  Layers,
  Clock,
  Pencil,
  AlertTriangle,
  CheckCircle,
  PowerOff,
  UserCheck
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

  const currentUserTurn = session
    ? recentProductionRecords.find(
        (r) =>
          r.packer.toUpperCase() === session.fullName.toUpperCase() &&
          r.status !== 'Finalizado'
      )
    : null;

  const handleRegisterOrEditClick = () => {
    setFinalizeAlert(null);
    if (currentUserTurn) {
      onOpenProductionModal(currentUserTurn);
    } else {
      onOpenProductionModal(null);
    }
  };

  const handleFinalizeTurn = async () => {
    setFinalizeAlert(null);
    const { hasPending, countMaint, countProd } = RecordService.hasPendingRecords();

    if (hasPending) {
      const details = [];
      if (countMaint > 0) details.push(`${countMaint} reporte(s) de MANTENIMIENTO`);
      if (countProd > 0) details.push(`${countProd} registro(s) de PRODUCCIÓN`);

      setFinalizeAlert({
        type: 'error',
        message: `Pendiente terminar registros según corresponda (${details.join(', ')} en proceso o pausados).`
      });
      return;
    }

    if (session?.fullName) {
      await RecordService.finalizeActiveTurnForUser(session.fullName);
    }
    onRefreshData();

    setFinalizeAlert({
      type: 'success',
      message: 'Turno finalizado exitosamente. Redirigiendo a Dashboards de PRODUCCIÓN...'
    });

    setTimeout(() => {
      onNavigate('PRODUCTION', 'DASHBOARD');
    }, 1000);
  };

  return (
    <section id="viewHome" className="flex flex-col justify-center items-center py-4 text-center space-y-6 w-full max-w-5xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-wide">
          MÓDULOS DE OPERACIÓN
        </h2>
        <p className="text-slate-500 max-w-lg text-xs sm:text-sm mx-auto">
          Seleccione el área para realizar registros en tiempo real o consultar el panel de control.
        </p>
      </div>

      {/* BLOQUE SUPERIOR: BOTÓN REGISTRAR TURNO AL LADO DEL RESUMEN DE REGISTROS RECIENTES */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch text-left">
        {/* BOTÓN O SECCIÓN REGISTRAR TURNO */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                Control de Turno
              </span>
              {currentUserTurn ? (
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Turno Activo
                </span>
              ) : (
                <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded">
                  1 por usuario
                </span>
              )}
            </div>
            <h3 className="font-black text-slate-800 text-sm uppercase">
              {currentUserTurn ? 'Turno en curso' : 'Iniciar Nuevo Turno'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {currentUserTurn
                ? `Usuario ${session?.fullName} tiene un turno activo (${currentUserTurn.shift} - ${currentUserTurn.reference}).`
                : 'Registre sus datos de empacador, técnico, auxiliar y referencia para el turno.'}
            </p>
          </div>

          <button
            id="btn-registrar-turno"
            onClick={handleRegisterOrEditClick}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-xl text-xs uppercase shadow-md hover:shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            {currentUserTurn ? (
              <>
                <Pencil className="w-4 h-4" />
                EDITAR REGISTRO TURNO
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[3]" />
                REGISTRAR TURNO
              </>
            )}
          </button>
        </div>

        {/* RESUMEN DE REGISTROS RECIENTES DE PRODUCCIÓN */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wide">
                RESUMEN DE REGISTROS RECIENTES DE PRODUCCIÓN
              </h3>
            </div>
            <span
              id="prodCountBadge"
              className="text-[11px] bg-slate-100 text-slate-600 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-slate-400" />
              {recentProductionRecords.length} Registros
            </span>
          </div>

          <div id="homeRecentProdContainer" className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentProductionRecords.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No hay registros de producción ingresados recientemente.
              </p>
            ) : (
              recentProductionRecords.map((r) => {
                const isCurrentUser =
                  session && r.packer.toUpperCase() === session.fullName.toUpperCase();
                const isFinalized = r.status === 'Finalizado';

                return (
                  <div
                    key={r.id}
                    className={`border rounded-xl p-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs transition ${
                      isFinalized
                        ? 'bg-slate-50 border-slate-200 opacity-70'
                        : isCurrentUser
                        ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full text-[10px] uppercase">
                        {r.shift}
                      </span>
                      <span className="font-bold text-slate-800 text-[11px]">{r.date}</span>
                      <span className="text-slate-300">|</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[11px]">
                        {r.reference}
                      </span>
                      {isFinalized ? (
                        <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          FINALIZADO
                        </span>
                      ) : (
                        <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          ACTIVO
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 text-[11px] text-slate-500 uppercase">
                      <span className="truncate max-w-[140px]" title={r.packer}>
                        Empacador: <strong className="text-slate-800">{r.packer}</strong>
                      </span>
                      <span className="hidden md:inline">
                        Téc: <strong className="text-slate-700">{r.tech}</strong>
                      </span>
                      {/* BOTÓN O ICONO DE LÁPIZ PARA EDITAR REGISTRO */}
                      <button
                        id={`btn-edit-turn-${r.id}`}
                        onClick={() => onOpenProductionModal(r)}
                        className="text-slate-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 font-bold px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 transition shadow-sm"
                        title="Modificar datos del registro"
                      >
                        <Pencil className="w-3 h-3 text-emerald-600" />
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* TARJETAS DE MÓDULOS DE OPERACIÓN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* MANTENIMIENTO */}
        <button
          id="card-module-maintenance"
          onClick={() => onNavigate('MAINTENANCE')}
          className="bg-slate-900 hover:bg-maint-600 border border-slate-800 hover:border-maint-500 rounded-2xl p-8 text-left transition transform hover:-translate-y-1 shadow-xl flex flex-col justify-between h-52 group cursor-pointer"
        >
          <div className="flex justify-between items-center w-full">
            <span className="p-3 bg-maint-600/20 group-hover:bg-white/20 rounded-xl text-maint-400 group-hover:text-white transition">
              <Wrench className="w-8 h-8" />
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1 uppercase">MANTENIMIENTO</h3>
            <p className="text-slate-400 group-hover:text-maint-100 text-xs">
              Formulario directo, selección múltiple de defectos/soluciones y panel en vivo en tiempo real.
            </p>
          </div>
        </button>

        {/* PRODUCCIÓN */}
        <button
          id="card-module-production"
          onClick={() => onNavigate('PRODUCTION')}
          className="bg-slate-900 hover:bg-prod-600 border border-slate-800 hover:border-prod-500 rounded-2xl p-8 text-left transition transform hover:-translate-y-1 shadow-xl flex flex-col justify-between h-52 group cursor-pointer"
        >
          <div className="flex justify-between items-center w-full">
            <span className="p-3 bg-prod-600/20 group-hover:bg-white/20 rounded-xl text-prod-400 group-hover:text-white transition">
              <Layers className="w-8 h-8" />
            </span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1 uppercase">PRODUCCIÓN</h3>
            <p className="text-slate-400 group-hover:text-prod-100 text-xs">
              Inspección de calidad por caja: pesos, prueba de goteo, visual, rasgado y visto bueno.
            </p>
          </div>
        </button>
      </div>

      {/* PARTE INFERIOR: PANEL DEL LADO DERECHO DEBAJO DE PRODUCCIÓN CON BOTÓN "FINALIZAR TURNO" */}
      <div className="w-full flex flex-col items-end pt-2">
        <div className="w-full md:w-1/2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-left space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-2">
              <PowerOff className="w-4 h-4 text-rose-500" />
              CIERRE OPERATIVO DE TURNO
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              Validación Requerida
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Finaliza formalmente la jornada guardando todos los registros del turno. Verifica que no existan reportes en proceso antes de concluir.
          </p>

          {finalizeAlert && (
            <div
              id="alert-finalizar-turno"
              className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                finalizeAlert.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {finalizeAlert.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              ) : (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              )}
              <span>{finalizeAlert.message}</span>
            </div>
          )}

          <button
            id="btn-finalizar-turno"
            onClick={handleFinalizeTurn}
            className="w-full bg-slate-900 hover:bg-rose-600 text-white font-black py-3 px-4 rounded-xl text-xs uppercase shadow-md transition flex items-center justify-center gap-2"
          >
            <PowerOff className="w-4 h-4" />
            FINALIZAR TURNO
          </button>
        </div>
      </div>
    </section>
  );
};

