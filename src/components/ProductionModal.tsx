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
  const [date, setDate] = useState('');
  const [shift, setShift] = useState(MASTER_DATA.shifts[0]);
  const [tech, setTech] = useState('');
  const [aux, setAux] = useState('');
  const [reference, setReference] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialRecord) {
        setDate(initialRecord.date || new Date().toISOString().split('T')[0]);
        setShift(initialRecord.shift || MASTER_DATA.shifts[0]);
        setTech(initialRecord.tech || '');
        setAux(initialRecord.aux || '');
        setReference(initialRecord.reference || '');
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setShift(MASTER_DATA.shifts[0]);
        setTech('');
        setAux('');
        setReference('');
      }
      setErrorMsg('');
    }
  }, [isOpen, initialRecord]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !shift || !session?.fullName || !tech || !aux.trim() || !reference) {
      setErrorMsg('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    const recToSave: ProductionTurnRecord = {
      id: initialRecord?.id || 'prod-' + Date.now(),
      date,
      shift,
      packer: (initialRecord?.packer || session.fullName).toUpperCase(),
      tech,
      aux: aux.trim().toUpperCase(),
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
            className="text-slate-400 hover:text-white p-1"
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
            {/* 1. FECHA */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha *</label>
              <input
                type="date"
                id="prodInpDate"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full border border-slate-300 p-2.5 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* 2. TURNO */}
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

            {/* 3. EMPACADOR (USUARIO ACTIVO) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Empacador (Usuario Responsable) *
              </label>
              <input
                type="text"
                id="prodInpPacker"
                value={initialRecord?.packer || session?.fullName || ''}
                readOnly
                className="w-full border border-slate-200 bg-slate-100 p-2.5 rounded-lg text-xs font-bold text-slate-700 uppercase cursor-not-allowed"
              />
            </div>

            {/* 4. TÉCNICO */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Técnico *</label>
              <select
                id="prodInpTech"
                value={tech}
                onChange={(e) => setTech(e.target.value)}
                required
                className="w-full border border-slate-300 p-2.5 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="">-- Seleccionar --</option>
                {MASTER_DATA.technicians.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. AUXILIAR */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Auxiliar *</label>
              <input
                type="text"
                id="prodInpAux"
                value={aux}
                onChange={(e) => setAux(e.target.value.toUpperCase())}
                required
                placeholder="Nombre de auxiliar"
                className="w-full border border-slate-300 p-2.5 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none uppercase font-medium"
              />
            </div>

            {/* 6. REFERENCIA */}
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

