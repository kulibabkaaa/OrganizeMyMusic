import { ConnectedLibrariesPage } from "@/components/app/library/connected-libraries-page";
import { getLibraryPageState } from "@/modules/library-syncs/library-page-state";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const state = await getLibraryPageState();

  return (
    <ConnectedLibrariesPage
      appleMusicConnection={state.appleMusicConnection}
      latestSync={state.latestSync}
      newMusicSummary={state.newMusicSummary}
    />
  );
}
