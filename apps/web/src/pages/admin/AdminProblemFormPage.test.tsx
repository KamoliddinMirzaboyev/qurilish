import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import AdminProblemFormPage from "./AdminProblemFormPage";

describe("AdminProblemFormPage", () => {
  it("shows a validation error when the title is shorter than 10 characters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminProblemFormPage />);

    await user.type(screen.getByLabelText(/muammo sarlavhasi/i), "qisqa");
    await user.type(screen.getByLabelText(/muammo tavsifi/i), "x".repeat(60));
    await user.click(screen.getByRole("button", { name: /joylashtirish/i }));

    expect(await screen.findByText(/sarlavha kamida 10 ta belgidan iborat bo'lishi kerak/i)).toBeInTheDocument();
  });

  it("hides the budget amount field when Kelishilgan holda is selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminProblemFormPage />);

    expect(screen.getByLabelText(/budjet miqdori/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Kelishilgan holda"));

    expect(screen.queryByLabelText(/budjet miqdori/i)).not.toBeInTheDocument();
  });
});
