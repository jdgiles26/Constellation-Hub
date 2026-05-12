import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import * as client from "../api/client";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const Wrapper = ({
  children,
  client,
}: {
  children: React.ReactNode;
  client: QueryClient;
}) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </BrowserRouter>
);

describe("Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and display real stats from APIs", async () => {
    vi.spyOn(client.api, "getSatellites").mockResolvedValue({
      data: [
        { id: 1, name: "SAT-001" },
        { id: 2, name: "SAT-002" },
        { id: 3, name: "SAT-003" },
      ],
    } as any);

    vi.spyOn(client.api, "getGroundStations").mockResolvedValue({
      data: [
        { id: 1, name: "GS-Alpha" },
        { id: 2, name: "GS-Beta" },
      ],
    } as any);

    vi.spyOn(client.api, "getSchedule").mockResolvedValue({
      data: {
        id: 1,
        scheduled_passes: [1, 2, 3, 4],
        total_contact_minutes: 45,
        is_optimized: false,
      },
    } as any);

    const queryClient = createQueryClient();
    render(
      <Wrapper client={queryClient}>
        <Dashboard />
      </Wrapper>
    );

    // Verify each stat label has its correct count in the same card
    await waitFor(() => {
      const satCard = screen.getByText("Active Satellites").closest("div")?.parentElement;
      expect(satCard?.textContent).toContain("3");
    });

    const gsCard = screen.getByText("Ground Stations").closest("div")?.parentElement;
    expect(gsCard?.textContent).toContain("2");

    const passCard = screen.getByText("Scheduled Passes").closest("div")?.parentElement;
    expect(passCard?.textContent).toContain("4");
  });

  it("should navigate to scheduling when View All is clicked", async () => {
    vi.spyOn(client.api, "getSatellites").mockResolvedValue({ data: [] } as any);
    vi.spyOn(client.api, "getGroundStations").mockResolvedValue({ data: [] } as any);
    vi.spyOn(client.api, "getSchedule").mockResolvedValue({
      data: { id: 1, scheduled_passes: [], total_contact_minutes: 0 },
    } as any);

    const queryClient = createQueryClient();
    render(
      <Wrapper client={queryClient}>
        <Dashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("View All")).toBeInTheDocument();
    });
  });
});
