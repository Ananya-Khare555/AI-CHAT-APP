import { prisma } from "../../../../../lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params

  const { title } = await req.json()

  if (!title) {
    return new Response("Title required", { status: 400 })
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!conversation) {
    return new Response("Not found", { status: 404 })
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: { title }
  })

  return Response.json(updated)
}
