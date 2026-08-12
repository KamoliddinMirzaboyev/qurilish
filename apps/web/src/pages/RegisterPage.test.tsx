import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import RegisterPage from "./RegisterPage";

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: null, isLoading: false, setUser: vi.fn(), refresh: vi.fn() }),
}));

describe("RegisterPage", () => {
  it("has no role selector — registration always creates a USER", () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /korxona/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ekspert/i })).not.toBeInTheDocument();
  });

  it("always shows specialization and organization fields", () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByLabelText(/mutaxassislik/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/OTM yoki tashkilot/i)).toBeInTheDocument();
    expect(screen.getByLabelText("F.I.Sh.", { exact: false })).toBeInTheDocument();
  });
});
