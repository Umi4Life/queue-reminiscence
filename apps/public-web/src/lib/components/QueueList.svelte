<script lang="ts">
  import type { QueueEntry } from "$lib/api";

  let {
    entries,
    canRemove,
    onRemoveRequest,
  }: {
    entries: QueueEntry[];
    canRemove: boolean;
    onRemoveRequest: (id: string, displayName: string) => void;
  } = $props();
</script>

{#if entries.length === 0}
  <div class="empty">
    <p>No one is waiting yet.</p>
    <p>Be the first to join the queue.</p>
  </div>
{:else}
  <ol class="list">
    {#each entries as entry (entry.id)}
      <li class="entry">
        <span class="position">{entry.position}</span>
        <span class="name">{entry.displayName}</span>
        {#if canRemove}
          <button
            class="remove-btn"
            type="button"
            onclick={() => onRemoveRequest(entry.id, entry.displayName)}
          >
            Remove
          </button>
        {/if}
      </li>
    {/each}
  </ol>
{/if}

<style>
  .empty {
    text-align: center;
    color: #6b7280;
    font-size: 0.9375rem;
    padding: 1rem 0;
    line-height: 1.8;
  }

  .list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .entry {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    background: #f9fafb;
    border-radius: 0.5rem;
  }

  .position {
    min-width: 1.75rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: #6b7280;
    text-align: center;
  }

  .name {
    flex: 1;
    font-size: 0.9375rem;
    color: #111827;
  }

  .remove-btn {
    padding: 0.25rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #dc2626;
    background: none;
    border: 1px solid #fca5a5;
    border-radius: 0.375rem;
    cursor: pointer;
    line-height: 1.4;
  }

  .remove-btn:hover {
    background: #fee2e2;
  }
</style>
