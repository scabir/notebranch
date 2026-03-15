import { useEffect, useState, type ComponentType } from "react";
import App from "./App";
import { AboutPage } from "./pages/AboutPage";
import { DownloadsPage } from "./pages/DownloadsPage";
import { FeaturesPage } from "./pages/FeaturesPage";
import { ScreenshotsPage } from "./pages/ScreenshotsPage";
import { TutorialsPage } from "./pages/TutorialsPage";
import { WorkflowPage } from "./pages/WorkflowPage";
import { INTERNAL_NAVIGATION_EVENT, normalizePath } from "./utils/routing";

const routeMap: Record<string, ComponentType> = {
  "/": App,
  "/about/": AboutPage,
  "/downloads/": DownloadsPage,
  "/features/": FeaturesPage,
  "/screenshots/": ScreenshotsPage,
  "/tutorials/": TutorialsPage,
  "/workflow/": WorkflowPage
};

const resolveRoute = (pathname: string): ComponentType =>
  routeMap[normalizePath(pathname)] ?? App;

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

  const ActivePage = resolveRoute(pathname);

  return <ActivePage />;
}
