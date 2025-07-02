/*
  # Add Additional Fields to Service Paghe Clients

  1. Changes
    - Add address fields:
      - `indirizzo` (text) - Street address
      - `via` (text) - Street name
      - `numero_civico` (text) - Street number
      - `citta` (text) - City
      - `cap` (text) - Postal code
    - Add contact fields:
      - `telefono` (text) - Phone number
      - `cellulare` (text) - Mobile number
      - `email` (text) - Email address
      - `pec` (text) - PEC email
    - Add fiscal fields:
      - `codice_fiscale` (text) - Fiscal code
      - `partita_iva` (text) - VAT number
      - `codice_univoco` (text) - Unique code
    - Add additional fields:
      - `sito_web` (text) - Website URL
      - `tipologia_ente` (text) - Entity type
*/

DO $$ 
BEGIN
  -- Add address fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'indirizzo') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN indirizzo text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'via') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN via text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'numero_civico') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN numero_civico text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'citta') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN citta text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'cap') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN cap text;
  END IF;

  -- Add contact fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'telefono') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN telefono text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'cellulare') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN cellulare text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'email') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'pec') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN pec text;
  END IF;

  -- Add fiscal fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'codice_fiscale') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN codice_fiscale text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'partita_iva') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN partita_iva text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'codice_univoco') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN codice_univoco text;
  END IF;

  -- Add additional fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'sito_web') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN sito_web text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clienti_service_paghe' AND column_name = 'tipologia_ente') THEN
    ALTER TABLE clienti_service_paghe ADD COLUMN tipologia_ente text;
  END IF;
END $$;