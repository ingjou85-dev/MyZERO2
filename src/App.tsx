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

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    setActiveView('HOME');
  };

  const handleLogout = () => {
    AuthService.logout();
    setSession(null);
    setIsAdminMenuOpen(false);
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center relative">
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
                onUpdateRecords={handleUpdateMaintenanceRecords}
              />
            )}

            {activeView === 'PRODUCTION' && (
              <ProductionView
                session={session}
                initialTab={productionInitialTab}
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
    </div>
  );
}
