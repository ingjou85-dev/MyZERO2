import React from 'react';
import { AppView } from '../types.ts';
import { X, UserPlus, Users, LogOut } from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onLogout
}) => {
  return (
    <>
      <div
        id="adminSidebar"
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl border-l border-slate-800 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 h-16 border-b border-slate-800 flex justify-between items-center">
          <span className="font-bold text-sm tracking-wide">MENÚ ADMINISTRADOR</span>
          <button id="btn-close-admin-sidebar" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <button
            id="btn-admin-nav-create"
            onClick={() => {
              onNavigate('ADMIN_CREATE');
              onClose();
            }}
            className="w-full text-left p-3 rounded-lg hover:bg-slate-800 text-sm font-semibold text-emerald-400 transition flex items-center justify-between"
          >
            <span>Crear cuenta</span>
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            id="btn-admin-nav-list"
            onClick={() => {
              onNavigate('ADMIN_LIST');
              onClose();
            }}
            className="w-full text-left p-3 rounded-lg hover:bg-slate-800 text-sm font-semibold text-blue-400 transition flex items-center justify-between"
          >
            <span>Cuentas registradas</span>
            <Users className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button
            id="btn-admin-logout"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold py-2.5 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          id="adminSidebarOverlay"
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
        />
      )}
    </>
  );
};
