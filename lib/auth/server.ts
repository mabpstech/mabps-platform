import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { ac, workspaceAccessRoles } from "@/lib/auth/permissions";
import { sqlite } from "@/lib/db";
import {
  sendOrganizationInvitationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "@/lib/email";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleEnabled = Boolean(googleClientId && googleClientSecret);

/**
 * Account linking policy: Google is a trusted provider. When a Google profile
 * email matches an existing verified credential account, Better Auth may link
 * them instead of creating a duplicate user.
 */
export const auth = betterAuth({
  appName: "MABPS",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: sqlite,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        url,
      });
    },
    afterEmailVerification: async (user) => {
      const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      await sendWelcomeEmail({
        email: user.email,
        name: user.name,
        dashboardUrl: `${baseUrl}/dashboard`,
      });
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: googleClientId as string,
          clientSecret: googleClientSecret as string,
          prompt: "select_account",
        },
      }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: googleEnabled ? ["google"] : [],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [
    organization({
      ac,
      roles: workspaceAccessRoles,
      allowUserToCreateOrganization: true,
      organizationLimit: 50,
      membershipLimit: 100,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7,
      async sendInvitationEmail(data) {
        const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
        const inviteLink = `${baseUrl}/accept-invite?invitationId=${data.id}`;
        await sendOrganizationInvitationEmail({
          email: data.email,
          invitedByUsername: data.inviter.user.name,
          invitedByEmail: data.inviter.user.email,
          workspaceName: data.organization.name,
          inviteLink,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export const isGoogleAuthEnabled = googleEnabled;
