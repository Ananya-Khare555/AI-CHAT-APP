import { prisma } from "../../../../lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params

  // 🔒 Ensure user owns the conversation
  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!conversation) {
    return new Response("Not found", { status: 404 })
  }

  // 🧨 Delete conversation (messages auto-delete)
  await prisma.conversation.delete({
    where: { id }
  })

  return Response.json({ success: true })
}
