import { redirect } from "next/navigation";

import { LoginClient } from "@/app/login/login-client";
import { countUsers, getAdminUser } from "@/lib/db";
import { isDevMode } from "@/lib/env";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const needsSetup = countUsers() === 0;
  const devMode = isDevMode();
  const adminExists = getAdminUser() !== undefined;
  const showDevLogin = devMode && adminExists && !needsSetup;

  return (
    <LoginClient needsSetup={needsSetup} showDevLogin={showDevLogin} />
  );
}
