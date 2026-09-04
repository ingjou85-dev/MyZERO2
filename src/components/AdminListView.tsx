import React, { useState } from 'react';
import { AuthService } from '../services/authService.ts';
import { UserAccount, UserSession } from '../types.ts';
import { formatPersonName } from '../utils/formatters.ts';
import { Users, Key, ToggleLeft, Trash2, ChevronDown, Lock } from 'lucide-react';

interface AdminListViewProps {
  users: UserAccount[];
  currentUser?: UserSession | null;
  onRefreshUsers: () => void;
}

export const AdminListView: React.FC<AdminListViewProps> = ({ users, currentUser, onRefreshUsers }) => {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [openActionUser, setOpenActionUser] = useState<string | null>(null);

  const isCurrentSuperAdmin = currentUser?.user?.trim().toUpperCase() === 'JTORREGROSA';

  const handleToggleStatus = async (u: UserAccount) => {
    const isTargetSuperAdmin = u.user?.trim().toUpperCase() === 'JTORREGROSA';
    if (isTargetSuperAdmin && !isCurrentSuperAdmin) {
      alert('Acceso denegado: La cuenta de Administrador principal jtorregrosa solo puede ser modificada por su propio titular.');
      return;
    }
    const updated: UserAccount = {
      ...u,
      status: u.status === 'Activo' ? 'Inactivo' : 'Activo'
    };
    try {
      await AuthService.updateUser(updated, currentUser?.user);
      onRefreshUsers();
    } catch (err: any) {
      alert(err?.message || 'Error al modificar estado del usuario.');
    }
  };

  const handleOpenPasswordModal = (username: string) => {
    const isTargetSuperAdmin = username?.trim().toUpperCase() === 'JTORREGROSA';
    if (isTargetSuperAdmin && !isCurrentSuperAdmin) {
      alert('Acceso denegado: La cuenta de Administrador principal jtorregrosa solo puede ser modificada por su propio titular.');
      return;
    }
    setEditingUser(username);
    setNewPassword('');
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || newPassword.length < 4) {
      alert('La contraseña debe tener mínimo 4 caracteres.');
      return;
    }
    const isTargetSuperAdmin = editingUser?.trim().toUpperCase() === 'JTORREGROSA';
    if (isTargetSuperAdmin && !isCurrentSuperAdmin) {
      alert('Acceso denegado: Solo jtorregrosa puede modificar su propia contraseña.');
      return;
    }
    try {
      await AuthService.updatePassword(editingUser, newPassword, currentUser?.user);
      alert(
        `Contraseña actualizada con éxito para el usuario ${editingUser}. La clave anterior ha sido invalidada inmediatamente en la base de datos.`
      );
      setEditingUser(null);
      setNewPassword('');
      onRefreshUsers();
    } catch (error: any) {
      alert('Error al actualizar la contraseña: ' + (error?.message || 'Error desconocido'));
    }
  };

  const handleDeleteUser = async (username: string) => {
    const isTargetSuperAdmin = username?.trim().toUpperCase() === 'JTORREGROSA';
    if (isTargetSuperAdmin && !isCurrentSuperAdmin) {
      alert('Acceso denegado: La cuenta de Administrador principal jtorregrosa no puede ser eliminada por otro administrador.');
      return;
    }
    if (window.confirm(`¿Está seguro de eliminar al usuario ${username}?`)) {
      try {
        await AuthService.deleteUser(username, currentUser?.user);
        onRefreshUsers();
      } catch (err: any) {
        alert(err?.message || 'Error al eliminar usuario');
      }
    }
  };

  return (
    <section
      id="viewAdminList"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full max-w-5xl mx-auto"
    >
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm uppercase flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          Cuentas Registradas en el Sistema
        </h3>
        <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
          {users.length} Usuarios
        </span>
      </div>

      <div className="overflow-x-auto pb-16">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 font-bold uppercase text-slate-600 border-b">
              <th className="p-3">Nombre Completo</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Fecha Creación</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody id="tblAdminUsersBody" className="divide-y divide-slate-100">
            {users.map((u) => {
              const badgeColor =
                u.status === 'Activo'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800';
              const roleBadge =
                u.role === 'Administrador' ? 'text-indigo-600' : 'text-slate-600';
              const isTargetSuperAdmin = u.user?.trim().toUpperCase() === 'JTORREGROSA';

              return (
                <tr key={u.user} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-slate-800 uppercase">{formatPersonName(u.fullName, u.user)}</td>
                  <td className="p-3 font-medium text-slate-600 uppercase">{u.user}</td>
                  <td className={`p-3 font-bold ${roleBadge}`}>{u.role}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${badgeColor}`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{u.createdAt}</td>
                  <td className="p-3 text-center whitespace-nowrap">
                    {isTargetSuperAdmin && !isCurrentSuperAdmin ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-bold select-none cursor-not-allowed"
                        title="Cuenta Superadministradora protegida. Solo jtorregrosa puede modificar o gestionar su cuenta."
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Protegido</span>
                      </span>
                    ) : (
                      <div className="relative inline-block text-left">
                        <button
                          id={`btn-actions-${u.user}`}
                          type="button"
                          onClick={() =>
                            setOpenActionUser(openActionUser === u.user ? null : u.user)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <span>Acciones</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                              openActionUser === u.user ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {openActionUser === u.user && (
                          <>
                            {/* Fondo invisible para cerrar menú al hacer clic fuera */}
                            <div
                              className="fixed inset-0 z-20 cursor-default"
                              onClick={() => setOpenActionUser(null)}
                            />

                            {/* Menú Desplegable de Acciones */}
                            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                              <div className="py-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionUser(null);
                                    handleToggleStatus(u);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition text-xs cursor-pointer"
                                >
                                  <ToggleLeft className="w-4 h-4 text-amber-500" />
                                  <span>Cambiar Estado</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionUser(null);
                                    handleOpenPasswordModal(u.user);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition text-xs cursor-pointer"
                                >
                                  <Key className="w-4 h-4 text-blue-500" />
                                  <span>Cambiar Clave</span>
                                </button>
                              </div>

                              <div className="py-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionUser(null);
                                    handleDeleteUser(u.user);
                                  }}
                                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2.5 transition text-xs cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-600" />
                                  <span>Eliminar Usuario</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL CAMBIO DE CONTRASEÑA */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 uppercase">
              Nueva contraseña para <span className="text-blue-600">{editingUser}</span>
            </h4>
            <form onSubmit={handleSavePassword} className="space-y-4">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Mínimo 4 caracteres"
                className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow cursor-pointer"
                >
                  Guardar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

