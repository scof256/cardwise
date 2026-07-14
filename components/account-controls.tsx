"use client";

import Link from "next/link";
import {
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

type AccountControlsProps = {
  clerkEnabled: boolean;
  placement: "topbar" | "workspace" | "sidebar";
  workspaceName?: string;
};

export function AccountControls({ clerkEnabled, placement, workspaceName = "Personal workspace" }: AccountControlsProps) {
  if (!clerkEnabled) {
    return <SetupAccountControls placement={placement} workspaceName={workspaceName} />;
  }

  return <ClerkAccountControls placement={placement} workspaceName={workspaceName} />;
}

function ClerkAccountControls({ placement, workspaceName }: Pick<AccountControlsProps, "placement" | "workspaceName">) {
  const { user, isLoaded } = useUser();
  const displayName = user?.fullName || user?.firstName || "My account";
  const email = user?.primaryEmailAddress?.emailAddress || "Manage profile";

  if (placement === "topbar") {
    return (
      <div className="auth-controls auth-controls-topbar">
        <Show when="signed-out">
          <SignInButton mode="redirect">
            <button className="auth-sign-in" type="button">Sign in</button>
          </SignInButton>
          <SignUpButton mode="redirect">
            <button className="auth-sign-up" type="button">Create account</button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <span className="top-account-name">{displayName}</span>
          <UserButton appearance={{ elements: { avatarBox: "workspace-user-avatar" } }} />
        </Show>
      </div>
    );
  }

  if (placement === "workspace") {
    return (
      <section className="workspace-account-card" aria-label="Signed-in account">
        <Show when="signed-out">
          <span className="workspace-avatar" aria-hidden="true">PW</span>
          <span className="workspace-copy"><small>Personal account</small><strong>{workspaceName}</strong></span>
          <span className="workspace-status" aria-hidden="true" />
        </Show>
        <Show when="signed-in">
          <UserButton />
          <span className="workspace-copy">
            <small>{workspaceName}</small>
            <strong>{isLoaded ? displayName : "Loading account…"}</strong>
            <span>{email}</span>
          </span>
          <span className="workspace-status" aria-hidden="true" />
        </Show>
      </section>
    );
  }

  return (
    <div className="sidebar-account">
      <Show when="signed-out">
        <div className="sidebar-account-copy">
          <strong>Save your directory</strong>
          <small>Sign in to sync cards with your workspace.</small>
        </div>
        <div className="sidebar-auth-actions">
          <SignInButton mode="redirect">
            <button className="auth-sign-in" type="button">Sign in</button>
          </SignInButton>
          <SignUpButton mode="redirect">
            <button className="auth-sign-up" type="button">Create account</button>
          </SignUpButton>
        </div>
      </Show>
      <Show when="signed-in">
        <SignOutButton redirectUrl="/">
          <button className="sidebar-sign-out" type="button"><span aria-hidden="true">↪</span>Log out</button>
        </SignOutButton>
      </Show>
    </div>
  );
}

function SetupAccountControls({ placement, workspaceName }: Pick<AccountControlsProps, "placement" | "workspaceName">) {
  if (placement === "workspace") {
    return (
      <section className="workspace-account-card" aria-label="Personal account">
        <span className="workspace-avatar" aria-hidden="true">PW</span>
        <span className="workspace-copy"><small>Personal account</small><strong>{workspaceName}</strong></span>
        <span className="workspace-status" aria-hidden="true" />
      </section>
    );
  }

  if (placement === "sidebar") {
    return (
      <div className="sidebar-account">
        <div className="sidebar-account-copy">
          <strong>Account setup required</strong>
          <small>Add Clerk keys to enable secure accounts.</small>
        </div>
        <div className="sidebar-auth-actions">
          <Link className="auth-sign-in" href="/sign-in">Sign in</Link>
          <Link className="auth-sign-up" href="/sign-up">Create account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-controls auth-controls-topbar">
      <Link className="auth-sign-in" href="/sign-in">Sign in</Link>
      <Link className="auth-sign-up" href="/sign-up">Create account</Link>
    </div>
  );
}
