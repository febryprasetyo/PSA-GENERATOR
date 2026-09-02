import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmModal } from "@/frontend/components/ui/confirm-modal";
import { FeedbackToast } from "@/frontend/components/ui/feedback-toast";

describe("application feedback UI", () => {
  it("renders a centered confirmation and invokes its destructive action", () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal open title="Hapus Area?" message="RS dan mesin tetap tersimpan tanpa Area." confirmLabel="Hapus Area" onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus Area" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("renders a dismissible in-app success message", () => {
    const onClose = vi.fn();
    render(<FeedbackToast message="5 mesin baru ditambahkan" tone="success" onClose={onClose} />);
    expect(screen.getByText("5 mesin baru ditambahkan")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /tutup notifikasi/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
