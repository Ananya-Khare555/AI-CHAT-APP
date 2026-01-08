"use client"

import { useEffect, useState, useRef } from "react"
import { lightTheme, darkTheme } from "../../lib/theme"

export default function ChatPage() {
  /* 🔹 Hooks (ALWAYS TOP) */
  const [mounted, setMounted] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [dark, setDark] = useState(false)

  /* 🔹 Mount guard */
  useEffect(() => {
    setMounted(true)
  }, [])

  /* 🔹 Load theme (client only) */
  useEffect(() => {
    const stored = localStorage.getItem("theme")
    setDark(stored === "dark")
  }, [])

  useEffect(() => {
    localStorage.setItem("theme", dark ? "dark" : "light")
  }, [dark])

  const theme = dark ? darkTheme : lightTheme

  /* 🔹 Load conversations (safe) */
  useEffect(() => {
    if (!mounted) return

    fetch("/api/conversations")
      .then(async r => {
        if (!r.ok) return []
        const data = await r.json()
        return Array.isArray(data) ? data : []
      })
      .then(setConversations)
      .catch(() => setConversations([]))
  }, [mounted])

  if (!mounted) return null

  /* ------------------ ACTIONS ------------------ */
  async function createConversation() {
    const session = await fetch("/api/auth/session").then(r => r.json())
    if (!session?.user?.id) {
      alert("Please login first")
      return
    }

    const conv = await fetch("/api/conversations", { method: "POST" })
      .then(r => r.json())

    setConversations(prev => [conv, ...prev])
    setActiveConv(conv)
  }

  async function deleteConversation(id) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" })
    setConversations(c => c.filter(x => x.id !== id))
    if (activeConv?.id === id) setActiveConv(null)
  }

  /* ------------------ UI ------------------ */
  return (
    <div style={{ ...styles.page, background: theme.bg, color: theme.text }}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, background: theme.panel, borderColor: theme.border }}>
        <div style={{ ...styles.sidebarHeader, borderColor: theme.border }}>
          💬 AI Chat
          <button onClick={() => setDark(d => !d)} style={styles.toggle}>
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        <button
          style={{ ...styles.newChatBtn, background: theme.userBubble }}
          onClick={createConversation}
        >
          + New Chat
        </button>

        <div style={styles.conversationList}>
          {Array.isArray(conversations) && conversations.map(c => (
            <div
              key={c.id}
              style={{
                ...styles.conversationItem,
                background:
                  activeConv?.id === c.id ? theme.sidebarActive : "transparent",
                color: theme.text
              }}
            >
              <span onClick={() => setActiveConv(c)}>
                {c.title || "New Conversation"}
              </span>
              <button
                onClick={() => deleteConversation(c.id)}
                style={styles.deleteBtn}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <main style={styles.chatArea}>
        {activeConv?.id ? (
          <ChatWindow
            conversation={activeConv}
            setConversations={setConversations}
            setActiveConv={setActiveConv}
            theme={theme}
          />
        ) : (
          <div style={styles.emptyState}>
            <h2>Welcome 👋</h2>
            <p>Create or select a conversation</p>
          </div>
        )}
      </main>
    </div>
  )
}

/* ------------------ CHAT WINDOW ------------------ */
function ChatWindow({ conversation, setConversations, setActiveConv, theme }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)

  /* 🔹 Load messages safely */
  useEffect(() => {
    if (!conversation?.id) return

    fetch(`/api/conversations/${conversation.id}/messages`)
      .then(async r => {
        if (!r.ok) return []
        const data = await r.json()
        return Array.isArray(data) ? data : []
      })
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [conversation?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage() {
    if (!input.trim()) return

    const userText = input
    setInput("")
    setStreaming(true)

   setMessages(m => [
  ...m,
  {
    id: crypto.randomUUID(), // 👈 FIX
    role: "USER",
    content: userText
  }
])


    /* 🔹 Title only once */
    if (!conversation.title) {
      const title = userText.slice(0, 30)
      setConversations(c =>
        c.map(x => x.id === conversation.id ? { ...x, title } : x)
      )
      setActiveConv(c => ({ ...c, title }))
      await fetch(`/api/conversations/${conversation.id}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      })
    }

    /* 🔹 Stream AI */
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversation.id,
        content: userText
      })
    })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let assistantText = ""

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      assistantText += decoder.decode(value)
      setMessages(m => [
        ...m.filter(x => x.id !== "streaming"),
        {
  id: "streaming", // single streaming bubble
  role: "STREAMING",
  content: assistantText
}

      ])
    }

    setMessages(m => [
  ...m.filter(x => x.id !== "streaming"),
  {
    id: crypto.randomUUID(),
    role: "ASSISTANT",
    content: assistantText
  }
])


    setStreaming(false)
  }

  return (
    <div style={styles.chatWindow}>
      <div style={styles.messages}>
        {Array.isArray(messages) && messages.map(m => {
          const isUser = m.role === "USER"
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: 12
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: isUser ? theme.userBubble : theme.aiBubble,
                  color: isUser ? "#fff" : theme.aiText,
                  whiteSpace: "pre-wrap"
                }}
              >
                {m.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ ...styles.inputBar, background: theme.panel, borderColor: theme.border }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Type a message…"
          disabled={streaming}
          style={{
            ...styles.input,
            background: theme.panel,
            color: theme.text,
            borderColor: theme.border
          }}
        />
        <button
          onClick={sendMessage}
          disabled={streaming}
          style={{ ...styles.sendBtn, background: theme.userBubble }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
const styles = {
  page: {
    display: "flex",
    height: "100vh",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  sidebar: {
    width: 300,
    borderRight: "1px solid",
    display: "flex",
    flexDirection: "column"
  },
  sidebarHeader: {
    padding: 16,
    fontWeight: 600,
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid"
  },
  toggle: {
    background: "transparent",
    border: "none",
    cursor: "pointer"
  },
  newChatBtn: {
    margin: 12,
    padding: 10,
    borderRadius: 10,
    color: "#fff",
    border: "none",
    cursor: "pointer"
  },
  conversationList: { flex: 1, overflowY: "auto" },
  conversationItem: {
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    cursor: "pointer"
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer"
  },
  chatArea: { flex: 1 },
  chatWindow: { display: "flex", flexDirection: "column", height: "100%" },
  messages: { flex: 1, padding: 24, overflowY: "auto" },
  inputBar: {
    display: "flex",
    padding: 16,
    borderTop: "1px solid"
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    border: "1px solid",
    outline: "none"
  },
  sendBtn: {
    marginLeft: 10,
    padding: "0 22px",
    borderRadius: 12,
    color: "#fff",
    border: "none",
    cursor: "pointer"
  },
  emptyState: {
    margin: "auto",
    textAlign: "center",
    opacity: 0.7
  }
}
