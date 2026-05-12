import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import GroundStations from "./GroundStations";
import * as client from "../api/client";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </BrowserRouter>
);

describe("GroundStations Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it("should fetch and display ground stations from API", async () => {
    vi.spyOn(client.api, "getGroundStations").mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            name: "GS-Real-Alpha",
            latitude: 40.7,
            longitude: -74.0,
            elevation_m: 10,
            capabilities: ["S-band", "X-band"],
            health_status: "nominal",
            is_active: true,
          },
        ],
        total: 1,
      },
    } as any);

    render(<Wrapper><GroundStations /></Wrapper>);

    await waitFor(() => {
      expect(screen.getByText("GS-Real-Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText("S-band")).toBeInTheDocument();
  });

  it("should open Add Station modal when button is clicked", async () => {
    vi.spyOn(client.api, "getGroundStations").mockResolvedValue({
      data: { data: [], total: 0 },
    } as any);

    render(<Wrapper><GroundStations /></Wrapper>);

    const addButton = screen.getByText("Add Station");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Add New Ground Station")).toBeInTheDocument();
    });
  });
});
