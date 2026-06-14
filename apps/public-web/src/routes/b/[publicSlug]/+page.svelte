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
      <h1 class="board-name">{board.name}</h1>
      <span class="status-badge status-{board.status}">
        {board.status === "open" ? "Open" : "Closed"}
      </span>
    </header>

    <main class="content">
      <section class="section">
        <h2 class="section-title">Queue</h2>
        <QueueList entries={queue} canRemove={mutationAccess.canRemove} onRemoveRequest={requestRemove} />
        {#if removeError}
          <p class="error-msg">{removeError}</p>
        {/if}
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
  .not-found-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
  }

  .card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 2rem 1.5rem;
    max-width: 480px;
    width: 100%;
    text-align: center;
  }

  .not-found-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.75rem;
  }

  .not-found-message {
    color: #6b7280;
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
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .board-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.5rem;
  }

  .status-badge {
    display: inline-block;
    padding: 0.125rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-open {
    background: #d1fae5;
    color: #065f46;
  }

  .status-closed {
    background: #fee2e2;
    color: #991b1b;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .section {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.25rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }

  .error-msg {
    margin-top: 0.75rem;
    color: #dc2626;
    font-size: 0.875rem;
  }
</style>
