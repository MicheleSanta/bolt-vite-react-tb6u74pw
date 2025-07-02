import React, { useState } from 'react';
import Auth from './components/Auth';
import ClienteForm from './components/ClienteForm';
import ClienteList from './components/ClienteList';
import AffidamentoForm from './components/AffidamentoForm';
import AffidamentoList from './components/AffidamentoList';
import ScadenziarioManager from './components/ScadenziarioManager';
import RendicontazioneManager from './components/RendicontazioneManager';
import ExportFeatures from './components/ExportFeatures';
import { Affidamento, Cliente } from './types/database.types';
import UserMenu from './components/UserMenu';
import DipendenteRendicontazioneManager from './components/DipendenteRendicontazioneManager';
import UserValidationForm from './components/UserValidationForm';
import VersionManager from './components/VersionManager';
import VersionInfo from './components/VersionInfo';
import BuoniPastoManager from './components/BuoniPastoManager';
import BuoniPastoViewer from './components/BuoniPastoViewer';
import ChatAI from './components/ChatAI';
import TipologiaEnteManager from './components/TipologiaEnteManager';
import { FileSpreadsheet, FileText, Calendar, FileBarChart2, FileOutput, Users, Settings, Tag, Utensils, MessageCircle, Building2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import ConnectionAlert from './components/ConnectionAlert';

function App() {
  const { session, userRole, isLoading, error, signOut } = useAuth();
  const [refreshClientiTrigger, setRefreshClientiTrigger] = useState(0);
  const [refreshAffidamentiTrigger, setRefreshAffidamentiTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'clienti' | 'affidamenti' | 'scadenziario' | 'rendicontazione' | 'export' | 'users' | 'versions' | 'buoni_pasto' | 'chat' | 'tipologie_ente'>('clienti');
  const [affidamentoToEdit, setAffidamentoToEdit] = useState<Affidamento | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);

  const handleClienteAdded = () => {
    setRefreshClientiTrigger(prev => prev + 1);
  };

  const handleAffidamentoAdded = () => {
    setRefreshAffidamentiTrigger(prev => prev + 1);
  };

  const handleEditAffidamento = (affidamento: Affidamento) => {
    setAffidamentoToEdit(affidamento);
  };

  const handleCancelEdit = () => {
    setAffidamentoToEdit(null);
  };

  const handleViewClienteAffidamenti = (clienteId: number) => {
    setSelectedClienteId(clienteId);
    setActiveTab('affidamenti');
  };

  const handleEditCliente = (cliente: Cliente) => {
    setClienteToEdit(cliente);
    setActiveTab('clienti');
  };

  const handleCancelEditCliente = () => {
    setClienteToEdit(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Errore</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  // Redirect users with 'user' role to employee portal
  if (userRole === 'user') {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-blue-700 text-white shadow-md">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileSpreadsheet className="w-8 h-8 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold">Portale Dipendenti</h1>
                  <p className="mt-1 text-blue-100">Sistema di rendicontazione mensile</p>
                </div>
              </div>
              <UserMenu 
                userEmail={session.user?.email || 'Utente'} 
                onLogout={signOut} 
              />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('rendicontazione')}
                className={`px-4 py-2 font-medium flex items-center ${
                  activeTab === 'rendicontazione'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileBarChart2 className="w-4 h-4 mr-2" />
                Rendicontazione
              </button>
              <button
                onClick={() => setActiveTab('buoni_pasto')}
                className={`px-4 py-2 font-medium flex items-center ${
                  activeTab === 'buoni_pasto'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Utensils className="w-4 h-4 mr-2" />
                Buoni Pasto
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 font-medium flex items-center ${
                  activeTab === 'chat'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Assistente AI
              </button>
            </div>
          </div>

          {activeTab === 'rendicontazione' && (
            <DipendenteRendicontazioneManager nomeDipendente={session.user?.email || ''} />
          )}

          {activeTab === 'buoni_pasto' && (
            <BuoniPastoViewer />
          )}

          {activeTab === 'chat' && (
            <ChatAI />
          )}
        </main>

        <footer className="bg-gray-800 text-white py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-center text-gray-400">
                &copy; {new Date().getFullYear()} Portale Dipendenti - Rendicontazione
              </p>
              <div className="flex flex-col items-center md:items-end mt-2 md:mt-0">
                <p className="text-center text-gray-500">
                  by M. Santa
                </p>
                <VersionInfo />
              </div>
            </div>
          </div>
        </footer>

        <ConnectionAlert />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileSpreadsheet className="w-8 h-8 mr-3" />
              <div>
                <h1 className="text-2xl font-bold">Gestione Affidamenti</h1>
                <p className="mt-1 text-blue-100">Sistema di gestione clienti per affidamenti</p>
              </div>
            </div>
            <UserMenu 
              userEmail={session.user?.email || 'Utente'} 
              onLogout={signOut} 
            />
          </div>
        </div>
      </header>

      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap">
            <button
              onClick={() => {
                setActiveTab('clienti');
                setSelectedClienteId(null);
              }}
              className={`px-4 py-3 font-medium flex items-center ${
                activeTab === 'clienti'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Clienti
            </button>
            <button
              onClick={() => setActiveTab('affidamenti')}
              className={`px-4 py-3 font-medium flex items-center ${
                activeTab === 'affidamenti'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Affidamenti
            </button>
            <button
              onClick={() => setActiveTab('scadenziario')}
              className={`px-4 py-3 font-medium flex items-center ${
                activeTab === 'scadenziario'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Scadenziario
            </button>
            <button
              onClick={() => setActiveTab('rendicontazione')}
              className={`px-4 py-3 font-medium flex items-center ${
                activeTab === 'rendicontazione'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileBarChart2 className="w-4 h-4 mr-2" />
              Service Paghe
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-3 font-medium flex items-center ${
                activeTab === 'export'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileOutput className="w-4 h-4 mr-2" />
              Esportazioni
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-3 font-medium flex items-center ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Utenti
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-4 py-3 font-medium flex items-center ${
                activeTab === 'versions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Tag className="w-4 h-4 mr-2" />
              Versioni
            </button>
            <button
              onClick={() => setActiveTab('buoni_pasto')}
              className={`px-4 py-3 font-medium flex items-center ${
                activeTab === 'buoni_pasto'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Utensils className="w-4 h-4 mr-2" />
              Buoni Pasto
            </button>
            <button
              onClick={() => setActiveTab('tipologie_ente')}
              className={`px-4 py-3 font-medium flex items-center ${
                activeTab === 'tipologie_ente'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Tipologie Ente
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 flex-grow">
        {activeTab === 'clienti' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <ClienteForm 
                onClienteAdded={handleClienteAdded} 
                clienteToEdit={clienteToEdit}
                onCancelEdit={handleCancelEditCliente}
              />
            </div>
            
            <div className="lg:col-span-2">
              <ClienteList 
                refreshTrigger={refreshClientiTrigger} 
                onViewClienteAffidamenti={handleViewClienteAffidamenti}
                onEditCliente={handleEditCliente}
              />
            </div>
          </div>
        )}

        {activeTab === 'affidamenti' && (
          <div className="space-y-6">
            <AffidamentoForm 
              onAffidamentoAdded={handleAffidamentoAdded} 
              affidamentoToEdit={affidamentoToEdit}
              onCancelEdit={handleCancelEdit}
              preselectedClienteId={selectedClienteId}
            />
            <AffidamentoList 
              refreshTrigger={refreshAffidamentiTrigger} 
              onEditAffidamento={handleEditAffidamento}
              filterClienteId={selectedClienteId}
              onClearClienteFilter={() => setSelectedClienteId(null)}
            />
          </div>
        )}

        {activeTab === 'scadenziario' && (
          <ScadenziarioManager />
        )}

        {activeTab === 'rendicontazione' && (
          <RendicontazioneManager />
        )}

        {activeTab === 'export' && (
          <ExportFeatures />
        )}

        {activeTab === 'users' && (
          <UserValidationForm />
        )}

        {activeTab === 'versions' && (
          <VersionManager />
        )}

        {activeTab === 'buoni_pasto' && (
          <BuoniPastoManager />
        )}

        {activeTab === 'tipologie_ente' && (
          <TipologiaEnteManager />
        )}
      </main>

      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-center text-gray-400">
              &copy; {new Date().getFullYear()} Gestione Affidamenti
            </p>
            <div className="flex flex-col items-center md:items-end mt-2 md:mt-0">
              <p className="text-center text-gray-500">
                by M. Santa
              </p>
              <VersionInfo />
            </div>
          </div>
        </div>
      </footer>

      <ConnectionAlert />
    </div>
  );
}

export default App;