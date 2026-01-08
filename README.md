🔧 Local Setup
1️⃣ Clone Repository
git clone https://github.com/---------
cd ai-chat-app

2️⃣ Install Dependencies
npm install

3️⃣ Environment Variables

Create .env in the project root:

DATABASE_URL=postgresql://user:password@localhost:5432/ai_chat
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:3001
OPENAI_API_KEY=your_openai_key


⚠️ Do not commit .env.local

4️⃣ Setup Database
npx prisma migrate dev
npx prisma generate

5️⃣ Start Development Server
npm run dev