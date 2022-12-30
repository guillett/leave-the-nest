import NextAuth from "next-auth"
import TwitterProvider from "next-auth/providers/twitter"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"

import clientPromise from "../../../lib/mongodb.ts"

const mongoAdapter = MongoDBAdapter(clientPromise, {
  databaseName: "leave-the-nest",
})

export const authOptions = {
  adapter: mongoAdapter,
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_ID,
      clientSecret: process.env.TWITTER_SECRET,
      version: "2.0",
      profile(profile) {
        console.log("twitter profile", profile)
        return {
          email: profile.data.username + "@twitter",
          id: profile.data.id,
          image: profile.data.profile_image_url,
          name: profile.data.name,
        }
      },
    }),
    {
      id: "mastodon@mamot.fr",
      name: "Mastodon@mamot.fr",
      type: "oauth",
      authorization: {
        url: "https://mamot.fr/oauth/authorize",
        params: { scope: "follow read write" },
      },
      token: "https://mamot.fr/oauth/token",
      userinfo: "https://mamot.fr/api/v1/accounts/verify_credentials",
      clientId: process.env.MAMOT_ID,
      clientSecret: process.env.MAMOT_SECRET,
      profile(profile) {
        return {
          email: profile.username + "@mastodon@mamot.fr",
          id: profile.id,
          image: profile.avatar,
          username: profile.username,
        }
      },
    },
    {
      id: "mastodon@mapstodon.space",
      name: "Mastodon@mapstodon.space",
      type: "oauth",
      authorization: {
        url: "https://mapstodon.space/oauth/authorize",
        params: { scope: "follow read write" },
      },
      token: "https://mapstodon.space/oauth/token",
      userinfo: "https://mapstodon.space/api/v1/accounts/verify_credentials",
      clientId: process.env.MASTODON_SOCIAL_ID,
      clientSecret: process.env.MASTODON_SOCIAL_SECRET,
      profile(profile) {
        return {
          email: profile.username + "@mastodon@mapstodon.space",
          id: profile.id,
          image: profile.avatar,
          username: profile.username,
        }
      },
    },
  ],
  events: {
    async linkAccount({ user, account, profile }) {
      console.log("linkAccount", { user, account, profile })
      const accounts = {
        ...(user.accounts || {}),
        [account.provider]: {
          id: account.providerAccountId,
          profile,
        },
      }
      await mongoAdapter.updateUser({ id: user.id, accounts })
    },
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log(user)
      return true
    },
    async session({ session, token, user }) {
      console.log("session", { session, token, user })
      session.user = user
      return session
    },
  },
}

export default NextAuth(authOptions)
