import { PageFrame } from "../components/PageFrame";
import {
  branding,
  heroActions,
  heroDownloadTargets,
  heroPreview,
  latestRelease
} from "../data/siteContent";
import { HeroSection } from "../sections/HeroSection";

export function DownloadsPage() {
  return (
    <PageFrame>
      <HeroSection
        productName={branding.productName}
        tagline={branding.tagline}
        summary={branding.summary}
        actions={heroActions}
        preview={heroPreview}
        releasePageUrl={latestRelease.pageUrl}
        releaseApiUrl={latestRelease.apiUrl}
        downloadTargets={heroDownloadTargets}
      />
    </PageFrame>
  );
}
