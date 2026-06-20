import { useState, useRef, useEffect } from "react";
import { useWeatherChat } from "./hooks/useWeatherChat";
import "./WeatherAssistant.css";

const SUGGESTIONS = [
  "What's the weather in Seoul?",
  "Compare Tokyo and London",
  "Is it sunny in Paris?",
];

function Message({ role, content, streaming }) {
  return (
    <div className={`message message--${role}`} data-testid={`message-${role}`}>
      <span className="message__avatar" aria-hidden="true">
        {role === "user" ? "👤" : "🤖"}
      </span>
      <div className="message__bubble">
        <span className="message__text">{content}</span>
        {streaming && (
          <span className="message__cursor" aria-hidden="true">
            ▌
          </span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { messages, isLoading, error, sendMessage } = useWeatherChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed);
  };

  return (
    <div className="chat-app">
      <header className="chat-header">
        <span className="chat-header__icon" aria-hidden="true">
          🌤️
        </span>
        <div>
          <h1 className="chat-header__title">Weather Assistant</h1>
          <p className="chat-header__sub">powered by GitHub Copilot SDK</p>
        </div>
      </header>

      <main className="chat-body">
        {messages.length === 0 ? (
          <div className="chat-welcome" data-testid="welcome">
            <p>Ask me about the weather in any city!</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="suggestion-btn"
                  type="button"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-messages" data-testid="messages">
            {messages.map((msg, i) => (
              <Message key={i} {...msg} />
            ))}
          </div>
        )}

        {error && (
          <div className="chat-error" role="alert" data-testid="error">
            ⚠️ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="chat-footer">
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            className="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the weather…"
            disabled={isLoading}
            autoFocus
            aria-label="Chat input"
          />
          <button
            className="chat-send"
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            {isLoading ? "⏳" : "↑"}
          </button>
        </form>
      </footer>
    </div>
  );
}
