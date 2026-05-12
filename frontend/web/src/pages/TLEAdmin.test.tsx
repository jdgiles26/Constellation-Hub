import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import TLEAdmin from "./TLEAdmin";
import { coreOrbitsClient } from "../api/client";

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

describe("TLEAdmin Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and display TLE status and satellites", async () => {
    vi.spyOn(coreOrbitsClient, "get").mockImplementation((url: string) => {
      if (url === "/tle/status") {
        return Promise.resolve({
          data: {
            satellite_count: 42,
            last_refresh: "2024-01-15T10:30:00Z",
            refresh_interval_hours: 12,
          },
        } as any);
      }
      if (url === "/tle/satellites?limit=20") {
        return Promise.resolve({
          data: [
            {
              name: "ISS",
              norad_id: "25544",
              source: "CelesTrak",
              epoch: "2024-01-15T00:00:00Z",
              fetched_at: "2024-01-15T10:00:00Z",
            },
          ],
        } as any);
      }
      return Promise.resolve({ data: [] } as any);
    });

    const queryClient = createQueryClient();
    render(
      <Wrapper client={queryClient}>
        <TLEAdmin />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Last Refresh card shows the date
    expect(screen.getByText("Last Refresh").closest("div")?.parentElement?.textContent).toContain("2024");
    expect(screen.getByText("12 hours")).toBeInTheDocument();
    expect(screen.getByText("ISS")).toBeInTheDocument();
    expect(screen.getByText("25544")).toBeInTheDocument();
  });

  it("should call refresh API when Refresh Now is clicked", async () => {
    const postSpy = vi
      .spyOn(coreOrbitsClient, "post")
      .mockResolvedValue({
        data: { satellites_fetched: 15, satellites_stored: 15 },
      } as any);

    vi.spyOn(coreOrbitsClient, "get").mockImplementation((url: string) => {
      if (url === "/tle/status") {
        return Promise.resolve({
          data: {
            satellite_count: 0,
            last_refresh: null,
            refresh_interval_hours: 6,
          },
        } as any);
      }
      if (url === "/tle/satellites?limit=20") {
        return Promise.resolve({ data: [] } as any);
      }
      return Promise.resolve({ data: [] } as any);
    });

    const queryClient = createQueryClient();
    render(
      <Wrapper client={queryClient}>
        <TLEAdmin />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Refresh Now")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Refresh Now"));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith("/tle/refresh", {
        catalogs: ["active"],
      });
    });
  });
});
