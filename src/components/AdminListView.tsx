import React, { useState } from 'react';
import { AuthService } from '../services/authService.ts';
import { UserAccount } from '../types.ts';
import { formatPersonName } from '../utils/formatters.ts';
import { Users, Key, ToggleLeft, Trash2, Pencil } from 'lucide-react';

interface AdminListViewProps {
  users: UserAccount[];
  onRefreshUsers: () => void;
}

export const AdminListView: React.FC<AdminListViewProps> = ({ users, onRefreshUsers }) => {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [editingNameUser, setEditingNameUser] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleToggleStatus = async (u: UserAccount) => {
    if (u.user === 'JTORREGROSA') {
      alert('La cuenta de Administrador principal no puede ser desactivada.');
      return;
    }
    const updated: UserAccount = {
      ...u,
      status: u.status === 'Activo' ? 'Inactivo' : 'Activo'
    };
    await AuthService.updateUser(updated);
    onRefreshUsers();
  };

  const handleOpenPasswordModal = (username: string) => {
    setEditingUser(username);
    setNewPassword('');
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || newPassword.length < 4) {
      alert('La contraseña debe tener mínimo 4 caracteres.');
      return;
    }
    const userToEdit = users.find((u) => u.user === editingUser);
    if (userToEdit) {
      await AuthService.updateUser({ ...userToEdit, pass: newPassword });
      alert(`Contraseña actualizada para ${editingUser}.`);
      setEditingUser(null);
      setNewPassword('');
      onRefreshUsers();
    }
  };

  const handleOpenNameModal = (u: UserAccount) => {
    setEditingNameUser(u.user);
    setNewName(formatPersonName(u.fullName, u.user));
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNameUser || !newName.trim()) {
      alert('El nombre no puede estar vacío.');
      return;
    }
    const userToEdit = users.find((u) => u.user === editingNameUser);
    if (userToEdit) {
      await AuthService.updateUser({ ...userToEdit, fullName: newName.trim() });
      alert(`Nombre completo actualizado para ${editingNameUser}.`);
      setEditingNameUser(null);
      setNewName('');
      onRefreshUsers();
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === 'JTORREGROSA') {
      alert('La cuenta de Administrador principal no puede ser eliminada.');
      return;
    }
    if (window.confirm(`¿Está seguro de eliminar al usuario ${username}?`)) {
      await AuthService.deleteUser(username);
      onRefreshUsers();
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

      <div className="overflow-x-auto">
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

              return (
                <tr key={u.user} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-slate-800">{formatPersonName(u.fullName, u.user)}</td>
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
                  <td className="p-3 text-center space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenNameModal(u)}
                      className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
                      title="Editar Nombre Completo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Nombre
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className="text-amber-600 font-bold hover:underline inline-flex items-center gap-1"
                      title="Cambiar Estado"
                    >
                      <ToggleLeft className="w-3.5 h-3.5" />
                      Estado
                    </button>
                    <button
                      onClick={() => handleOpenPasswordModal(u.user)}
                      className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                      title="Cambiar Contraseña"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Clave
                    </button>
                    {u.user !== 'JTORREGROSA' && (
                      <button
                        onClick={() => handleDeleteUser(u.user)}
                        className="text-rose-500 font-bold hover:underline inline-flex items-center gap-1"
                        title="Eliminar Cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
                >
                  Guardar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN DE NOMBRE COMPLETO */}
      {editingNameUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 uppercase">
              Editar Nombre para <span className="text-indigo-600">{editingNameUser}</span>
            </h4>
            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="Ej: Jhoel Torregrosa"
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNameUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
                >
                  Guardar Nombre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
