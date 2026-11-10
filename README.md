# MoBe Revenue Tracker

Web app installabile (PWA) per registrare le entrate di MoBe Visuals: fatturato annuale, accantonamento 30%, stato fatture per cliente e mese.

- Dati: Supabase (Postgres + login email), protetti da Row Level Security.
- Hosting: GitHub Pages. Configurazione in `js/config.js`.
- Schema del database: `supabase-setup.sql` (da eseguire una volta nel SQL Editor di Supabase).
