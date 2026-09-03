import React from 'react';
import { UserSession, AppView } from '../types.ts';
import { CompanyLogo } from './CompanyLogo.tsx';
import { formatFirstNameUpper } from '../utils/formatters.ts';
import { LogOut, Menu, Home, Wrench, Layers, ShieldCheck } from 'lucide-react';

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
    <>
      {/* HEADER SUPERIOR */}
      <header id="mainAppHeader" className="bg-slate-900 text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* LOGO Y TITULOS */}
          <div
            onClick={() => onNavigate('HOME')}
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none min-w-0"
            id="navbar-brand-section"
          >
            <div className="bg-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shadow-sm shrink-0">
              <CompanyLogo size="sm" />
            </div>
            <div className="border-l border-slate-700 pl-2 sm:pl-3 truncate">
              <h1 className="font-bold text-xs sm:text-sm leading-tight text-white tracking-wide truncate">
                REPORTE DE TIEMPOS
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate hidden xs:block">
                MÁQUINAS FORMADORAS Y PRODUCCIÓN
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            {/* BOTONES DE NAVEGACIÓN EN ESCRITORIO */}
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
            <div className="border-l border-slate-700 pl-2 sm:pl-4 flex items-center space-x-2 sm:space-x-3">
              <div className="text-right max-w-[130px] sm:max-w-none truncate">
                <p id="navUserName" className="text-[11px] sm:text-xs font-bold text-slate-100 tracking-wide truncate">
                  {formatFirstNameUpper(session.fullName, session.user)}
                </p>
                <p id="navUserRole" className="text-[8px] sm:text-[9px] text-emerald-400 font-semibold uppercase">
                  {session.role === 'Administrador' ? 'ADMIN' : 'Operario'}
                </p>
              </div>

              {/* BOTON SALIR (USUARIO CORRIENTE) */}
              {session.role !== 'Administrador' && (
                <button
                  id="btnSalirCorriente"
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="p-1.5 sm:p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Salir</span>
                </button>
              )}

              {/* BOTON HAMBURGUESA (ADMINISTRADOR) */}
              {session.role === 'Administrador' && (
                <button
                  id="btnMenuAdmin"
                  onClick={onToggleAdminMenu}
                  title="Menú Administrativo"
                  className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition text-xs font-bold flex items-center cursor-pointer border border-slate-700"
                >
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* BARRA DE NAVEGACIÓN INFERIOR PARA DISPOSITIVOS MÓVILES */}
      <nav
        id="mobileBottomNav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 shadow-2xl flex items-center justify-around"
      >
        <button
          onClick={() => onNavigate('HOME')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeView === 'HOME'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <Home className={`w-4 h-4 ${activeView === 'HOME' ? 'text-emerald-400 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Inicio</span>
        </button>

        <button
          onClick={() => onNavigate('MAINTENANCE')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeView === 'MAINTENANCE'
              ? 'text-maint-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <Wrench className={`w-4 h-4 ${activeView === 'MAINTENANCE' ? 'text-maint-400 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Mantenimiento</span>
        </button>

        <button
          onClick={() => onNavigate('PRODUCTION')}
          className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeView === 'PRODUCTION'
              ? 'text-prod-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <Layers className={`w-4 h-4 ${activeView === 'PRODUCTION' ? 'text-prod-400 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Producción</span>
        </button>

        {session.role === 'Administrador' && (
          <button
            onClick={onToggleAdminMenu}
            className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Admin</span>
          </button>
        )}
      </nav>
    </>
  );
};
