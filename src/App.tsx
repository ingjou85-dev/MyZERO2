/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppView, UserSession, MaintenanceRecord, ProductionTurnRecord, UserAccount } from './types.ts';
import { AuthService } from './services/authService.ts';
import { RecordService } from './services/recordService.ts';
import { Navbar } from './components/Navbar.tsx';
import { AdminSidebar } from './components/AdminSidebar.tsx';
import { LoginView } from './components/LoginView.tsx';
import { HomeView } from './components/HomeView.tsx';
import { ProductionModal } from './components/ProductionModal.tsx';
import { MaintenanceView } from './components/MaintenanceView.tsx';
import { ProductionView } from './components/ProductionView.tsx';
import { AdminCreateView } from './components/AdminCreateView.tsx';
import { AdminListView } from './components/AdminListView.tsx';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeView, setActiveView] = useState<AppView>('HOME');
  const [productionInitialTab, setProductionInitialTab] = useState<'INGRESAR' | 'LIVE' | 'DASHBOARD'>('INGRESAR');
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [turnRecordToEdit, setTurnRecordToEdit] = useState<ProductionTurnRecord | null>(null);

  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [productionTurnRecords, setProductionTurnRecords] = useState<ProductionTurnRecord[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);

  // Load session & subscribe to real-time Firestore collections
  useEffect(() => {
    const existingSession = AuthService.getSession();
    if (existingSession) {
      setSession(existingSession);
    }

    const unsubMaint = RecordService.subscribeMaintenanceRecords((recs) => {
      setMaintenanceRecords(recs);
    });

    const unsubTurns = RecordService.subscribeProductionTurnRecords((turns) => {
      setProductionTurnRecords(turns);
    });

    const unsubUsers = AuthService.subscribeUsers((users) => {
      setUsersList(users);
      // Mantener la sesión sincronizada con el nombre completo y rol actualizados en Firestore
      const currentStored = AuthService.getSession();
      if (currentStored) {
        const found = users.find(
          (u) =>
            u.user.toUpperCase() === currentStored.user.toUpperCase() ||
            u.fullName.toUpperCase() === currentStored.fullName.toUpperCase()
        );
        if (found) {
          let resolvedFullName = found.fullName;
          if (found.user.toUpperCase() === 'DDUVAN' && (found.fullName.toUpperCase() === 'DDUVAN' || !found.fullName)) {
            resolvedFullName = 'Duván';
          }
          if (resolvedFullName !== currentStored.fullName || found.role !== currentStored.role) {
            const updated: UserSession = {
              ...currentStored,
              fullName: resolvedFullName,
              role: found.role
            };
            AuthService.saveSession(updated);
            setSession(updated);
          }
        }
      }
    });

    return () => {
      unsubMaint();
      unsubTurns();
      unsubUsers();
    };
  }, []);

  const refreshData = () => {
    setMaintenanceRecords(RecordService.getMaintenanceRecords());
    setProductionTurnRecords(RecordService.getProductionTurnRecords());
    setUsersList(AuthService.getUsers());
  };

  const [logoutAlert, setLogoutAlert] = useState<string | null>(null);

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    setActiveView('HOME');
  };

  const handleLogout = () => {
    // REGLA: Los usuarios corrientes no pueden cerrar sesión sin antes finalizar su turno activo
    if (session && session.role !== 'Administrador') {
      const activeTurn = productionTurnRecords.find((r) => {
        if (r.status === 'Finalizado') return false;
        const pk = r.packer?.trim().toUpperCase();
        const curName = session.fullName?.trim().toUpperCase();
        const curUser = session.user?.trim().toUpperCase();
        return (
          pk === curName ||
          pk === curUser ||
          (curUser === 'DDUVAN' && (pk === 'DUVÁN' || pk === 'DUVAN'))
        );
      });
      if (activeTurn) {
        setLogoutAlert(
          'No puede cerrar la sesión de usuario sin antes finalizar su turno activo. Por favor diríjase al Inicio y presione "Finalizar mi Turno".'
        );
        return;
      }
    }

    AuthService.logout();
    setSession(null);
    setIsAdminMenuOpen(false);
    setLogoutAlert(null);
  };

  const handleOpenProductionModal = (recordToEdit?: ProductionTurnRecord | null) => {
    setTurnRecordToEdit(recordToEdit || null);
    setIsProductionModalOpen(true);
  };

  const handleSaveProductionTurnRecord = async (rec: ProductionTurnRecord) => {
    await RecordService.saveProductionTurnRecord(rec);
  };

  const handleUpdateMaintenanceRecords = async (recs: MaintenanceRecord[]) => {
    setMaintenanceRecords(recs);
  };

  const handleNavigateFromHome = (view: AppView, tab?: 'INGRESAR' | 'LIVE' | 'DASHBOARD') => {
    if (tab) {
      setProductionInitialTab(tab);
    } else {
      setProductionInitialTab('INGRESAR');
    }
    setActiveView(view);
  };

  return (
    <div className="bg-slate-100 text-slate-800 antialiased font-sans min-h-screen flex flex-col overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar
        session={session}
        activeView={activeView}
        onNavigate={(view) => setActiveView(view)}
        onToggleAdminMenu={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
        onLogout={handleLogout}
      />

      {/* Admin Sidebar Navigation */}
      {session?.role === 'Administrador' && (
        <AdminSidebar
          isOpen={isAdminMenuOpen}
          onClose={() => setIsAdminMenuOpen(false)}
          onNavigate={(view) => setActiveView(view)}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 pb-20 md:pb-8 flex flex-col justify-center relative">
        {!session ? (
          <LoginView onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {activeView === 'HOME' && (
              <HomeView
                session={session}
                onNavigate={handleNavigateFromHome}
                onOpenProductionModal={handleOpenProductionModal}
                recentProductionRecords={productionTurnRecords}
                onRefreshData={refreshData}
              />
            )}

            {activeView === 'MAINTENANCE' && (
              <MaintenanceView
                session={session}
                records={maintenanceRecords}
                activeTurn={
                  session
                    ? productionTurnRecords.find((r) => {
                        if (r.status === 'Finalizado') return false;
                        const pk = r.packer?.trim().toUpperCase();
                        const curName = session.fullName?.trim().toUpperCase();
                        const curUser = session.user?.trim().toUpperCase();
                        return (
                          pk === curName ||
                          pk === curUser ||
                          (curUser === 'DDUVAN' && (pk === 'DUVÁN' || pk === 'DUVAN'))
                        );
                      }) || null
                    : null
                }
                onOpenTurnModal={() => handleOpenProductionModal(null)}
                onUpdateRecords={handleUpdateMaintenanceRecords}
              />
            )}

            {activeView === 'PRODUCTION' && (
              <ProductionView
                session={session}
                initialTab={productionInitialTab}
                activeTurn={
                  session
                    ? productionTurnRecords.find((r) => {
                        if (r.status === 'Finalizado') return false;
                        const pk = r.packer?.trim().toUpperCase();
                        const curName = session.fullName?.trim().toUpperCase();
                        const curUser = session.user?.trim().toUpperCase();
                        return (
                          pk === curName ||
                          pk === curUser ||
                          (curUser === 'DDUVAN' && (pk === 'DUVÁN' || pk === 'DUVAN'))
                        );
                      }) || null
                    : null
                }
                onOpenTurnModal={() => handleOpenProductionModal(null)}
                onSaved={() => {
                  refreshData();
                }}
              />
            )}

            {activeView === 'ADMIN_CREATE' && session.role === 'Administrador' && (
              <AdminCreateView
                onAccountCreated={() => {
                  refreshData();
                }}
              />
            )}

            {activeView === 'ADMIN_LIST' && session.role === 'Administrador' && (
              <AdminListView
                users={usersList}
                onRefreshUsers={refreshData}
              />
            )}
          </>
        )}
      </main>

      {/* Modal for Production Turn Register (opened via REGISTRAR button or Edit pencil) */}
      <ProductionModal
        isOpen={isProductionModalOpen}
        onClose={() => {
          setIsProductionModalOpen(false);
          setTurnRecordToEdit(null);
        }}
        session={session}
        initialRecord={turnRecordToEdit}
        onSaveRecord={handleSaveProductionTurnRecord}
      />

      {/* Modal Advertencia de Bloqueo de Cierre de Sesión con Turno Activo */}
      {logoutAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase">
                Turno de Trabajo en Curso
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {logoutAlert}
              </p>
            </div>
            <div className="pt-2">
              <button
                id="btn-dismiss-logout-alert"
                onClick={() => {
                  setLogoutAlert(null);
                  setActiveView('HOME');
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase shadow-md transition cursor-pointer"
              >
                Entendido, ir al Inicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
