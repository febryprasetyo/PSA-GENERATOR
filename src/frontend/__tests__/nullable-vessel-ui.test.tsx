import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NullableMetric } from "@/frontend/components/ui/nullable-metric";

function renderMetric(value: number | null) {
  render(<NullableMetric value={value} suffix="MPa" />);
  return screen.getByText(/./);
}

describe("NullableMetric", () => {
  it("renders unavailable values as a dash", () => {
    expect(renderMetric(null)).toHaveTextContent("-");
  });

  it("renders zero as a real measurement", () => {
    expect(renderMetric(0)).toHaveTextContent("0.00 MPa");
  });

  it("rounds finite values to two digits", () => {
    expect(renderMetric(1.256)).toHaveTextContent("1.26 MPa");
  });
});
