declare module "bun:test" {
  interface Matchers {
    toBe(expected: unknown): void;
    toBeTypeOf(expected: string): void;
    toBeNull(): void;
    toEqual(expected: unknown): void;
    toThrow(expected?: unknown): void;
    not: Matchers;
  }

  export function describe(name: string, fn: () => void): void;
  export function expect(value: unknown): Matchers;
  export function test(name: string, fn: () => void): void;
}
