"use client"

import { useSession, signIn, signOut } from "next-auth/react"

export default function Home() {
  const { data: session } = useSession()

  if (!session) {
    return (
      <div className="p-4">
        <h1>Welcome to AI Chat App</h1>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => signIn("github")}
        >
          Login with GitHub
        </button>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1>Signed in as {session.user.name}</h1>
      <button
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
        onClick={() => signOut()}
      >
        Logout
      </button>
    </div>
  )
}
