import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportModal } from "@/frontend/components/modals/export-modal";

describe("Vessel export preview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Vessel zero and unavailable values without conflating them", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/machines") {
        return { ok: true, json: async () => ({ machines: [] }) } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          total: 1,
          entries: [{
            id: "r-1",
            stationId: "SN1",
            stationName: "RS Test",
            timestamp: "03/09/2026",
            oxygenPurity: 95,
            tankPressure: 5,
            vessel1: 0,
            vessel2: null,
            centralFlow: 1,
            boosterFlow: 2,
            totalFlow: 3,
            runningTime: 4,
            status: "online",
          }],
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ExportModal isOpen onClose={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: /Tampilkan Pratinjau Data/i }));

    const table = await screen.findByRole("table");
    await waitFor(() => expect(within(table).getByText("0.00 MPa")).toBeInTheDocument());
    expect(within(table).getByText("Vessel 1 (MPa)")).toBeInTheDocument();
    expect(within(table).getByText("Vessel 2 (MPa)")).toBeInTheDocument();
    expect(within(table).getByText("-")).toBeInTheDocument();
  });
});
