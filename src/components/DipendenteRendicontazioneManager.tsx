import React, { useState } from 'react';
import DipendenteRendicontazioneForm from './DipendenteRendicontazioneForm';
import { FileSpreadsheet, FileBarChart2 } from 'lucide-react';
import DipendenteStatistiche from './DipendenteStatistiche';

interface DipendenteRendicontazioneManagerProps {
  nomeDipendente: string;
}

const DipendenteRendicontazioneManager: React.FC<DipendenteRendicontazioneManagerProps> = ({ 
  nomeDipendente 
}) => {
  const [activeTab, setActiveTab] = useState<'rendicontazioni' | 'statistiche'>('rendicontazioni');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('rendicontazioni')}
            className={`px-4 py-2 font-medium flex items-center ${
              activeTab === 'rendicontazioni'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Rendicontazioni
          </button>
          <button
            onClick={() => setActiveTab('statistiche')}
            className={`px-4 py-2 font-medium flex items-center ${
              activeTab === 'statistiche'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileBarChart2 className="w-4 h-4 mr-2" />
            Statistiche
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'rendicontazioni' ? (
        <DipendenteRendicontazioneForm 
          nomeDipendente={nomeDipendente}
        />
      ) : (
        <DipendenteStatistiche />
      )}
    </div>
  );
};

export default DipendenteRendicontazioneManager;