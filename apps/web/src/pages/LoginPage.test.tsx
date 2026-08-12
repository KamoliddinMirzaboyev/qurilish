import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import LoginPage from "./LoginPage";

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: null, isLoading: false, setUser: vi.fn(), refresh: vi.fn() }),
}));

describe("LoginPage", () => {
  it("shows a validation error when submitting an empty email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/^parol\b/i), "somepassword");
    await user.click(screen.getByRole("button", { name: /^kirish$/i }));

    expect(await screen.findByText(/email yoki loginingizni kiriting/i)).toBeInTheDocument();
  });
});
