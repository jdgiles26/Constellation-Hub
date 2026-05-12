import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import OpsCoPilot from "./OpsCoPilot";
import * as client from "../api/client";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </BrowserRouter>
);

describe("OpsCoPilot Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should call analyze API and display results when button is clicked", async () => {
    const analyzeSpy = vi.spyOn(client.api, "analyzeEvents").mockResolvedValue({
      data: {
        summary: "Test summary from AI",
        key_findings: ["Finding 1", "Finding 2"],
        suggested_actions: [
          { id: "1", action: "Action 1", priority: "high", status: "pending" },
        ],
        risk_level: "low",
        confidence: 0.95,
      },
    } as any);

    render(<Wrapper><OpsCoPilot /></Wrapper>);

    const analyzeButton = screen.getByText("Analyze Events");
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText("Test summary from AI")).toBeInTheDocument();
    });
    expect(screen.getByText("Finding 1")).toBeInTheDocument();
    expect(screen.getByText("Action 1")).toBeInTheDocument();
  });
});
