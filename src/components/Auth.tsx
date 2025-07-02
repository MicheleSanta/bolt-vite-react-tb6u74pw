import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, LogIn, AlertCircle, Check, Eye, EyeOff, Shield, UserPlus } from 'lucide-react';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useAuth } from '../context/AuthContext';

interface AuthProps {
  isEmployeePortal?: boolean;
}

const Auth: React.FC<AuthProps> = ({ isEmployeePortal = false }) => {
  const { userRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { error, handleError, clearError } = useErrorHandler();
  const [success, setSuccess] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [nome, setNome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [note, setNote] = useState('');
  const [showFullForm, setShowFullForm] = useState(userRole === 'admin');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    setSuccess(null);

    try {
      if (isSignUp && !isEmployeePortal) {
        if (password.length < 6) {
          throw new Error('La password deve essere di almeno 6 caratteri');
        }

        // First check if user already exists in users_custom
        const { data: existingUser } = await supabase
          .from('users_custom')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingUser) {
          throw new Error('Un utente con questa email esiste già');
        }

        // Create auth user with metadata
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'user', // Force 'user' role for new signups
              nome,
              telefono,
              note
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            throw new Error('Un utente con questa email esiste già');
          }
          throw signUpError;
        }

        if (data.user) {
          // Create users_custom record
          const { error: customError } = await supabase
            .from('users_custom')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              role: 'user', // Force 'user' role
              nome,
              telefono,
              note,
              attivo: true,
              validato: false
            }]);

          if (customError) throw customError;

          setSuccess('Registrazione completata! La tua richiesta è in attesa di approvazione da parte dell\'amministratore.');
          setIsSignUp(false);
          resetForm();
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Credenziali non valide. Verifica email e password.');
          }
          throw signInError;
        }

        if (data.user) {
          // Check if user is validated
          const { data: customUser, error: customError } = await supabase
            .from('users_custom')
            .select('validato, motivo_rifiuto, role, attivo')
            .eq('id', data.user.id)
            .single();

          if (customError) throw customError;

          if (!customUser.attivo) {
            throw new Error('Questo account è stato disattivato');
          }

          if (!customUser.validato) {
            throw new Error(
              customUser.motivo_rifiuto 
                ? `Account non validato. Motivo: ${customUser.motivo_rifiuto}` 
                : 'Il tuo account è in attesa di approvazione da parte dell\'amministratore.'
            );
          }

          // Check if user has the correct role for employee portal
          if (isEmployeePortal && customUser.role !== 'employee') {
            throw new Error('Accesso non autorizzato. Solo i dipendenti possono accedere a questo portale.');
          }
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setNome('');
    setTelefono('');
    setNote('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            {isEmployeePortal ? (
              <User className="w-8 h-8 text-blue-600" />
            ) : isSignUp ? (
              <UserPlus className="w-8 h-8 text-blue-600" />
            ) : (
              <Shield className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEmployeePortal ? 'Portale Dipendenti' : (isSignUp ? 'Registrazione' : 'Accesso')}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEmployeePortal 
              ? 'Accedi al portale dipendenti per la gestione delle attività'
              : (isSignUp 
                ? 'Crea un nuovo account per accedere al sistema' 
                : 'Inserisci le tue credenziali per accedere')}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
            <Check className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="nome@esempio.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {isSignUp && !isEmployeePortal && (
              <p className="text-xs text-gray-500 mt-1">La password deve essere di almeno 6 caratteri</p>
            )}
          </div>

          {(isSignUp || showFullForm) && !isEmployeePortal && (
            <>
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mario Rossi"
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono
                </label>
                <input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+39 123 456 7890"
                />
              </div>

              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Note aggiuntive (opzionale)"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Caricamento...
              </span>
            ) : (
              <span className="flex items-center">
                {isEmployeePortal ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Accedi al Portale
                  </>
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Registrati
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Accedi
                  </>
                )}
              </span>
            )}
          </button>
        </form>

        {!isEmployeePortal && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                clearError();
                setSuccess(null);
                resetForm();
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isSignUp
                ? 'Hai già un account? Accedi'
                : 'Non hai un account? Registrati'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;