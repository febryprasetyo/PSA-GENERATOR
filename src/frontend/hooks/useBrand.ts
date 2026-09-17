"use client";

import { createContext, createElement, useContext, type ReactNode } from "react";
import type { BrandConfig } from "@/shared/config";

export type { BrandConfig } from "@/shared/config";

const BrandContext = createContext<BrandConfig | null>(null);

export function BrandProvider({ config, children }: { config: BrandConfig; children: ReactNode }) {
  return createElement(BrandContext.Provider, { value: config }, children);
}

export function useBrand(): BrandConfig {
  const config = useContext(BrandContext);
  if (!config) throw new Error("useBrand must be used within BrandProvider");
  return config;
}
