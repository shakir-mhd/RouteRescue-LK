'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Bot, User, Sparkles, RefreshCw, AlertCircle, ChevronDown, Wrench, Shield, Car
} from 'lucide-react';

interface MechanicRobotChatProps {
  userRole: 'driver' | 'mechanic' | 'admin';
}

export default function MechanicRobotChat({ userRole }: MechanicRobotChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, status, sendMessage, error, setMessages } = useChat();

  const isLoading = status === 'streaming' || status === 'submitted';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = (textToSend?: string) => {
    const textToSubmit = textToSend !== undefined ? textToSend : inputText;
    if (!textToSubmit.trim() || isLoading) return;

    sendMessage(
      { text: textToSubmit.trim() },
      { body: { userRole } }
    );

    if (textToSend === undefined) {
      setInputText('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const getMessageText = (m: any): string => {
    if (typeof m.content === 'string' && m.content) return m.content;
    if (Array.isArray(m.parts)) {
      return m.parts
        .map((p: any) => (p.type === 'text' ? p.text : p.text || ''))
        .join('');
    }
    return String(m.content || '');
  };

  const quickPrompts =
    userRole === 'driver'
      ? [
          '🚨 Engine is overheating, what should I do?',
          '🛞 How to safely change a flat tire?',
          '🔋 Battery is dead, jumpstart guide?',
          '⛽ Ran out of fuel on highway safety tips?',
        ]
      : userRole === 'mechanic'
      ? [
          '🔧 OBD2 P0300 Random Misfire diagnostic steps?',
          '⚡ How to test alternator output & battery drain?',
          '🛞 Hydraulic jack & jack-stand safety checklist?',
          '🛠 Best order for brake pad replacement?',
        ]
      : [
          '💳 How to handle unpaid garage subscriptions?',
          '📊 Overview of Colombo dispatch coverage?',
          '⚙️ Base Tariff adjustment best practices?',
          '🛡 Security protocol for vendor identity verification?',
        ];

  const getRoleHeader = () => {
    if (userRole === 'driver') {
      return {
        title: 'Rescue AI',
        subtitle: 'Roadside Emergency & Safety Advisor',
        badge: 'Motorist Mode',
        icon: <Car size={14} className="text-orange-400" />,
        accent: 'from-orange-500 to-amber-600',
      };
    } else if (userRole === 'mechanic') {
      return {
        title: 'Rescue AI',
        subtitle: 'Master Technical & Diagnostic Advisor',
        badge: 'Mechanic Mode',
        icon: <Wrench size={14} className="text-emerald-400" />,
        accent: 'from-emerald-500 to-teal-600',
      };
    } else {
      return {
        title: 'Rescue AI',
        subtitle: 'Platform Operations & Strategy Assistant',
        badge: 'Super Admin Mode',
        icon: <Shield size={14} className="text-cyan-400" />,
        accent: 'from-cyan-500 to-blue-600',
      };
    }
  };

  const roleInfo = getRoleHeader();

  return (
    <>
      {/* FLOATING ANIMATED ROBOT BUTTON */}
      <div className="fixed bottom-20 sm:bottom-6 right-5 z-[99999]">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08, rotate: [0, -5, 5, 0] }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative group flex items-center justify-center h-16 w-16 rounded-full bg-slate-900 border-2 border-amber-500/60 shadow-2xl cursor-pointer overflow-visible"
          aria-label="Toggle Rescue AI Assistant"
        >
          {/* Pulsing Status Ring */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 blur-sm opacity-70 group-hover:opacity-100 animate-pulse transition duration-500" />

          {/* Online Indicator Dot */}
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-slate-950 z-20 flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-ping" />
          </span>

          {/* Button Content */}
          <div className="relative z-10 h-full w-full rounded-full bg-slate-900 p-2.5 flex items-center justify-center overflow-hidden">
            {isOpen ? (
              <X size={26} className="text-slate-200 transition-transform duration-300" />
            ) : (
              <div className="relative flex flex-col items-center justify-center">
                <Bot size={28} className="text-amber-400 animate-bounce" />
                <span className="text-[8px] font-black tracking-widest text-slate-300 uppercase -mt-0.5">
                  AI
                </span>
              </div>
            )}
          </div>
        </motion.button>
      </div>

      {/* FLOATING CHAT DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-36 sm:bottom-24 right-4 sm:right-6 z-[99999] w-[calc(100vw-2rem)] sm:w-[400px] h-[580px] max-h-[75vh] glass-panel bg-slate-950/95 backdrop-blur-2xl rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* CHAT HEADER */}
            <div className={`p-4 bg-gradient-to-r ${roleInfo.accent} text-slate-950 flex items-center justify-between shadow-md`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-950/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-slate-950 shadow-inner">
                  <Bot size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm text-slate-950 tracking-wide">{roleInfo.title}</h3>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-950/30 text-slate-950 font-bold text-[9px] uppercase border border-slate-950/20">
                      {roleInfo.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-900 font-semibold opacity-90">{roleInfo.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMessages([])}
                  title="Clear Chat History"
                  className="p-1.5 rounded-xl hover:bg-slate-950/20 text-slate-950 transition-all cursor-pointer"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Minimize Chat"
                  className="p-1.5 rounded-xl hover:bg-slate-950/20 text-slate-950 transition-all cursor-pointer"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            </div>

            {/* MESSAGES DISPLAY CONTAINER */}
            <div className="flex-grow p-4 overflow-y-auto space-y-3.5 text-xs text-slate-200 scrollbar-thin scrollbar-thumb-slate-800">
              {/* WELCOME BANNER */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
                  <Sparkles size={14} />
                  <span>Welcome to Rescue AI</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  I am your 24/7 intelligent assistant powered by Gemini. Ask me about breakdown emergencies, mechanical diagnostics, safety tips, or platform controls.
                </p>
              </div>

              {/* MESSAGE HISTORY */}
              {messages.map((m: any) => {
                const text = getMessageText(m);
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role !== 'user' && (
                      <div className="h-7 w-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={15} />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] p-3 rounded-2xl leading-relaxed text-xs shadow-md whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-semibold rounded-tr-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {text}
                    </div>

                    {m.role === 'user' && (
                      <div className="h-7 w-7 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={14} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* LOADING INDICATOR */}
              {isLoading && (
                <div className="flex gap-2.5 justify-start items-center text-slate-400">
                  <div className="h-7 w-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                    <Bot size={15} className="animate-spin" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tl-none text-[11px] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse delay-150" />
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse delay-300" />
                    <span className="text-slate-400 font-semibold ml-1">Rescue AI is thinking...</span>
                  </div>
                </div>
              )}

              {/* ERROR ALERT */}
              {error && (
                <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-[11px] flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <span>AI Connection Error: Please check API key or network.</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* QUICK PROMPTS CHIPS */}
            {messages.length === 0 && (
              <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-850 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-medium transition-all cursor-pointer whitespace-nowrap"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* INPUT CONTROLS BAR */}
            <form onSubmit={handleSubmit} className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask Rescue AI a question..."
                className="flex-grow px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
