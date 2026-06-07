"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLang } from "@/app/providers";

/**
 * PWA install support.
 *
 * Browsers that implement the `beforeinstallprompt` event (Chrome / Edge /
 * Samsung Internet on Android, Chrome / Edge on desktop) let us defer the
 * native install prompt until the user clicks a CTA — that's `canInstall`.
 *
 * iOS Safari does NOT fire `beforeinstallprompt`. The only path is the
 * user picking "Add to Home Screen" from the share sheet manually, so we
 * detect iOS and surface step-by-step instructions instead.
 *
 * Already-installed devices report `display-mode: standalone` (or, on iOS,
 * `navigator.standalone === true`) — we hide the entire UI in that case.
 */

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallCtx = {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  showIOSHelp: () => void;
};

const Ctx = createContext<InstallCtx | null>(null);

const DISMISS_KEY = "pwa-install-dismissed";
const IOS_DISMISS_KEY = "pwa-ios-dismissed";

export function InstallProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const { t } = useLang();

  // Environment detection — runs once on mount.
  useEffect(() => {
    const ua = navigator.userAgent || "";
    // Skip non-Safari iOS browsers (Chrome/Edge for iOS use WebKit but DO
    // fire beforeinstallprompt because they're WebKit-restricted shells —
    // wait, they don't either. Treat any iOS device as "iOS Safari" path.)
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari uses a legacy property; cast through `unknown` to avoid `any`.
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsIOS(ios);
    setIsStandalone(standalone);

    // iOS auto-show: no beforeinstallprompt is ever fired, so we surface the
    // step-by-step guide on the first visit (per device) unless the user has
    // dismissed it before.
    if (ios && !standalone) {
      try {
        if (!localStorage.getItem(IOS_DISMISS_KEY)) setIosHelp(true);
      } catch {
        setIosHelp(true);
      }
    }
  }, []);

  // Capture the install prompt and decide whether to surface the banner now.
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      try {
        if (!localStorage.getItem(DISMISS_KEY)) setShowBanner(true);
      } catch {
        setShowBanner(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      setDeferred(null);
      setShowBanner(false);
    };
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      setShowBanner(false);
      if (outcome === "accepted") {
        try {
          localStorage.removeItem(DISMISS_KEY);
        } catch {}
      }
      return outcome;
    }
    if (isIOS && !isStandalone) {
      setIosHelp(true);
      return "unavailable" as const;
    }
    return "unavailable" as const;
  }, [deferred, isIOS, isStandalone]);

  const showIOSHelp = useCallback(() => setIosHelp(true), []);

  const dismiss = useCallback(() => {
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }, []);

  const value = useMemo<InstallCtx>(
    () => ({
      // Manual CTA can be exposed for both: native prompt + iOS instructions.
      canInstall: Boolean(deferred) || (isIOS && !isStandalone),
      isIOS,
      isStandalone,
      promptInstall,
      showIOSHelp,
    }),
    [deferred, isIOS, isStandalone, promptInstall, showIOSHelp]
  );

  // Hide everything when already installed.
  const showBannerNow = showBanner && !isStandalone && Boolean(deferred);

  return (
    <Ctx.Provider value={value}>
      {children}
      {showBannerNow && (
        <InstallBanner
          onInstall={async () => {
            await promptInstall();
          }}
          onDismiss={dismiss}
          title={t("installAppTitle")}
          installLabel={t("installNow")}
          laterLabel={t("installLater")}
        />
      )}
      {iosHelp && !isStandalone && (
        <IOSHelpModal
          onClose={() => {
            setIosHelp(false);
            try {
              localStorage.setItem(IOS_DISMISS_KEY, String(Date.now()));
            } catch {}
          }}
          title={t("installIosTitle")}
          step1={t("installIosStep1")}
          step2={t("installIosStep2")}
          step3={t("installIosStep3")}
          footer={t("installIosFooter")}
          closeLabel={t("close")}
        />
      )}
    </Ctx.Provider>
  );
}

export function useInstallPrompt(): InstallCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Used outside the provider — graceful no-op rather than a render-time crash.
    return {
      canInstall: false,
      isIOS: false,
      isStandalone: false,
      promptInstall: async () => "unavailable" as const,
      showIOSHelp: () => undefined,
    };
  }
  return ctx;
}

function InstallBanner({
  onInstall,
  onDismiss,
  title,
  installLabel,
  laterLabel,
}: {
  onInstall: () => void;
  onDismiss: () => void;
  title: string;
  installLabel: string;
  laterLabel: string;
}) {
  return (
    <div
      className="fixed left-0 right-0 z-[65] flex justify-center px-3 pointer-events-none"
      style={{ bottom: "calc(16px + env(safe-area-inset-bottom))" }}
      role="dialog"
      aria-label={title}
    >
      <div
        className="pointer-events-auto w-full max-w-[640px] flex items-center gap-3 p-3 sm:p-4 rounded-xl shadow-xl"
        style={{ background: "#1B3A6B", color: "#fff" }}
      >
        <div
          className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-2xl"
          style={{ background: "rgba(255,255,255,0.10)" }}
          aria-hidden
        >
          🏠
        </div>
        <div className="flex-1 min-w-0 text-sm sm:text-base font-semibold leading-snug">
          {title}
        </div>
        <button
          type="button"
          onClick={onInstall}
          className="shrink-0 font-semibold rounded-md whitespace-nowrap"
          style={{
            background: "#C9A84C",
            color: "#1A1A1A",
            padding: "10px 14px",
            minHeight: 44,
          }}
        >
          {installLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={laterLabel}
          className="shrink-0 rounded-md text-xl"
          style={{ width: 40, height: 40, color: "rgba(255,255,255,0.85)" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function IOSHelpModal({
  onClose,
  title,
  step1,
  step2,
  step3,
  footer,
  closeLabel,
}: {
  onClose: () => void;
  title: string;
  step1: string;
  step2: string;
  step3: string;
  footer: string;
  closeLabel: string;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[81] w-[92vw] max-w-[440px] rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--card)",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-5" style={{ background: "#1B3A6B", color: "#fff" }}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏠</span>
            <h2 className="text-lg font-bold">{title}</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <Step n={1} icon="📤" text={step1} />
          <Step n={2} icon="➕" text={step2} />
          <Step n={3} icon="✅" text={step3} />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {footer}
          </p>
          <button type="button" className="ps-btn-primary w-full" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </>
  );
}

function Step({ n, icon, text }: { n: number; icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
        style={{ background: "#C9A84C", color: "#1A1A1A" }}
      >
        {n}
      </div>
      <div className="flex-1 text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
        <span className="mr-1.5" aria-hidden>
          {icon}
        </span>
        {text}
      </div>
    </div>
  );
}
