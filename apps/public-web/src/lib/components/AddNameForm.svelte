<script lang="ts">
  let { onAdd }: { onAdd: (displayName: string) => Promise<string | null> } = $props();

  let displayName = $state("");
  let error = $state<string | null>(null);
  let submitting = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      error = "Please enter a name.";
      return;
    }
    submitting = true;
    error = null;
    const result = await onAdd(name);
    submitting = false;
    if (result) {
      error = result;
    } else {
      displayName = "";
    }
  }
</script>

<form class="form" onsubmit={handleSubmit}>
  <label class="label" for="display-name">Name to show on the board</label>
  <p class="helper">Use any name people can recognize you by.</p>
  <input
    id="display-name"
    class="input"
    type="text"
    bind:value={displayName}
    placeholder="Your name"
    autocomplete="off"
    disabled={submitting}
  />
  {#if error}
    <p class="error">{error}</p>
  {/if}
  <button class="submit-btn" type="submit" disabled={submitting || !displayName.trim()}>
    {submitting ? "Joining…" : "Join queue"}
  </button>
</form>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .label {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #111827;
  }

  .helper {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .input {
    padding: 0.625rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    color: #111827;
    background: #fff;
    width: 100%;
    outline: none;
    margin-top: 0.25rem;
  }

  .input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .input:disabled {
    background: #f9fafb;
    color: #9ca3af;
  }

  .error {
    color: #dc2626;
    font-size: 0.875rem;
  }

  .submit-btn {
    padding: 0.625rem 1.25rem;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    align-self: flex-start;
    margin-top: 0.25rem;
  }

  .submit-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
