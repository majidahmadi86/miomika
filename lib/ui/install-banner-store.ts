"use client";

import { create } from "zustand";

type InstallBannerStore = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
};

/** Shared visibility for /home bottom-region orchestration (whisper + companion offset). */
export const useInstallBannerStore = create<InstallBannerStore>((set) => ({
  visible: false,
  setVisible: (visible) => set({ visible }),
}));
