import React, { useEffect, useState, useRef, FormEvent, KeyboardEvent, useCallback } from "react";
import { Send, Terminal, Plus, RefreshCw, Cpu, Code2, ChevronLeft, Pencil, Trash2, Bot, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

declare const puter: any;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface CustomGpt {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  createdAt: number;
}

const DEFAULT_GPT: CustomGpt = {
  id: 'default',
  name: 'POL AI',
  description: 'Your technical co-founder. Debug code, architect systems, and ship faster.',
  systemPrompt: '',
  createdAt: 0,
};

const STORAGE_KEY = 'pol-ai-custom-gpts';

function loadGpts(): CustomGpt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGpts(gpts: CustomGpt[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gpts));
}

const starterPrompts = [
  { icon: <Code2 size={18} />, text: "Help me debug this code" },
  { icon: <Cpu size={18} />, text: "Explain this concept" },
  { icon: <Terminal size={18} />, text: "Write a function that..." },
];

function SimpleMarkdown({ content }: { content: string }) {
  const renderText = (text: string) => {
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const parts: { type: string; content: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'codeblock', content: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts.map((part, index) => {
      if (part.type === 'codeblock') {
        const lines = part.content.split('\n');
        const lang = lines[0].trim() ? lines[0].trim() : '';
        const code = lang ? lines.slice(1).join('\n') : part.content;
        return (
          <div key={index} className="my-4 rounded-md bg-zinc-950 border border-zinc-800 overflow-hidden">
            {lang && (
              <div className="bg-zinc-900 px-4 py-1 text-xs text-zinc-400 border-b border-zinc-800 uppercase tracking-wider font-mono">
                {lang}
              </div>
            )}
            <pre className="p-4 overflow-x-auto">
              <code className="text-sm font-mono text-zinc-300">{code}</code>
            </pre>
          </div>
        );
      }
      const inlineParts = part.content.split(/(\*\*.*?\*\*|`.*?`|\n)/g);
      return (
        <span key={index}>
          {inlineParts.map((inlinePart, i) => {
            if (inlinePart === '\n') return <br key={i} />;
            if (inlinePart.startsWith('**') && inlinePart.endsWith('**'))
              return <strong key={i} className="font-semibold text-white">{inlinePart.slice(2, -2)}</strong>;
            if (inlinePart.startsWith('`') && inlinePart.endsWith('`'))
              return <code key={i} className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-primary font-mono text-sm">{inlinePart.slice(1, -1)}</code>;
            return <span key={i}>{inlinePart}</span>;
          })}
        </span>
      );
    });
  };

  return <div className="text-zinc-300 leading-relaxed space-y-2">{renderText(content)}</div>;
}

function GptModal({
  gpt,
  onSave,
  onClose,
}: {
  gpt: CustomGpt | null;
  onSave: (data: Omit<CustomGpt, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(gpt?.name ?? '');
  const [description, setDescription] = useState(gpt?.description ?? '');
  const [systemPrompt, setSystemPrompt] = useState(gpt?.systemPrompt ?? '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), systemPrompt: systemPrompt.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-base">
            {gpt ? 'Edit Custom GPT' : 'Create Custom GPT'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Name</label>
            <Input
              data-testid="input-gpt-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Code Reviewer"
              className="bg-background border-border text-sm"
              maxLength={40}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Description</label>
            <Input
              data-testid="input-gpt-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description of what this assistant does"
              className="bg-background border-border text-sm"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">System Prompt</label>
            <Textarea
              data-testid="input-gpt-system-prompt"
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="You are an expert code reviewer. Review code for bugs, performance issues, and best practices. Always explain your reasoning clearly."
              className="bg-background border-border text-sm min-h-[140px] resize-none font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              This is sent as a hidden system instruction before every conversation.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            data-testid="button-save-gpt"
            size="sm"
            onClick={handleSave}
            disabled={!name.trim()}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {gpt ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [customGpts, setCustomGpts] = useState<CustomGpt[]>(() => loadGpts());
  const [activeGptId, setActiveGptId] = useState<string>('default');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalState, setModalState] = useState<{ open: boolean; editing: CustomGpt | null }>({ open: false, editing: null });

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const allGpts = [DEFAULT_GPT, ...customGpts];
  const activeGpt = allGpts.find(g => g.id === activeGptId) ?? DEFAULT_GPT;

  useEffect(() => {
    let checks = 0;
    const interval = setInterval(() => {
      if (typeof puter !== 'undefined') { setIsReady(true); clearInterval(interval); }
      if (checks++ > 50) { clearInterval(interval); setError("Could not load AI services. Please refresh."); }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    autoResize();
  };

  const switchGpt = (id: string) => {
    setActiveGptId(id);
    setMessages([]);
    setError(null);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const saveGpt = useCallback((data: Omit<CustomGpt, 'id' | 'createdAt'>) => {
    if (modalState.editing) {
      setCustomGpts(prev => {
        const updated = prev.map(g => g.id === modalState.editing!.id ? { ...g, ...data } : g);
        saveGpts(updated);
        return updated;
      });
    } else {
      const newGpt: CustomGpt = { id: crypto.randomUUID(), ...data, createdAt: Date.now() };
      setCustomGpts(prev => {
        const updated = [...prev, newGpt];
        saveGpts(updated);
        return updated;
      });
      switchGpt(newGpt.id);
    }
    setModalState({ open: false, editing: null });
  }, [modalState.editing]);

  const deleteGpt = (id: string) => {
    setCustomGpts(prev => {
      const updated = prev.filter(g => g.id !== id);
      saveGpts(updated);
      return updated;
    });
    if (activeGptId === id) switchGpt('default');
  };

  const submitMessage = async (text: string) => {
    if (!text.trim() || isStreaming || !isReady) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    const currentMessages = [...messages, userMessage];
    setMessages([...currentMessages, { role: 'assistant', content: '', isStreaming: true }]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsStreaming(true);
    setError(null);

    try {
      const apiMessages: { role: string; content: string }[] = [];
      if (activeGpt.systemPrompt) {
        apiMessages.push({ role: 'system', content: activeGpt.systemPrompt });
      }
      currentMessages.forEach(m => apiMessages.push({ role: m.role, content: m.content }));

      const response = await puter.ai.chat(apiMessages, {
        model: 'qwen-2.5-72b-instruct',
        stream: true,
      });

      let isFirstChunk = true;
      for await (const part of response) {
        const chunk = part?.text ?? part?.choices?.[0]?.delta?.content ?? '';
        if (chunk) {
          setMessages(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              last.content = isFirstChunk ? chunk : last.content + chunk;
              isFirstChunk = false;
            }
            return next;
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("An error occurred while generating the response.");
      setMessages(prev => {
        const next = [...prev];
        if (next[next.length - 1]?.role === 'assistant' && !next[next.length - 1].content) next.pop();
        return next;
      });
    } finally {
      setIsStreaming(false);
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') last.isStreaming = false;
        return next;
      });
    }
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); submitMessage(input); };
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMessage(input); }
  };

  const initials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col shrink-0 border-r border-border bg-card/40 transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-64" : "w-0"
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Terminal size={12} className="text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-sm">POL AI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-close-sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2 mb-2">Assistants</p>

          {allGpts.map(gpt => (
            <div
              key={gpt.id}
              data-testid={`gpt-item-${gpt.id}`}
              onClick={() => switchGpt(gpt.id)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                activeGptId === gpt.id
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted/50 border border-transparent"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                gpt.id === 'default'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors"
              )}>
                {gpt.id === 'default' ? <Bot size={16} /> : initials(gpt.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{gpt.name}</p>
                {gpt.description && (
                  <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{gpt.description}</p>
                )}
              </div>
              {gpt.id !== 'default' && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    data-testid={`button-edit-gpt-${gpt.id}`}
                    onClick={e => { e.stopPropagation(); setModalState({ open: true, editing: gpt }); }}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    data-testid={`button-delete-gpt-${gpt.id}`}
                    onClick={e => { e.stopPropagation(); deleteGpt(gpt.id); }}
                    className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border shrink-0">
          <Button
            data-testid="button-create-gpt"
            variant="outline"
            size="sm"
            onClick={() => setModalState({ open: true, editing: null })}
            className="w-full text-xs font-mono justify-start gap-2 h-9 border-dashed hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus size={14} />
            New Custom GPT
          </Button>
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                data-testid="button-open-sidebar"
                onClick={() => setSidebarOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors mr-1"
              >
                <Menu size={18} />
              </button>
            )}
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
              activeGpt.id === 'default' ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            )}>
              {activeGpt.id === 'default' ? <Bot size={14} /> : initials(activeGpt.name)}
            </div>
            <div>
              <h1 className="font-display font-semibold text-sm leading-none">{activeGpt.name}</h1>
              <span className="text-[11px] text-muted-foreground font-mono">qwen-2.5-72b</span>
            </div>
          </div>
          <Button
            data-testid="button-new-thread"
            variant="outline"
            size="sm"
            onClick={() => { setMessages([]); setError(null); }}
            className="text-xs font-mono h-8 bg-background hover:bg-muted"
          >
            <Plus size={14} className="mr-2" />
            New Thread
          </Button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth">
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="space-y-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-border",
                    activeGpt.id === 'default' ? "bg-card" : "bg-primary/10"
                  )}>
                    {activeGpt.id === 'default'
                      ? <Terminal size={32} className="text-primary" />
                      : <span className="text-2xl font-bold text-primary">{initials(activeGpt.name)}</span>
                    }
                  </div>
                  <h2 className="font-display text-2xl font-semibold">
                    {activeGpt.id === 'default' ? 'How can I help you build?' : `Chat with ${activeGpt.name}`}
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    {activeGpt.description || 'Ask me anything.'}
                  </p>
                </div>
                {activeGpt.id === 'default' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                    {starterPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        data-testid={`button-starter-${i}`}
                        onClick={() => submitMessage(prompt.text)}
                        className="flex flex-col items-start gap-2 p-4 text-left rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all group"
                      >
                        <div className="text-primary group-hover:scale-110 transition-transform">{prompt.icon}</div>
                        <span className="text-sm font-medium text-zinc-300">{prompt.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    {msg.role === 'assistant' && (
                      <Avatar className="w-8 h-8 rounded-lg shrink-0 mt-1 shadow-sm border border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary rounded-lg text-xs font-mono">
                          {activeGpt.id === 'default' ? 'AI' : initials(activeGpt.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn(
                      "px-5 py-4 rounded-2xl max-w-[85%] text-sm",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-tr-sm shadow-md"
                        : "bg-card border border-border rounded-tl-sm shadow-sm"
                    )}>
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <div className="prose-sm max-w-none">
                          {msg.content === '' && msg.isStreaming ? (
                            <div className="flex space-x-1 items-center h-5">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          ) : (
                            <>
                              <SimpleMarkdown content={msg.content} />
                              {msg.isStreaming && <span className="inline-block w-2 h-4 ml-1 align-middle bg-primary animate-pulse" />}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <Avatar className="w-8 h-8 rounded-lg shrink-0 mt-1 shadow-sm">
                        <AvatarFallback className="bg-secondary text-secondary-foreground rounded-lg text-xs font-mono">ME</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={scrollRef} className="h-1" />
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg mx-auto mt-4">
                <RefreshCw size={14} />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 md:p-6 bg-background/80 backdrop-blur-md border-t border-border shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-3 bg-card border border-border rounded-2xl p-2 shadow-lg focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all"
            >
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  data-testid="input-message"
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder={isReady ? `Message ${activeGpt.name}...` : "Initializing AI..."}
                  disabled={!isReady || isStreaming}
                  className="min-h-[44px] max-h-[200px] w-full resize-none border-0 bg-transparent py-3 px-4 focus-visible:ring-0 text-sm shadow-none font-sans"
                  rows={1}
                />
              </div>
              <div className="shrink-0 p-1 pb-1.5 pr-1.5">
                <Button
                  data-testid="button-send"
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || !isReady || isStreaming}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all",
                    input.trim() ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "bg-secondary text-muted-foreground"
                  )}
                >
                  <Send size={16} className={cn("transition-transform", input.trim() && "translate-x-0.5 -translate-y-0.5")} />
                </Button>
              </div>
            </form>
            <div className="text-center mt-3">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                POL AI // press shift+enter for newline
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalState.open && (
        <GptModal
          gpt={modalState.editing}
          onSave={saveGpt}
          onClose={() => setModalState({ open: false, editing: null })}
        />
      )}
    </div>
  );
}
