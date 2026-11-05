import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  restoreSession: vi.fn(),
  currentSession: vi.fn(),
  startLogin: vi.fn(),
  endLogout: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/appState", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/appState")>()),
  loadAppState: vi.fn(),
  loadCatalog: vi.fn(),
}));

import { currentSession, restoreSession } from "@/lib/auth";
import { loadAppState, loadCatalog } from "@/lib/appState";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { fakeAppState } from "@/test/helpers";

const restoreMock = restoreSession as unknown as ReturnType<typeof vi.fn>;
const sessionMock = currentSession as unknown as ReturnType<typeof vi.fn>;
const loadAppStateMock = loadAppState as unknown as ReturnType<typeof vi.fn>;
const loadCatalogMock = loadCatalog as unknown as ReturnType<typeof vi.fn>;

function Consumer() {
  const { state, reloadCatalog } = useAuth();
  return (
    <div>
      <p data-testid="count">{state?.catalog.items.length ?? -1}</p>
      <button onClick={() => void reloadCatalog()}>MuatUlang</button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  restoreMock.mockResolvedValue(true);
  sessionMock.mockReturnValue({ info: { isLoggedIn: true, webId: "https://alice.example/profile/card#me" } });
  loadAppStateMock.mockResolvedValue(fakeAppState({ officialRoot: "https://official.example/natfun/" }));
  loadCatalogMock.mockResolvedValue({
    "@context": {},
    "@type": "Collection",
    items: [{ id: "baru1", localName: "Entri Baru" }],
  });
});

describe("AuthContext.reloadCatalog (D6)", () => {
  it("memuat ulang katalog dari Official Pod dan memperbarui state", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    await userEvent.click(screen.getByRole("button", { name: "MuatUlang" }));
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
    expect(loadCatalogMock).toHaveBeenCalledWith("https://official.example/natfun/");
  });

  it("throttle: pemanggilan ulang < 30 detik tidak mem-fetch katalog", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    await userEvent.click(screen.getByRole("button", { name: "MuatUlang" }));
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("1"));
    const calls = loadCatalogMock.mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: "MuatUlang" }));
    expect(loadCatalogMock.mock.calls.length).toBe(calls);
  });
});