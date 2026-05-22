import { useState } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';

interface MessageInputProps {
  onMessageSent?: () => void;
}

/**
 * MessageInput component for sending messages to the server
 */
export function MessageInput({ onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Message cannot be empty');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      // Send message to the server
      await invoke('send_message', { message: message.trim() });
      
      // Clear input and notify parent
      setMessage('');
      onMessageSent?.();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div class="message-input-container">
      <form class="message-form" onSubmit={handleSubmit}>
        <div class="input-group">
          <input
            type="text"
            class="message-input"
            value={message}
            onInput={(e) => setMessage(e.currentTarget.value)}
            placeholder="Type a message..."
            disabled={isSending}
            maxLength={500}
          />
          <button
            type="submit"
            class="send-btn"
            disabled={isSending || !message.trim()}
          >
            {isSending ? (
              <span class="spinner small" />
            ) : (
              <span class="send-icon">📤</span>
            )}
            <span class="send-text">{isSending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
        
        {error && (
          <div class="message-error">
            <span class="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
}