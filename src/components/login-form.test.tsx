// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";

vi.mock("@/app/auth/actions", () => ({
  signIn: vi.fn(async () => ({})),
  signUp: vi.fn(async () => ({})),
  signInWithGoogle: vi.fn(async () => {}),
  signInWithMicrosoft: vi.fn(async () => {}),
  requestPasswordReset: vi.fn(async () => ({})),
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

  it("switches to password-reset mode via 'Forgot password?'", () => {
    render(<LoginForm next="/dashboard/home" configured={true} />);
    fireEvent.click(screen.getByText(/Forgot password\?/i));
    // password field is hidden, the CTA becomes the reset action, and a way back appears
    expect(document.querySelector('input[type="password"]')).toBeNull();
    expect(screen.getByText("Send reset link")).toBeTruthy();
    expect(screen.getByText(/Back to sign in/i)).toBeTruthy();
  });
});
