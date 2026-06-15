<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { addEntry as apiAdd, removeEntry as apiRemove } from "$lib/api";
  import AddNameForm from "$lib/components/AddNameForm.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import QueueList from "$lib/components/QueueList.svelte";
  import RecentActivity from "$lib/components/RecentActivity.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let confirmEntry = $state<{ id: string; displayName: string } | null>(null);
  let removeError = $state<string | null>(null);

  function requestRemove(id: string, displayName: string) {
    confirmEntry = { id, displayName };
    removeError = null;
  }

  async function doRemove() {
    if (!confirmEntry || !data.board) return;
    try {
      await apiRemove(data.board.board.publicSlug, confirmEntry.id);
      confirmEntry = null;
      await invalidateAll();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to remove.";
      removeError = isAuthError(msg)
        ? "Your session has expired. Scan the current on-site QR code to continue."
        : msg;
      confirmEntry = null;
    }
  }

  function cancelRemove() {
    confirmEntry = null;
  }

  async function handleAdd(displayName: string): Promise<string | null> {
    if (!data.board) return null;
    try {
      await apiAdd(data.board.board.publicSlug, displayName);
      await invalidateAll();
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add.";
      return isAuthError(msg)
        ? "Your session has expired. Scan the current on-site QR code to join."
        : msg;
    }
  }

  function isAuthError(msg: string): boolean {
    return msg.toLowerCase().includes("unauthorized");
  }
</script>

{#if !data.board}
  <div class="not-found-container">
    <div class="card">
      <h1 class="not-found-title">Board not found</h1>
      <p class="not-found-message">This board doesn't exist or may have been removed.</p>
    </div>
  </div>
{:else}
  {@const { board, venue, queue, mutationAccess } = data.board}
  <div class="page">
    <header class="header">
      <p class="venue-name">{venue.name}</p>
      <h1 class="board-name display-title">{board.name}</h1>
      <span class="status-badge status-{board.status}">
        {board.status === "open" ? "Open" : "Closed"}
      </span>
    </header>

    <main class="content">
      <section class="section blackboard">
        <div class="board-surface">
          <h2 class="section-title">Queue</h2>
          <QueueList entries={queue} canRemove={mutationAccess.canRemove} onRemoveRequest={requestRemove} />
          {#if removeError}
            <p class="error-msg">{removeError}</p>
          {/if}
        </div>
      </section>

      {#if mutationAccess.canAdd}
        <section class="section">
          <AddNameForm onAdd={handleAdd} />
        </section>
      {/if}

      <section class="section">
        <RecentActivity events={data.events} />
      </section>
    </main>
  </div>

  {#if confirmEntry}
    <ConfirmDialog
      message="Remove {confirmEntry.displayName} from the queue?"
      onConfirm={doRemove}
      onCancel={cancelRemove}
    />
  {/if}
{/if}

<style>
  /* .section, .section-title, .card (box), .status-open, .status-closed come
     from @queue-reminiscence/ui/components.css. Only layout-specific overrides
     and one-off colors remain scoped here. */
  .not-found-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
  }

  .card {
    max-width: 480px;
    width: 100%;
    text-align: center;
  }

  .not-found-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.75rem;
  }

  .not-found-message {
    color: var(--color-text-muted);
    font-size: 0.9375rem;
  }

  .page {
    max-width: 560px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .header {
    margin-bottom: 1.5rem;
  }

  .venue-name {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin-bottom: 0.25rem;
  }

  .board-name {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .status-badge {
    display: inline-block;
    padding: 0.125rem 0.625rem;
    border-radius: var(--radius-pill);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .error-msg {
    margin-top: 0.75rem;
    color: var(--color-danger);
    font-size: 0.875rem;
  }

  /* ── Blackboard treatment for the Queue panel ──────────────────────────
     A neutral charcoal slate inside a wooden frame, sitting within the
     surrounding neon theme. Child QueueList markup is reached via :global. */
  .section.blackboard {
    /* Slim dark-walnut frame: vertical grain over a muted dark wood gradient
       that sits with the surrounding neon-violet theme. */
    background:
      repeating-linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.16) 0,
        rgba(0, 0, 0, 0.16) 2px,
        rgba(255, 255, 255, 0.02) 2px,
        rgba(255, 255, 255, 0.02) 5px
      ),
      linear-gradient(150deg, #43301e 0%, #281a10 46%, #382617 72%, #1d120a 100%);
    border: none;
    border-radius: 6px;
    padding: 7px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      inset 0 -1px 2px rgba(0, 0, 0, 0.5),
      var(--shadow-md);
  }

  .board-surface {
    position: relative;
    border-radius: 4px;
    padding: 1.25rem 1.25rem 1rem;
    /* Neutral charcoal slate with soft chalk-smudge clouds */
    background:
      radial-gradient(ellipse at 30% 22%, rgba(255, 255, 255, 0.07), transparent 55%),
      radial-gradient(ellipse at 78% 82%, rgba(255, 255, 255, 0.05), transparent 50%),
      #26282b;
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.6),
      inset 0 0 55px rgba(0, 0, 0, 0.7);
  }

  /* Faint chalk-dust speckle */
  .board-surface::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 4px;
    background-image:
      radial-gradient(rgba(255, 255, 255, 0.05) 0.5px, transparent 0.5px),
      radial-gradient(rgba(255, 255, 255, 0.035) 0.5px, transparent 0.5px);
    background-size: 7px 7px, 11px 11px;
    background-position: 0 0, 3px 5px;
    opacity: 0.5;
  }

  .board-surface .section-title {
    font-family: var(--font-chalk);
    font-size: 1.625rem;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0.03em;
    color: #f1f3f0;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.35);
    border-bottom: 2px solid rgba(241, 243, 240, 0.28);
    padding-bottom: 0.4rem;
    margin-bottom: 1rem;
  }

  /* QueueList internals (scoped in the child component) */
  .board-surface :global(.entry) {
    background: rgba(255, 255, 255, 0.022);
    border: 1px dashed rgba(241, 243, 240, 0.2);
    border-radius: 3px;
  }

  .board-surface :global(.position) {
    font-family: var(--font-chalk);
    font-size: 1.35rem;
    color: #a9d4ff;
    text-shadow: 0 0 3px rgba(120, 180, 255, 0.3);
  }

  .board-surface :global(.name) {
    font-family: var(--font-chalk);
    font-size: 1.35rem;
    color: #f4f5f2;
    text-shadow: 0 0 2px rgba(255, 255, 255, 0.3);
  }

  .board-surface :global(.remove-btn) {
    font-family: var(--font-chalk);
    font-size: 1.0625rem;
    color: #ffc2d2;
    border: 1px dashed rgba(255, 138, 163, 0.55);
    background: none;
  }

  .board-surface :global(.remove-btn:hover) {
    background: rgba(255, 138, 163, 0.12);
  }

  .board-surface :global(.empty) {
    font-family: var(--font-chalk);
    font-size: 1.25rem;
    color: #d7dad6;
  }
</style>
