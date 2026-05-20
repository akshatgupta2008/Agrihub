import { useRef, useState, useEffect } from "react";
import { MessageCircle, X, Send, Paperclip, Trash2, Loader } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useShallow } from "zustand/react/shallow";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Simple markdown-like formatter for bot responses
const formatMessage = (text) => {
  if (!text) return [];

  // Split into paragraphs by double newlines or single newlines followed by a marker
  const parts = [];
  const lines = text.split("\n");
  let currentBlock = [];

  const flushBlock = () => {
    if (currentBlock.length > 0) {
      parts.push({ type: "block", lines: currentBlock.join(" ") });
      currentBlock = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBlock();
      continue;
    }

    // Headers
    if (/^##?\s/.test(trimmed)) {
      flushBlock();
      parts.push({ type: "header", text: trimmed.replace(/^#+\s/, "") });
      continue;
    }

    // Bullet points
    if (/^[•\-*]\s/.test(trimmed)) {
      flushBlock();
      parts.push({ type: "bullet", text: trimmed.replace(/^[•\-*]\s/, "") });
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(trimmed)) {
      flushBlock();
      parts.push({ type: "numbered", text: trimmed.replace(/^\d+\.\s/, "") });
      continue;
    }

    currentBlock.push(trimmed);
  }
  flushBlock();

  return parts;
};

const MessageContent = ({ text }) => {
  const parts = formatMessage(text);

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "header") {
          return <p key={i} className="font-semibold text-sm mt-1">{part.text}</p>;
        }
        if (part.type === "bullet") {
          return (
            <p key={i} className="text-sm">
              <span className="text-[var(--color-primary)] font-bold mr-1">•</span>
              {renderInline(part.text)}
            </p>
          );
        }
        if (part.type === "numbered") {
          return <p key={i} className="text-sm pl-3">{part.text}</p>;
        }
        if (part.type === "block") {
          return (
            <p key={i} className="text-sm whitespace-pre-wrap">
              {renderInline(part.lines)}
            </p>
          );
        }
        return null;
      })}
    </>
  );
};

const renderInline = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const FilePreview = ({ file, onRemove }) => {
  const [dataUrl, setDataUrl] = useState(null);

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => setDataUrl(e.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative inline-block">
      {file.type.startsWith("image/") && dataUrl ? (
        <img src={dataUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border" />
      ) : (
        <div className="w-16 h-16 flex items-center justify-center rounded-lg border bg-gray-50 text-xs text-gray-600">
          PDF
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
        aria-label="Remove file"
      >
        <X size={10} />
      </button>
      <p className="text-xs text-gray-500 mt-1 truncate max-w-16">{file.name}</p>
    </div>
  );
};

export default function AgriChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { authUser } = useAuthStore(
    useShallow((s) => ({ authUser: s.authUser }))
  );

  const isFarmer = authUser?.role === "patient";
  const farmerName = authUser?.fullName?.split(" ")[0] || "there";

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "bot",
        text: `Hello ${farmerName}! I'm AgriHub Assistant. I can help with crop advice, soil checks, weather planning, nearby machine availability, and quick booking help. I'm an AI assistant, not a replacement for a field expert. How can I help you today?`
      }]);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    setError(null);
    setPendingFile(file);
    e.target.value = "";
  };

  const removeFile = () => {
    setPendingFile(null);
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && !pendingFile) return;

    const userMessage = { role: "user", text, file: pendingFile ? pendingFile.name : null };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPendingFile(null);
    setIsLoading(true);
    setError(null);

    try {
      let imageBase64 = null;
      if (pendingFile) {
        imageBase64 = await fileToBase64(pendingFile);
      }

      const apiBaseUrl = String(axiosInstance.defaults.baseURL || "http://localhost:5000/api").replace(/\/+$/, "");

      const response = await fetch(`${apiBaseUrl}/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, imageBase64 }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botText = "";

      const botMsgId = Date.now();
      setMessages((prev) => [...prev, { role: "bot", text: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        botText += chunk;
        setMessages((prev) =>
          prev.map((m, i) => (i === prev.length - 1 ? { ...m, text: botText } : m))
        );
        scrollToBottom();
      }
    } catch (err) {
      setError(err.message || "Failed to get response. Is Ollama running?");
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, text: "Sorry, I couldn't get a response. Please try again." } : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center transition-colors"
        aria-label={isOpen ? "Close AgriHub assistant" : "Open AgriHub assistant"}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--color-border)]"
          style={{ height: "550px", maxHeight: "calc(100vh - 8rem)" }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-semibold text-base">AgriHub Assistant</h3>
              <p className="text-xs text-white/80">AI farm assistant — not a replacement for professional field advice</p>
            </div>
            <button onClick={clearChat} className="text-white/80 hover:text-white" aria-label="Clear chat">
              <Trash2 size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--color-bg-main)]">
            {messages.length === 0 && (
              <div className="text-center text-[var(--color-text-muted)] text-sm mt-20">
                <p>Hello! I'm AgriHub Assistant, your farming helper.</p>
                <p className="mt-2">Ask me about crops, weather, soil, machinery, or lease booking.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[var(--color-secondary)] text-white rounded-br-md"
                      : "bg-white text-[var(--color-text-main)] border border-[var(--color-border)] rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.file && (
                    <p className="text-xs opacity-70 mb-1">📎 {msg.file}</p>
                  )}
                  <MessageContent text={msg.text} />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[var(--color-border)] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm">
                    <Loader size={14} className="animate-spin" />
                    AgriHub Assistant is thinking...
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 text-[var(--color-danger)] rounded-xl px-4 py-2 text-sm">
                  {error}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* File preview */}
          {pendingFile && (
            <div className="px-4 py-2 bg-[var(--color-primary-light)] border-t border-[var(--color-border)] flex items-center gap-3">
              <FilePreview file={pendingFile} onRemove={removeFile} />
              <span className="text-xs text-[var(--color-primary-dark)]">Ready to send with your message</span>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-[var(--color-border)] bg-white shrink-0">
            <div className="flex items-center gap-2">
              <label className="p-2 hover:bg-[var(--color-bg-main)] rounded-full cursor-pointer text-[var(--color-text-muted)] shrink-0" aria-label="Attach file">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Paperclip size={18} />
              </label>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about crops, weather, soil, machines, or bookings..."
                rows={1}
                className="flex-1 resize-none border border-[var(--color-border)] rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-white text-[var(--color-text-main)]"
                style={{ maxHeight: "100px" }}
              />

              <button
                onClick={sendMessage}
                disabled={isLoading || (!input.trim() && !pendingFile)}
                className="p-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:bg-gray-300 text-white rounded-full shrink-0 transition-colors"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}