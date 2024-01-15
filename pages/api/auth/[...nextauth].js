import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const YOUR_SPOTIFY_CLIENT_ID = "5a881e05966b46e6a834390e80c37713";
const YOUR_SPOTIFY_CLIENT_SECRET = "b7434e52d7914cc6ba2cefc7192a0707";

const REDIRECT_URI = "http://localhost:3000/api/auth/callback/spotify";
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "token";

const refreshAccessToken = async (token) => {
  try {
    const url =
      "https://accounts.spotify.com/api/token?" +
      new URLSearchParams({
        client_id: YOUR_SPOTIFY_CLIENT_ID,
        client_secret: YOUR_SPOTIFY_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token || token.refreshToken,
    };
  } catch (error) {
    console.error(error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
};

export default NextAuth({
  providers: [
    SpotifyProvider({
      clientId: YOUR_SPOTIFY_CLIENT_ID,
      clientSecret: YOUR_SPOTIFY_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      authorization: `${AUTH_ENDPOINT}?scope=user-read-email,playlist-read-private,user-read-email,streaming,user-read-private,user-library-read,user-library-modify,user-read-playback-state,user-modify-playback-state,user-read-recently-played,user-follow-read`,
      response_type: RESPONSE_TYPE,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account && token) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + account.expires_in * 1000,
          refreshToken: account.refresh_token,
          user: token.user,
        };
      }

      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user = token.user;
      session.accessToken = token.accessToken;
      session.error = token.error;

      return session;
    },
  },
});
