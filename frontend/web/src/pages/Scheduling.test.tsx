import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import Scheduling from "./Scheduling";
import * as client from "../api/client";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </BrowserRouter>
);

describe("Scheduling Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should fetch and display schedule stats from API", async () => {
    vi.spyOn(client.api, "getSchedule").mockResolvedValue({
      data: {
        id: 1,
        name: "Test Schedule",
        total_contact_minutes: 120,
        is_optimized: true,
        scheduled_passes: [1, 2, 3],
      },
    } as any);

    vi.spyOn(client.api, "getPasses").mockResolvedValue({
      data: {
        data: [
          { id: 1, satellite_id: 1, station_id: 1, aos: "2024-01-01T10:00:00Z", los: "2024-01-01T10:15:00Z", duration_seconds: 900, is_scheduled: true },
          { id: 2, satellite_id: 2, station_id: 1, aos: "2024-01-01T11:00:00Z", los: "2024-01-01T11:10:00Z", duration_seconds: 600, is_scheduled: true },
          { id: 3, satellite_id: 1, station_id: 2, aos: "2024-01-01T12:00:00Z", los: "2024-01-01T12:20:00Z", duration_seconds: 1200, is_scheduled: false },
        ],
        total: 3,
      },
    } as any);

    render(<Wrapper><Scheduling /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText("120")).toBeInTheDocument();
    });
  });

  it("should open Generate Schedule modal when button is clicked", async () => {
    vi.spyOn(client.api, "getSchedule").mockResolvedValue({ data: null } as any);
    vi.spyOn(client.api, "getPasses").mockResolvedValue({ data: { data: [], total: 0 } } as any);

    render(<Wrapper><Scheduling /></Wrapper>);

    const generateButton = screen.getByText("Generate Schedule");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText("Generate New Schedule")).toBeInTheDocument();
    });
  });
});
