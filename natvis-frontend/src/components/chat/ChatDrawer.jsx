import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store';
import { apiChat, genSessionId } from '../../api';

export default function ChatDrawer() {
  const chatSpecies = useStore(s => s.chatDrawerName);
  const closeChat = useStore(s => s.closeChat);

  const isGeneral = chatSpecies === '__general__';
  const speciesName = isGeneral ? null : chatSpecies;
  const isOpen = !!chatSpecies;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(genSessionId);
  const bottomRef = useRef();

  useEffect(() => {
    if (!isOpen) return;
    if (speciesName) {
      setMessages([{
        role: 'assistant',
        content: `I'm ready to answer questions about *${speciesName}*. Ask me about its safety, edibility, medicinal uses, habitat, or anything else.`,
      }]);
    } else {
      setMessages([{
        role: 'assistant',
        content: `Welcome to NatVis Chat! 🌿 Ask me anything about flora, fauna, or fungi. I can help you identify plants, understand toxicity, find medicinal uses, and more.`,
      }]);
    }
  }, [isOpen, speciesName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await apiChat(msg, sessionId, speciesName);
      setMessages(m => [...m, { role: 'assistant', content: res.response ?? res.message ?? JSON.stringify(res) }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeChat}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(4, 8, 4, 0.5)',
              backdropFilter: 'blur(4px)', zIndex: 150,
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 'min(400px, 90vw)',
              background: 'rgba(8, 16, 8, 0.97)',
              borderLeft: '1px solid rgba(134, 193, 100, 0.12)',
              zIndex: 200,
              display: 'flex', flexDirection: 'column',
              backdropFilter: 'blur(40px)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 18px 14px',
              borderBottom: '1px solid rgba(134, 193, 100, 0.1)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={closeChat} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#86c164', fontSize: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>✕</button>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 11, color: '#4a7c35', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    💬 {isGeneral ? 'Nature Chat' : 'Species Chat'}
                  </div>
                  {speciesName && (
                    <div style={{
                      fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                      fontSize: 14, color: '#c8d8c0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {speciesName}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '18px 16px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 9,
                      background: 'rgba(134, 193, 100, 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, flexShrink: 0, marginRight: 8, marginTop: 2,
                    }}>🌿</div>
                  )}
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? 'rgba(74, 124, 53, 0.25)' : 'rgba(20, 32, 20, 0.9)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(134, 193, 100, 0.25)' : 'rgba(255,255,255,0.07)'}`,
                    fontSize: 13, color: '#c8d8c0', lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 9,
                    background: 'rgba(134, 193, 100, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13,
                  }}>🌿</div>
                  <div style={{
                    display: 'flex', gap: 4, padding: '10px 14px',
                    background: 'rgba(20, 32, 20, 0.9)', borderRadius: '14px 14px 14px 4px',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{
                        width: 5, height: 5, borderRadius: '50%', background: '#86c164',
                        animation: `pulse 1.2s ${j * 0.2}s ease-in-out infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '12px 16px 18px',
              borderTop: '1px solid rgba(134, 193, 100, 0.1)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={speciesName ? `Ask about ${speciesName}...` : 'Ask anything about nature...'}
                  rows={1}
                  style={{
                    flex: 1, background: 'rgba(20, 36, 20, 0.8)',
                    border: '1px solid rgba(134, 193, 100, 0.2)',
                    borderRadius: 12, padding: '11px 14px', color: '#c8d8c0',
                    fontSize: 13, outline: 'none', resize: 'none',
                    fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: 'rgba(74, 124, 53, 0.4)',
                    border: '1px solid rgba(134, 193, 100, 0.3)',
                    color: '#86c164', cursor: 'pointer', fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: loading || !input.trim() ? 0.4 : 1,
                    transition: 'opacity 0.15s', flexShrink: 0,
                  }}
                >↑</button>
              </div>
              <div style={{ fontSize: 10, color: '#3d5238', textAlign: 'center', marginTop: 6 }}>
                Enter to send · Shift+Enter for new line
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
