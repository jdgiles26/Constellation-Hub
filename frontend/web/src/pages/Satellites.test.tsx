import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import Satellites from "./Satellites";
import * as client from "../api/client";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </BrowserRouter>
);

describe("Satellites Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should fetch and display satellites from API", async () => {
    vi.spyOn(client.api, "getSatellites").mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            name: "SAT-REAL-01",
            norad_id: "12345",
            constellation_id: 1,
            health_status: "healthy",
            tle_data: null,
            metadata: {},
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
      },
    } as any);

    render(<Wrapper><Satellites /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText("SAT-REAL-01")).toBeInTheDocument();
    });
    expect(screen.getByText("12345")).toBeInTheDocument();
  });

  it("should open Add Satellite modal when button is clicked", async () => {
    vi.spyOn(client.api, "getSatellites").mockResolvedValue({
      data: { data: [], total: 0 },
    } as any);

    render(<Wrapper><Satellites /></Wrapper>);

    const addButton = screen.getByText("Add Satellite");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Add New Satellite")).toBeInTheDocument();
    });
  });

  it("should filter satellites based on search input", async () => {
    vi.spyOn(client.api, "getSatellites").mockResolvedValue({
      data: {
        data: [
          { id: 1, name: "AlphaSat", norad_id: "11111", constellation_id: 1, health_status: "healthy", tle_data: null, metadata: {}, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
          { id: 2, name: "BetaSat", norad_id: "22222", constellation_id: 1, health_status: "healthy", tle_data: null, metadata: {}, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
        ],
        total: 2,
      },
    } as any);

    render(<Wrapper><Satellites /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText("AlphaSat")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search satellites...");
    fireEvent.change(searchInput, { target: { value: "beta" } });

    await waitFor(() => {
      expect(screen.queryByText("AlphaSat")).not.toBeInTheDocument();
      expect(screen.getByText("BetaSat")).toBeInTheDocument();
    });
  });
});
