import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, AlertCircle, ThumbsUp, ThumbsDown, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  helpful?: boolean;
}

const ChatAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveResponse = async (query: string, response: string) => {
    try {
      console.log('Saving response:', { query, response }); // Debug log
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated'); // Debug log
        return;
      }

      const { data, error } = await supabase
        .from('chat_responses')
        .insert([{
          user_id: user.id,
          query,
          response,
          category: detectCategory(query)
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('Response saved with ID:', data.id); // Debug log
      return data.id;
    } catch (err) {
      console.error('Error saving response:', err); // Debug log
    }
  };

  const detectCategory = (query: string): string => {
    const query_lower = query.toLowerCase();
    
    if (query_lower.includes('rendicontazione') || query_lower.includes('cedolini')) {
      return 'rendicontazione';
    } else if (query_lower.includes('fattura') || query_lower.includes('pagamento')) {
      return 'fatturazione';
    } else if (query_lower.includes('cliente') || query_lower.includes('anagrafica')) {
      return 'clienti';
    } else if (query_lower.includes('trasferta') || query_lower.includes('viaggio')) {
      return 'trasferte';
    } else {
      return 'altro';
    }
  };

  const provideFeedback = async (responseId: string, helpful: boolean, notes?: string) => {
    try {
      const { error } = await supabase
        .from('chat_responses')
        .update({ 
          helpful,
          feedback_notes: notes 
        })
        .eq('id', responseId);

      if (error) throw error;

      // Update message in state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === responseId 
            ? { ...msg, helpful } 
            : msg
        )
      );
    } catch (err) {
      console.error('Error saving feedback:', err);
      setError('Errore nel salvataggio del feedback');
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) {
      console.warn('Input is empty'); // Debug log
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      console.log('Sending message:', userMessage); // Debug log
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received response:', data); // Debug log
      const responseId = await saveResponse(input, data.reply);

      const aiMessage: Message = { 
        role: 'assistant', 
        content: data.reply,
        id: responseId || undefined
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentResponseId(responseId || null);
    } catch (err) {
      console.error('Error communicating with AI:', err); // Debug log
      setError('Si è verificato un errore nella comunicazione con l\'assistente AI. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col h-[calc(100vh-16rem)]">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <MessageCircle className="w-5 h-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold">Assistente AI</h2>
        </div>
        <div className="text-sm text-gray-500">
          Chiedi assistenza per qualsiasi dubbio o problema
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[80%]">
              <div
                className={`p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.id && (
                <div className="mt-1 flex items-center space-x-2">
                  <button
                    onClick={() => provideFeedback(msg.id!, true)}
                    className={`p-1 rounded ${
                      msg.helpful === true ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-green-600'
                    }`}
                    title="Risposta utile"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => provideFeedback(msg.id!, false)}
                    className={`p-1 rounded ${
                      msg.helpful === false ? 'bg-red-100 text-red-700' : 'text-gray-400 hover:text-red-600'
                    }`}
                    title="Risposta non utile"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-100 text-red-700 p-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Scrivi un messaggio..."
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAI;