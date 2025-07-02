import { z } from 'zod';

export const rendicontazioneSchema = z.object({
  partner: z.string().min(1, 'Il partner è obbligatorio'),
  nome_tecnico: z.string().min(1, 'Il nome del tecnico è obbligatorio'),
  mese: z.string().min(1, 'Il mese è obbligatorio'),
  id_mese: z.number().min(1, 'Il mese è obbligatorio'),
  anno: z.number().min(2000, 'Anno non valido').max(2100, 'Anno non valido'),
  codice_cliente: z.string().min(1, 'Il codice cliente è obbligatorio'),
  nome_cliente: z.string().min(1, 'Il nome cliente è obbligatorio'),
  numero_commessa: z.string().optional(),
  numero_cedolini: z.number().min(0, 'Il numero di cedolini non può essere negativo'),
  numero_cedolini_extra: z.number().min(0, 'Il numero di cedolini extra non può essere negativo'),
  totale_cedolini: z.number().min(0, 'Il totale cedolini non può essere negativo'),
  fascia: z.string().min(1, 'La fascia è obbligatoria'),
  importo: z.number().min(0, 'L\'importo non può essere negativo'),
  stato: z.string().optional(),
  numero_fattura: z.string().optional(),
  anno_fattura: z.number().optional(),
  data_fattura: z.string().optional()
});

export const clienteSchema = z.object({
  denominazione: z.string().min(1, 'La denominazione è obbligatoria'),
  referente: z.string().min(1, 'Il referente è obbligatorio'),
  cellulare: z.string().min(1, 'Il cellulare è obbligatorio'),
  email: z.string().email('Email non valida'),
  ufficio: z.string().optional(),
  indirizzo: z.string().optional(),
  citta: z.string().optional(),
  cap: z.string().optional(),
  provincia: z.string().optional(),
  codice_fiscale: z.string().optional(),
  partita_iva: z.string().optional(),
  pec: z.string().email('PEC non valida').optional().or(z.literal('')),
  codice_univoco: z.string().optional(),
  sito_web: z.string().url('URL non valido').optional().or(z.literal('')),
  note: z.string().optional()
});

export const affidamentoSchema = z.object({
  anno: z.number().min(2000, 'Anno non valido').max(2100, 'Anno non valido'),
  determina: z.string().min(1, 'La determina è obbligatoria'),
  numero_determina: z.string().optional(),
  cig: z.string().optional(),
  data: z.string().optional(),
  data_termine: z.string().optional(),
  cliente_id: z.number().min(1, 'Il cliente è obbligatorio'),
  descrizione: z.string().min(1, 'La descrizione è obbligatoria'),
  stato: z.string().min(1, 'Lo stato è obbligatorio'),
  quantita: z.number().min(1, 'La quantità deve essere maggiore di 0'),
  prezzo_unitario: z.number().min(0, 'Il prezzo unitario non può essere negativo'),
  imponibile: z.number().min(0, 'L\'imponibile non può essere negativo'),
  iva: z.number().min(0, 'L\'IVA non può essere negativa'),
  totale: z.number().min(0, 'Il totale non può essere negativo'),
  has_provvigione: z.boolean().optional(),
  tipo_provvigione: z.enum(['attiva', 'passiva']).optional(),
  partner_provvigione: z.string().optional(),
  percentuale_provvigione: z.number().min(0, 'La percentuale non può essere negativa').max(100, 'La percentuale non può superare 100').optional(),
  importo_provvigione: z.number().min(0, 'L\'importo non può essere negativo').optional()
});

export const fatturazioneSchema = z.object({
  affidamento_id: z.number().min(1, 'L\'affidamento è obbligatorio'),
  percentuale: z.number().min(0, 'La percentuale non può essere negativa').max(100, 'La percentuale non può superare 100'),
  importo: z.number().min(0, 'L\'importo non può essere negativo'),
  data_scadenza: z.string().min(1, 'La data di scadenza è obbligatoria'),
  stato: z.string().min(1, 'Lo stato è obbligatorio'),
  numero_fattura: z.string().optional(),
  data_emissione: z.string().optional(),
  data_pagamento: z.string().optional(),
  note: z.string().optional()
});