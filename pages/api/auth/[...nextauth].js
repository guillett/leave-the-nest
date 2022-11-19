import NextAuth from "next-auth"
import TwitterProvider from "next-auth/providers/twitter"

export const authOptions = {
  // Configure one or more authentication providers
	providers: [
		TwitterProvider({
			clientId: process.env.TWITTER_ID,
			clientSecret: process.env.TWITTER_SECRET,
			version: "2.0",
			profile(profile) {
				console.log('twitter profile', profile)
				return {
					id: profile.data.id,
					email: "@" + profile.data.username + "@twitter.com",
					userId: "@" + profile.data.username + "@twitter.com",
					name: profile.data.name,
					image: profile.data.profile_image_url,
				}
			}
		}),
		{
			id: "mastodon@mamot.fr",
			name: "Mastodon@mamot.fr",
			type: "oauth",
			authorization: {
				url: "https://mamot.fr/oauth/authorize",
				params: { scope: "read" },
			},
			token: "https://mamot.fr/oauth/token",
			userinfo: "https://mamot.fr/api/v1/accounts/verify_credentials",
			clientId: "zSy4UmoiCxGjonyOzqFS0OJBOCJuKPxzx5N3ZhrtFUs",
			clientSecret: "IVyxEvSzMaiBQ8WjoPxq5xPiWW7ECP33lcQI724l6xM",
			profile(profile) {
				console.log('mastodon profile', profile)
				return {
					id: profile.id,
					name: profile.display_name,
					username: profile.username,
					image: profile.avatar,
					email: '@' + profile.username + '@mamot.fr'
				}
			},
		}
	],
	callbacks: {
		signIn({ user, account, profile, email, credentials }) {
			console.log('signIn', { user, account, profile, email, credentials })
	      return true
	    },/*
	    session(params) {
	    	console.log('session params', params)
	    	return params.session
	    }//*/
	     session({session, token, user}) {
	    	console.log('session {session, token, user}', {session, token, user})
	    	return session
	    }//*/

	}
}

export default NextAuth(authOptions)
