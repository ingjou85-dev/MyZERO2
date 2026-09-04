import React, { useState } from 'react';
import { AuthService } from '../services/authService.ts';
import { UserRole } from '../types.ts';
import { UserPlus, CheckCircle2 } from 'lucide-react';

interface AdminCreateViewProps {
  onAccountCreated: () => void;
}

export const AdminCreateView: React.FC<AdminCreateViewProps> = ({ onAccountCreated }) => {
  const [fullName, setFullName] = useState('');
  const [user, setUser] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [pass, setPass] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const autoGenerateUser = (name: string) => {
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) {
      setUser('');
      return;
    }
    const parts = trimmed.split(/\s+/);
    let rawUser = '';
    if (parts.length === 1) {
      rawUser = parts[0];
    } else {
      rawUser = parts[0].charAt(0) + parts[1];
    }
    rawUser = rawUser.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    rawUser = rawUser.replace(/[^a-zA-Z0-9]/g, '');
    setUser(rawUser.toUpperCase());
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setFullName(val);
    autoGenerateUser(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!role) {
      setAlert({
        type: 'error',
        message: 'Por favor seleccione el rol de acceso.'
      });
      return;
    }

    if (pass.length < 4) {
      setAlert({
        type: 'error',
        message: 'La contraseña debe tener mínimo 4 dígitos.'
      });
      return;
    }

    if (pass !== passConfirm) {
      setAlert({
        type: 'error',
        message: 'Las contraseñas no coinciden.'
      });
      return;
    }

    const normalizedUser = user.trim().toUpperCase();
    if (normalizedUser === 'JTORREGROSA') {
      setAlert({
        type: 'error',
        message: 'La cuenta superadministradora JTORREGROSA está reservada y protegida por el sistema.'
      });
      return;
    }

    const res = await AuthService.register(fullName, user, pass, role as UserRole);
    if (res.success) {
      setAlert({
        type: 'success',
        message: 'Cuenta creada exitosamente.'
      });
      setFullName('');
      setUser('');
      setPass('');
      setPassConfirm('');
      setRole('');
      onAccountCreated();
      setTimeout(() => setAlert(null), 3000);
    } else {
      setAlert({
        type: 'error',
        message: res.message || 'Error al registrar usuario.'
      });
    }
  };

  return (
    <section
      id="viewAdminCreate"
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-3xl mx-auto w-full"
    >
      <div className="border-b pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" />
            Crear Nueva Cuenta
          </h3>
          <p className="text-xs text-slate-500">Registro de usuarios para acceso al sistema</p>
        </div>
      </div>

      {alert && (
        <div
          id="adminCreateAlert"
          className={`p-3 rounded-lg text-xs font-bold border ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-rose-50 text-rose-600 border-rose-200'
          }`}
        >
          {alert.message}
        </div>
      )}

      <form id="formAdminCreate" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              id="admRegName"
              value={fullName}
              onChange={handleNameChange}
              required
              placeholder="Ej: JHOEL TORREGROSA"
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none uppercase font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Usuario (Automático) *
            </label>
            <input
              type="text"
              id="admRegUser"
              value={user}
              readOnly
              disabled
              required
              placeholder="Se genera automáticamente"
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-slate-100 text-slate-700 font-mono font-bold cursor-not-allowed select-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Rol de Acceso *
            </label>
            <select
              id="admRegRole"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              required
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="">Seleccionar Rol</option>
              <option value="Corriente">Corriente</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Contraseña (Solo números) *
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              id="admRegPass"
              value={pass}
              onChange={(e) => setPass(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="Solo números (ej: 1234)"
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none tracking-widest font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Confirmar Contraseña *
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              id="admRegPassConfirm"
              value={passConfirm}
              onChange={(e) => setPassConfirm(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="Repita los números"
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none tracking-widest font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            id="btn-register-account"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Registrar Cuenta
          </button>
        </div>
      </form>
    </section>
  );
};
