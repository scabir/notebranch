export const INTERNAL_NAVIGATION_EVENT = "notebranch:navigate";

export const normalizePath = (value: string): string => {
  const withoutIndex = value.replace(/\/index\.html$/, "/");
  const withLeading = withoutIndex.startsWith("/")
    ? withoutIndex
    : `/${withoutIndex}`;
  const collapsed = withLeading.replace(/\/{2,}/g, "/");

  if (collapsed === "/") {
    return "/";
  }

  return collapsed.endsWith("/") ? collapsed : `${collapsed}/`;
};
