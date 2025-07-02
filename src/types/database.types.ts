export interface TipologiaEnte {
  id: number;
  descrizione: string;
  forma_giuridica: string;
  created_at: string;
}

export interface TipologiaEnteInsert {
  descrizione: string;
  forma_giuridica: string;
}

export interface TipoServizio {
  id: number;
  codice_servizio: string;
  descrizione: string;
  attivo: boolean;
  data_creazione: string;
  data_modifica: string | null;
}

export interface TipoServizioInsert {
  codice_servizio: string;
  descrizione: string;
  attivo?: boolean;
}

export interface Rendicontazione {
  id: number;
  partner: string;
  nome_tecnico: string;
  mese: string;
  id_mese: number;
  anno: number;
  codice_cliente: string;
  nome_cliente: string;
  numero_commessa?: string;
  numero_cedolini: number;
  numero_cedolini_extra: number;
  totale_cedolini: number;
  fascia: string;
  importo: number;
  stato?: string;
  numero_fattura?: string;
  anno_fattura?: number;
  data_fattura?: string | null;
  tipo_servizio_id?: number;
  tipo_servizio?: TipoServizio;
  trasferte?: RendicontazioneTrasferte[];
  user_id?: string;
  flag_trasferta?: boolean;
  totale_trasferta?: number;
  numero_trasferte?: number;
}

export interface RendicontazioneInsert {
  partner: string;
  nome_tecnico: string;
  mese: string;
  id_mese: number;
  anno: number;
  codice_cliente: string;
  nome_cliente: string;
  numero_commessa?: string;
  numero_cedolini: number;
  numero_cedolini_extra: number;
  totale_cedolini: number;
  fascia: string;
  importo: number;
  stato?: string;
  numero_fattura?: string;
  anno_fattura?: number;
  data_fattura?: string | null;
  tipo_servizio_id?: number;
}

export interface RendicontazioneTrasferte {
  id: string;
  rendicontazione_id: number;
  importo_unitario: number;
  numero_trasferte: number;
  importo_totale?: number;
  note?: string;
  created_at?: string;
  data_trasferta?: string;
}

export interface RendicontazioneTrasferteInsert {
  rendicontazione_id: number;
  importo_unitario: number;
  numero_trasferte: number;
  importo_totale?: number;
  note?: string;
  data_trasferta?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
}

export interface TaskInsert {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface BuonoPasto {
  id: string;
  data: string;
  user_id: string;
  tipo_presenza: 'presenza_sede' | 'trasferta' | 'smart_working' | 'assenza';
  diritto_buono: boolean;
  note?: string;
  created_at: string;
  created_by?: string;
  modified_at?: string;
  modified_by?: string;
  user?: {
    email: string;
    users_custom?: Array<{
      nome?: string;
    }>;
  };
}

export interface BuonoPastoInsert {
  data: string;
  user_id: string;
  tipo_presenza: 'presenza_sede' | 'trasferta' | 'smart_working' | 'assenza';
  note?: string;
}