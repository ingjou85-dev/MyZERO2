import React from 'react';
import { UserSession, AppView } from '../types.ts';
import { CompanyLogo } from './CompanyLogo.tsx';
import { LogOut, Menu } from 'lucide-react';

interface NavbarProps {
  session: UserSession | null;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onToggleAdminMenu: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  activeView,
  onNavigate,
  onToggleAdminMenu,
  onLogout
}) => {
  if (!session) return null;

  return (
    <header id="mainAppHeader" className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* LOGO Y TITULOS */}
        <div
          onClick={() => onNavigate('HOME')}
          className="flex items-center space-x-3 cursor-pointer select-none"
          id="navbar-brand-section"
        >
          <div className="bg-white px-2 py-1 rounded-md shadow-sm">
            <CompanyLogo size="sm" />
          </div>
          <div className="border-l border-slate-700 pl-3">
            <h1 className="font-bold text-sm leading-tight text-white tracking-wide">REPORTE DE TIEMPOS</h1>
            <p className="text-[10px] text-slate-400">MÁQUINAS FORMADORAS Y PRODUCCIÓN</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <nav id="navButtons" className="hidden md:flex items-center space-x-2">
            <button
              id="btn-nav-home"
              onClick={() => onNavigate('HOME')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold tracking-wider transition ${
                activeView === 'HOME' ? 'bg-slate-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              INICIO
            </button>
            <button
              id="btn-nav-maintenance"
              onClick={() => onNavigate('MAINTENANCE')}
              className={`px-3 py-1.5 rounded-md text-white text-xs font-bold tracking-wider transition ${
                activeView === 'MAINTENANCE' ? 'bg-maint-700 ring-2 ring-maint-500' : 'bg-maint-600 hover:bg-maint-700'
              }`}
            >
              MANTENIMIENTO
            </button>
            <button
              id="btn-nav-production"
              onClick={() => onNavigate('PRODUCTION')}
              className={`px-3 py-1.5 rounded-md text-white text-xs font-bold tracking-wider transition ${
                activeView === 'PRODUCTION' ? 'bg-prod-700 ring-2 ring-prod-500' : 'bg-prod-600 hover:bg-prod-700'
              }`}
            >
              PRODUCCIÓN
            </button>
          </nav>

          {/* USUARIO AUTENTICADO Y CONTROLES */}
          <div className="border-l border-slate-700 pl-4 flex items-center space-x-3">
            <div className="text-right">
              <p id="navUserName" className="text-xs font-bold text-slate-100 tracking-wide uppercase">
                {session.fullName}
              </p>
              <p id="navUserRole" className="text-[9px] text-emerald-400 font-semibold uppercase">
                {session.role === 'Administrador' ? 'ADMINISTRADOR' : 'Sesión Activa'}
              </p>
            </div>

            {/* BOTON SALIR (USUARIO CORRIENTE) */}
            {session.role !== 'Administrador' && (
              <button
                id="btnSalirCorriente"
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition text-xs font-bold flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Salir</span>
              </button>
            )}

            {/* BOTON HAMBURGUESA (ADMINISTRADOR) */}
            {session.role === 'Administrador' && (
              <button
                id="btnMenuAdmin"
                onClick={onToggleAdminMenu}
                title="Menú Administrativo"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition text-xs font-bold flex items-center"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
