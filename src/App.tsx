import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VehicleProvider, useVehicle } from './context/VehicleContext';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { VehiclesView } from './components/vehicles/VehiclesView';
import { DocumentsView } from './components/documents/DocumentsView';
import { ServicesView } from './components/services/ServicesView';
import { FuelView } from './components/fuel/FuelView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { RemindersView } from './components/reminders/RemindersView';
import { AIAssistantView } from './components/assistant/AIAssistantView';
import { ProfileView } from './components/profile/ProfileView';
import { VehicleModal } from './components/vehicles/VehicleModal';
import { ThemeProvider } from './context/ThemeContext';
import confetti from 'canvas-confetti';

const MainApp: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const { addVehicle } = useVehicle();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [addVehicleModalOpen, setAddVehicleModalOpen] = useState(false);

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleCreateVehicle = async (data: any) => {
    await addVehicle(data);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center text-gray-200">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase text-cyan-400 font-mono">
          Loading AutoCare...
        </p>
      </div>
    );
  }

  // If user is not authenticated, show landing page with working auth modal
  if (!currentUser) {
    return (
      <>
        <LandingPage onOpenAuth={handleOpenAuth} />
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
        />
      </>
    );
  }

  // Authenticated state
  return (
    <Layout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      onOpenAddVehicle={() => setAddVehicleModalOpen(true)}
    >
      {currentTab === 'dashboard' && (
        <DashboardView 
          onNavigateTab={setCurrentTab} 
          onOpenAddVehicle={() => setAddVehicleModalOpen(true)} 
        />
      )}
      {currentTab === 'vehicles' && (
        <VehiclesView onOpenAddModal={() => setAddVehicleModalOpen(true)} />
      )}
      {currentTab === 'documents' && <DocumentsView />}
      {currentTab === 'services' && <ServicesView />}
      {currentTab === 'fuel' && <FuelView />}
      {currentTab === 'expenses' && <ExpensesView />}
      {currentTab === 'reminders' && <RemindersView onNavigateTab={setCurrentTab} />}
      {currentTab === 'ai-assistant' && <AIAssistantView onNavigateTab={setCurrentTab} />}
      {currentTab === 'profile' && <ProfileView />}

      {/* Global Add Vehicle Modal */}
      <VehicleModal
        isOpen={addVehicleModalOpen}
        onClose={() => setAddVehicleModalOpen(false)}
        onSubmit={handleCreateVehicle}
        title="Add New Vehicle"
      />
    </Layout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VehicleProvider>
          <MainApp />
        </VehicleProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
