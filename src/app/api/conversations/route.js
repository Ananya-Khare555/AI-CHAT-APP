import { prisma } from "../../../lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 🔒 Ensure userId exists
    const userId = session.user.id
    if (!userId) {
      return Response.json(
        { error: "Session user id missing" },
        { status: 400 }
      )
    }

    const conversation = await prisma.conversation.create({
      data: { userId },
    })

    return Response.json(conversation)
  } catch (err) {
    console.error("🔥 CREATE CONVERSATION ERROR:", err)
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
      id: true,
      title: true,        // 🔥 REQUIRED
      createdAt: true,
      userId: true
    }
    })

    return Response.json(conversations)
  } catch (err) {
    console.error("🔥 LIST CONVERSATIONS ERROR:", err)
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
