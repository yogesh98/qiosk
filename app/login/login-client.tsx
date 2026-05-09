"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createAdminAction,
  devLoginAsAdminAction,
  loginAction,
  type ActionState,
} from "@/app/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function SetupAdminForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    createAdminAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error ? <ErrorAlert message={state.error} /> : null}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="setup-username">Username</FieldLabel>
          <Input
            id="setup-username"
            name="username"
            autoComplete="username"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="setup-password">Password</FieldLabel>
          <Input
            id="setup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <SubmitButton
          label="Create administrator"
          pendingLabel="Creating…"
        />
      </div>
    </form>
  );
}

function SignInForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error ? <ErrorAlert message={state.error} /> : null}
      <FieldGroup>
        <Field data-invalid={state?.error ? true : undefined}>
          <FieldLabel htmlFor="login-username">Username</FieldLabel>
          <Input
            id="login-username"
            name="username"
            autoComplete="username"
            required
            aria-invalid={state?.error ? true : undefined}
          />
        </Field>
        <Field data-invalid={state?.error ? true : undefined}>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={state?.error ? true : undefined}
          />
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <SubmitButton label="Sign in" pendingLabel="Signing in…" />
      </div>
    </form>
  );
}

function DevLoginForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    devLoginAsAdminAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      {state?.error ? <ErrorAlert message={state.error} /> : null}
      <Button type="submit" variant="outline" className="w-full">
        Dev: sign in as admin
      </Button>
    </form>
  );
}

type LoginClientProps = {
  needsSetup: boolean;
  showDevLogin: boolean;
};

export function LoginClient({ needsSetup, showDevLogin }: LoginClientProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {needsSetup ? "Create administrator" : "Sign in"}
          </CardTitle>
          <CardDescription>
            {needsSetup
              ? "No users exist yet. Create the first admin account to continue."
              : "Enter your username and password to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {needsSetup ? <SetupAdminForm /> : <SignInForm />}
          {!needsSetup && showDevLogin ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Development shortcut (dev_mode is enabled).
              </p>
              <DevLoginForm />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
