/*
  # Add Chat Responses Storage

  1. New Tables
    - `chat_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `query` (text, user's question)
      - `response` (text, AI's response)
      - `created_at` (timestamptz)
      - `category` (text, for categorizing questions)
      - `helpful` (boolean, user feedback)
      - `feedback_notes` (text, optional user feedback)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS chat_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  response text NOT NULL,
  category text,
  helpful boolean,
  feedback_notes text,
  created_at timestamptz DEFAULT now(),
  
  -- Add constraint to ensure query and response are not empty
  CONSTRAINT chat_responses_query_not_empty CHECK (length(trim(query)) > 0),
  CONSTRAINT chat_responses_response_not_empty CHECK (length(trim(response)) > 0)
);

-- Enable RLS
ALTER TABLE chat_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chat responses"
  ON chat_responses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM users_custom
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert their own chat responses"
  ON chat_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat responses"
  ON chat_responses
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indices for better performance
CREATE INDEX idx_chat_responses_user_id ON chat_responses(user_id);
CREATE INDEX idx_chat_responses_category ON chat_responses(category);
CREATE INDEX idx_chat_responses_created_at ON chat_responses(created_at);