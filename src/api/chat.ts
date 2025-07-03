import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

// System message to provide context and constraints
const systemMessage = {
  role: 'system',
  content: `Sei un assistente esperto per un'applicazione di gestione affidamenti e service paghe.
  Le tue risposte devono essere:
  - Professionali e formali
  - Concise ma complete
  - In italiano
  - Focalizzate sul dominio specifico dell'applicazione
  - Basate sulle best practices del settore
  
  Puoi aiutare con:
  - Rendicontazione attività e cedolini
  - Gestione clienti e affidamenti
  - Fatturazione e scadenze
  - Trasferte e rimborsi
  - Procedure amministrative
  
  Non fornire mai:
  - Informazioni sensibili o riservate
  - Consigli legali o fiscali specifici
  - Dati personali di utenti o clienti`
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  if (!openai.apiKey) {
    return res.status(500).json({ error: 'OpenAI API key non configurata' });
  }

  const { messages } = req.body;

  try {
    // Add system message at the start of the conversation
    const fullMessages = [systemMessage, ...messages];

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const reply = response.choices[0].message?.content;
    
    if (!reply) {
      throw new Error('Nessuna risposta ricevuta dall\'AI');
    }

    res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Errore nella richiesta OpenAI:', error);
    
    // Handle different types of errors
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Errore nella risposta OpenAI',
        details: error.response.data
      });
    } else if (error.request) {
      res.status(500).json({
        error: 'Nessuna risposta ricevuta da OpenAI',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'Errore nella comunicazione con l\'AI',
        details: error.message 
      });
    }
  }
}