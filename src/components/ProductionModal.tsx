import React, { useState, useEffect } from 'react';
import { UserSession, ProductionTurnRecord } from '../types.ts';
import { MASTER_DATA } from '../constants/masterData.ts';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  initialRecord?: ProductionTurnRecord | null;
  onSaveRecord: (record: ProductionTurnRecord) => void;
}

export const ProductionModal: React.FC<ProductionModalProps> = ({
  isOpen,
  onClose,
  session,
  initialRecord,
  onSaveRecord
}) => {
  const getTodayDateString = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayDate = getTodayDateString();
  const [date, setDate] = useState(todayDate);
  const [station, setStation] = useState(MASTER_DATA.stations[0]);
  const [shift, setShift] = useState(MASTER_DATA.shifts[0]);
  const [tech, setTech] = useState('');
  const [aux, setAux] = useState(MASTER_DATA.auxiliaries[0]);
  const [reference, setReference] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const today = getTodayDateString();
      if (initialRecord) {
        setDate(initialRecord.date || today);
        setStation(initialRecord.station || MASTER_DATA.stations[0]);
        setShift(initialRecord.shift || MASTER_DATA.shifts[0]);
        setTech(initialRecord.tech || '');
        setAux(initialRecord.aux || MASTER_DATA.auxiliaries[0]);
        setReference(initialRecord.reference || '');
      } else {
        setDate(today);
        setStation(MASTER_DATA.stations[0]);
        setShift(MASTER_DATA.shifts[0]);
        setTech('');
        setAux(MASTER_DATA.auxiliaries[0]);
        setReference('');
      }
      setErrorMsg('');
    }
  }, [isOpen, initialRecord]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDate = todayDate;
    if (!effectiveDate || !station || !shift || !session?.fullName || !tech || !aux || !reference) {
      setErrorMsg('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    const recToSave: ProductionTurnRecord = {
      id: initialRecord?.id || 'turn-' + Date.now(),
      date: effectiveDate,
      station,
      shift,
      packer: (initialRecord?.packer || session.fullName).toUpperCase(),
      tech,
      aux,
      reference,
      createdAt: initialRecord?.createdAt || new Date().toISOString(),
      status: initialRecord?.status || 'Activo'
    };

    onSaveRecord(recToSave);
    onClose();
  };

  return (
    <div
      id="modalProduction"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-in fade-in zoom-in-95">
        <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black text-sm uppercase tracking-wide">
              {initialRecord ? 'MODIFICAR REGISTRO DE TURNO' : 'REGISTRAR TURNO DE PRODUCCIÓN'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {initialRecord
                ? 'Actualice los datos del turno activo'
                : 'Complete la información obligatoria (1 registro por usuario)'}
            </p>
          </div>
          <button
            id="btn-close-production-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="formProductionRegister" onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          {errorMsg && (
            <div
              id="prodAlert"
              className="p-3 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. FECHA (Restringido únicamente a la fecha actual del día) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Fecha (Día Actual) *
              </label>
              <input
                type="date"
                id="prodInpDate"
                value={todayDate}
                min={todayDate}
                max={todayDate}
                onChange={() => setDate(todayDate)}
                required
                className="w-full border border-slate-300 p-2.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                title="Solo se permite seleccionar la fecha actual del día"
              />
            </div>

            {/* 2. ESTACIÓN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estación *</label>
              <select
                id="prodInpStation"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                required
                className="w-full border border-slate-300 p-2.5 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {MASTER_DATA.stations.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. TURNO (Turno 1 / Turno 2) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turno *</label>
              <select
                id="prodInpShift"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                required
                className="w-full border border-slate-300 p-2.5 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {MASTER_DATA.shifts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. EMPACADOR (USUARIO ACTIVO) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Empacador *
              </label>
              <input
                type="text"
                id="prodInpPacker"
                value={initialRecord?.packer || session?.fullName || ''}
                readOnly
                className="w-full border border-slate-200 bg-slate-100 p-2.5 rounded-lg text-xs font-bold text-slate-700 uppercase cursor-not-allowed"
              />
            </div>

            {/* 5. TÉCNICO */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Técnico *</label>
              <select
                id="prodInpTech"
                value={tech}
                onChange={(e) => setTech(e.target.value)}
                required
                className="w-full border border-slate-300 p-2.5 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="">-- Seleccionar Técnico --</option>
                {MASTER_DATA.technicians.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. AUXILIAR */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Auxiliar *</label>
              <select
                id="prodInpAux"
                value={aux}
                onChange={(e) => setAux(e.target.value)}
                required
                className="w-full border border-slate-300 p-2.5 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {MASTER_DATA.auxiliaries.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. REFERENCIA */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Referencia *</label>
              <select
                id="prodInpRef"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                className="w-full border border-slate-300 p-2.5 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
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

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-prod-modal"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-submit-prod-modal"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {initialRecord ? 'Actualizar Turno' : 'Guardar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


