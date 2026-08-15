import { createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const TEST_USER = {
  email: "agent-m9ucul0wj5z6imhw@test.local",
  password: "xX5gxOty135PfjtsX-2MGDxVVdA_e11c",
  name: "Test Agent",
} as const;

export const seedTestUser = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async ctx => {
    try {
      await retrieveAccount(ctx, {
        provider: "test",
        account: { id: TEST_USER.email },
      });
      return { success: true, message: "Test user already exists" };
    } catch {
      // User doesn't exist, create them
    }

    try {
      // Pass the plaintext: createAccount hashes it via the "test" provider's
      // crypto (see testAuth.ts). Pre-hashing here double-hashes the secret,
      // leaving an account that retrieveAccount can never verify — sign-in
      // then dead-ends on "Account already exists".
      await createAccount(ctx, {
        provider: "test",
        account: {
          id: TEST_USER.email,
          secret: TEST_USER.password,
        },
        profile: {
          email: TEST_USER.email,
          name: TEST_USER.name,
          emailVerificationTime: Date.now(),
        },
        shouldLinkViaEmail: false,
      });
      return { success: true, message: "Test user created successfully" };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create test user: ${error}`,
      };
    }
  },
});
