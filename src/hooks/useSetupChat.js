import { useCallback, useState } from "react";

export function useSetupChat({ initialMessages = [] } = {}) {
  const [messages, setMessages] = useState(() => initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const appendAssistantMessage = useCallback((content, extra = {}) => {
    setMessages((prev) => [...prev, { role: "assistant", content, ...extra }]);
  }, []);

  const sendMessage = useCallback(async (content, context = {}) => {
    if (!content.trim()) return "";

    setError(null);
    let assistantText = "";

    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "", streaming: true },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/setup-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, context }),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader?.();
      if (!reader) throw new Error("응답 스트림을 읽을 수 없어요.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(chunk.slice(6));
            if (event.type === "delta" && event.content) {
              assistantText += event.content;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = {
                  ...last,
                  content: (last?.content ?? "") + event.content,
                };
                return next;
              });
            }

            if (event.type === "done") {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = { ...last, streaming: false };
                return next;
              });
            }

            if (event.type === "error") {
              throw new Error(event.message || "설정 도우미 연결에 실패했어요.");
            }
          } catch (err) {
            if (err instanceof SyntaxError) continue;
            throw err;
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.streaming) {
          next[next.length - 1] = { ...last, streaming: false };
        }
        return next;
      });

      return assistantText;
    } catch (err) {
      setError(err.message);
      setMessages((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.streaming) next.pop();
        return next;
      });
      return "";
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    appendAssistantMessage,
  };
}
