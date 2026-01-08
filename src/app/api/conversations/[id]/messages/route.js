
import { prisma } from "../../../../../lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"

export async function GET(req, context) {
  const params = await context.params  // ✅ UNWRAP PARAMS
  const conversationId = params.id

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId: session.user.id,
    },
  })

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 })
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId, // ✅ now safe
    },
    orderBy: { createdAt: "asc" },
  })

  return Response.json(messages)
}


export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { role, content } = await req.json()
    if (!role || !content) {
      return Response.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Ensure conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 })
    }

    const message = await prisma.message.create({
      data: {
        conversationId: params.id,
        role,
        content,
      },
    })

    return Response.json(message)
  } catch (err) {
    console.error("🔥 CREATE MESSAGE ERROR:", err)
    return Response.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
