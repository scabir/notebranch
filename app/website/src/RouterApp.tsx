import { useEffect, useState } from "react";
import App from "./App";
import {
  INTERNAL_NAVIGATION_EVENT,
  canonicalizePath
} from "./utils/routing";

const sectionByPath: Record<string, string> = {
  "/": "top",
  "/about/": "about",
  "/downloads/": "downloads",
  "/features/": "features",
  "/screenshots/": "screenshots",
  "/tutorials/": "tutorials",
  "/workflow/": "workflow"
};

const resolveSectionId = (pathname: string): string =>
  sectionByPath[canonicalizePath(pathname)] ?? "top";

export function RouterApp() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window === "undefined" ? "/" : window.location.pathname
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncPathname = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", syncPathname);
    window.addEventListener(INTERNAL_NAVIGATION_EVENT, syncPathname);

    return () => {
      window.removeEventListener("popstate", syncPathname);
      window.removeEventListener(INTERNAL_NAVIGATION_EVENT, syncPathname);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const sectionId = resolveSectionId(pathname);

    const animationFrameId = window.requestAnimationFrame(() => {
      if (sectionId === "top") {
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      const sectionElement = document.getElementById(sectionId);
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: "auto", block: "start" });
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [pathname]);

  return <App />;
}
