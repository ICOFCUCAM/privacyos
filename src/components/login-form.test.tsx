// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

vi.mock("@/app/auth/actions", () => ({
  signIn: vi.fn(async () => ({})),
  signUp: vi.fn(async () => ({})),
  signInWithGoogle: vi.fn(async () => {}),
  signInWithMicrosoft: vi.fn(async () => {}),
}));

import { LoginForm } from "@/components/login-form";

afterEach(cleanup);

describe("<LoginForm>", () => {
  it("shows the email/password form + OAuth when auth is configured", () => {
    render(<LoginForm next="/dashboard/home" configured={true} />);
    expect(screen.getByPlaceholderText(/you@/i)).toBeTruthy();
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
  });

  it("explains when auth is not configured", () => {
    render(<LoginForm next="/dashboard/home" configured={false} />);
    expect(screen.getByText(/isn.t configured/i)).toBeTruthy();
  });

  it("surfaces an OAuth error when present", () => {
    render(<LoginForm next="/dashboard/home" configured={true} oauthError="Could not start sign-in" />);
    expect(screen.getByText(/Could not start sign-in/i)).toBeTruthy();
  });
});
