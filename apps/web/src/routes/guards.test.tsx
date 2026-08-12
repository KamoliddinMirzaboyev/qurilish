import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireRole, RequireAuth } from "./guards";

const mockUseAuth = vi.fn();
vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderGuardedRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/forbidden" element={<div>Forbidden page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<RequireRole roles={["ADMIN"]} />}>
          <Route path="/admin" element={<div>Admin page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("route guards", () => {
  it("redirects a logged-in user with the wrong role to /forbidden", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", role: "USER", name: "Test", email: "t@t.local" },
      isLoading: false,
    });

    renderGuardedRoute();

    expect(screen.getByText("Forbidden page")).toBeInTheDocument();
    expect(screen.queryByText("Admin page")).not.toBeInTheDocument();
  });

  it("allows access when the role matches", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", role: "ADMIN", name: "Admin", email: "a@t.local" },
      isLoading: false,
    });

    renderGuardedRoute();

    expect(screen.getByText("Admin page")).toBeInTheDocument();
  });

  it("RequireAuth redirects unauthenticated users to /login", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });

    render(
      <MemoryRouter initialEntries={["/app/profile"]}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route element={<RequireAuth />}>
            <Route path="/app/profile" element={<div>Profile page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
