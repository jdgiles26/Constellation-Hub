import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Login from "./Login";
import * as client from "../api/client";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("Login Demo Auto-Submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should auto-submit login when a demo role button is clicked", async () => {
    const loginSpy = vi
      .spyOn(client.api, "login")
      .mockResolvedValue({ data: { access_token: "demo-token" } } as any);

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Login />
      </BrowserRouter>
    );

    // Click the Viewer demo button
    const viewerButton = screen.getByText("Viewer");
    fireEvent.click(viewerButton);

    // The login API should be called with the viewer credentials
    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledTimes(1);
    });

    const formData = loginSpy.mock.calls[0][0] as FormData;
    expect(formData.get("username")).toBe("demo_viewer");
    expect(formData.get("password")).toBe("viewer123");
  });

  it("should store token and navigate on successful demo login", async () => {
    vi.spyOn(client.api, "login").mockResolvedValue({
      data: { access_token: "demo-token" },
    } as any);

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Login />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Admin"));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("demo-token");
      expect(localStorage.getItem("user_role")).toBe("admin");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});
