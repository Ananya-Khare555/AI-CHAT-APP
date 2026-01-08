import { openai } from "../../../lib/openai"
import { prisma } from "../../../lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId, content } = await req.json()
    if (!conversationId || !content) {
      return Response.json(
        { error: "conversationId and content required" },
        { status: 400 }
      )
    }

    // 🔒 Ensure ownership
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
    })
    if (!conv) {
      return Response.json({ error: "Conversation not found" }, { status: 404 })
    }

    // 💾 Save USER message
    await prisma.message.create({
      data: {
        conversationId,
        role: "USER",
        content,
      },
    })

    // 📜 Fetch context
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 30,
    })

    const messages = history.map(m => ({
      role: m.role.toLowerCase(),
      content: m.content,
    }))

    // 🚀 OpenAI streaming
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
    })

    let assistantText = ""

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content
            if (token) {
              assistantText += token
              controller.enqueue(encoder.encode(token))
            }
          }

          // 💾 Save ASSISTANT message
          await prisma.message.create({
            data: {
              conversationId,
              role: "ASSISTANT",
              content: assistantText || "(empty response)",
            },
          })

          controller.close()
        } catch (err) {
          console.error("🔥 STREAM ERROR:", err)
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    })
  } catch (err) {
    console.error("🔥 /api/chat error:", err)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
