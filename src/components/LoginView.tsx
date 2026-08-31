import React, { useState } from 'react';
import { CompanyLogo } from './CompanyLogo.tsx';
import { AuthService } from '../services/authService.ts';
import { UserSession } from '../types.ts';
import { Lock, User } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await AuthService.login(username.trim().toUpperCase(), password.trim());
      setIsLoading(false);

      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setErrorMsg(res.message || 'Error al iniciar sesión.');
      }
    } catch (e: any) {
      setIsLoading(false);
      setErrorMsg(e?.message || 'Error al conectar con el servidor de autenticación.');
    }
  };

  return (
    <section
      id="viewLogin"
      className="max-w-md w-full mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200 space-y-6 my-auto"
    >
      <div className="text-center space-y-3">
        {/* LOGO EMPRESARIAL */}
        <div className="flex justify-center py-2 cursor-default select-none">
          <CompanyLogo size="lg" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">INICIO DE SESIÓN</h2>
          <p className="text-xs text-slate-500">Ingrese sus credenciales de planta para ingresar</p>
        </div>
      </div>

      {errorMsg && (
        <div
          id="loginAlert"
          className="p-3 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200"
        >
          {errorMsg}
        </div>
      )}

      <form id="formLogin" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Usuario
          </label>
          <div className="relative">
            <input
              type="text"
              id="loginUser"
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              required
              placeholder="Ej: JTORREGROSA"
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase font-bold pl-9"
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Contraseña
          </label>
          <div className="relative">
            <input
              type="password"
              id="loginPass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••"
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none pl-9"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>

        <button
          type="submit"
          id="btn-submit-login"
          disabled={isLoading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm shadow-md transition disabled:opacity-50"
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>
    </section>
  );
};
