import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { ac, workspaceAccessRoles } from "@/lib/auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac,
      roles: workspaceAccessRoles,
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  organization,
} = authClient;
