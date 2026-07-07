import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    signIn({ user }) {
      return user.email === "matteo.zoccolan.pn@gmail.com"
    },
    // Enforcement del middleware: senza sessione l'utente viene rediretto a
    // /login su ogni rotta del matcher (pagine + API). Senza questo callback
    // next-auth popolava solo il contesto e NON proteggeva nulla.
    authorized({ auth }) {
      return !!auth?.user
    },
  },
})
