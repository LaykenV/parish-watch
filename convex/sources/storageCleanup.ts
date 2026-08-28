export async function cleanupStoredArtifacts<T>(
  storageIds: readonly T[],
  remove: (storageId: T) => Promise<void>,
): Promise<string[]> {
  const failures: string[] = []
  for (const storageId of storageIds) {
    try {
      await remove(storageId)
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error))
    }
  }
  return failures
}
