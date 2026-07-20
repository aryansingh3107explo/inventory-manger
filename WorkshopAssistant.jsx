import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, AlertCircle, Sparkles, HelpCircle } from "lucide-react";
import { api } from "../api";

export default function WorkshopAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: "Hello! I am your **IR-Works AI Assistant**, the diagnostic co-pilot for this Indian Railways Workshop. \n\nI can help you diagnose equipment anomalies, review pending maintenance, or query parts stock. What is your mechanical diagnostic inquiry?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    if (!textOverride) setInput("");
    setLoading(true);

    const updatedMessages = [...messages, { role: "user", content: textToSend }];
    setMessages(updatedMessages);

    try {
      // Map message history to schema expected by edge function: Array<{role, content}>
      const history = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const reply = await api.askWorkshopAssistant(history);
      setMessages([...updatedMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([
        ...updatedMessages, 
        { 
          role: "assistant", 
          content: `❌ **Failed to retrieve diagnostic verdict.**\n\nDetails: ${err.message}` 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { text: "Diagnose WDM-3D Diesel Engine", label: "WDM-3D Engine" },
    { text: "List parts below safety stock", label: "Low Stock Parts" },
    { text: "Check CNC Milling Machine stats", label: "CNC Machine Stats" }
  ];

  // Helper to render simple markdown bold and lists
  const formatMessageContent = (text) => {
    return text.split("\n").map((line, idx) => {
      // Check for bullet points
      const bulletMatch = line.match(/^-\s+(.*)$/);
      // Replace bold markdown **text** with <strong>text</strong>
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

      if (bulletMatch) {
        return (
          <li key={idx} className="list-disc ml-4 mt-1" dangerouslySetInnerHTML={{ __html: processedLine.replace(/^-\s+/, "") }} />
        );
      }
      return (
        <p key={idx} className="min-h-[1em] leading-relaxed" dangerouslySetInnerHTML={{ __html: processedLine }} />
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 shadow-glow-green hover:scale-105 active:scale-95 transition-all border border-emerald-400/20"
        >
          <Bot size={26} />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[360px] h-[500px] flex flex-col rounded-3xl border border-slate-900 bg-slate-950 shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-slate-900/90 border-b border-slate-800/80 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">IR-Works AI Assistant</h3>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Locomotive Diagnostic Co-pilot</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-slate-800 bg-slate-800/40 p-1 text-slate-400 hover:text-slate-200 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((m, i) => {
              const isAssistant = m.role === "assistant";
              return (
                <div key={i} className={`flex items-start gap-2.5 ${!isAssistant ? "flex-row-reverse" : ""}`}>
                  {isAssistant && (
                    <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/15">
                      AI
                    </div>
                  )}
                  <div 
                    className={`rounded-2xl px-4 py-2.5 text-xs max-w-[80%] leading-relaxed ${
                      isAssistant 
                        ? "bg-slate-900/40 text-slate-200 border border-slate-900/80" 
                        : "bg-emerald-500 text-slate-950 font-semibold"
                    }`}
                  >
                    {formatMessageContent(m.content)}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/15">
                  AI
                </div>
                <div className="rounded-2xl px-4 py-3 bg-slate-900/40 border border-slate-900/80 flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompts */}
          {messages.length === 1 && (
            <div className="p-3 border-t border-slate-900/40 bg-slate-950 flex flex-wrap gap-2 justify-center">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleSend(e, p.text)}
                  className="flex items-center gap-1 text-[10px] font-bold rounded-lg border border-slate-900 bg-slate-900/40 px-2.5 py-1.5 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/25 transition-all"
                >
                  <HelpCircle size={10} />
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Box Form */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-900 bg-slate-950 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for locomotive specs, diagnostics..."
              className="flex-1 rounded-xl border border-slate-900 bg-slate-900/30 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500/30 focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 active:scale-95 transition-all"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
