import type { MouseEvent } from "react";
import type { NavigationItem } from "../data/siteContent";
import brandIcon from "../assets/brand/NoteBranch.png";
import {
  INTERNAL_NAVIGATION_EVENT,
  canonicalizePath,
  normalizePath
} from "../utils/routing";

interface NavBarProps {
  productName: string;
  navItems: NavigationItem[];
}

const shouldHandleClientNavigation = (
  event: MouseEvent<HTMLAnchorElement>
): boolean =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.shiftKey;

const handleInternalLinkClick = (
  event: MouseEvent<HTMLAnchorElement>,
  href: string
) => {
  if (!href.startsWith("/") || typeof window === "undefined") {
    return;
  }

  if (!shouldHandleClientNavigation(event)) {
    return;
  }

  event.preventDefault();

  if (normalizePath(window.location.pathname) === normalizePath(href)) {
    return;
  }

  window.history.pushState({}, "", href);
  window.dispatchEvent(new Event(INTERNAL_NAVIGATION_EVENT));
};

export function NavBar({ productName, navItems }: NavBarProps) {
  const activePath = canonicalizePath(
    typeof window === "undefined" ? "/" : window.location.pathname
  );

  return (
    <header className="site-nav">
      <div className="container nav-inner">
        <a
          className="brand-link"
          href="/"
          onClick={(event) => handleInternalLinkClick(event, "/")}
        >
          <img
            className="brand-icon"
            src={brandIcon}
            alt=""
            aria-hidden="true"
            loading="eager"
          />
          <span>{productName}</span>
        </a>

        <nav className="nav-links" aria-label="Primary">
          {navItems.map((item) => {
            const isActive =
              item.href.startsWith("/") &&
              canonicalizePath(item.href) === activePath;

            return (
              <a
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                onClick={(event) => handleInternalLinkClick(event, item.href)}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
