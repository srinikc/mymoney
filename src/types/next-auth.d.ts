import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: number
      role?: string
      profileId?: number
      profileName?: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }

  interface User {
    profileId?: number
    profileName?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    profileId?: number
    profileName?: string
  }
}
