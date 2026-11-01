import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

test("renders the OR Music home page", () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  expect(screen.getAllByText(/OR Music/i).length).toBeGreaterThan(0);
});

test("loads the account form on demand and keeps signup available", async () => {
  localStorage.setItem("hasSeenModal", "true");
  render(<MemoryRouter><App /></MemoryRouter>);
  expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Login" })[0]);
  expect(await screen.findByText("Welcome back")).toBeInTheDocument();
  expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Need an account? Create one" }));
  expect(await screen.findByText("Create your account")).toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toBeInTheDocument();
});
