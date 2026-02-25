/**
 * Base interface for storage providers.
 * Implement this to add new backends (Supabase, Azure, S3, etc.).
 */
export default class StorageProvider {
  /**
   * Upload a file to storage.
   * @param {Buffer} buffer - File contents
   * @param {string} path - Storage path (e.g. "submissions/assignmentId/studentId/file.pdf")
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<{ url: string, key: string }>} Public URL and storage key
   */
  async upload(buffer, path, mimeType) {
    throw new Error("upload() not implemented");
  }

  /**
   * Delete a file from storage.
   * @param {string} key - Storage key returned from upload()
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error("delete() not implemented");
  }

  /**
   * @returns {string} Provider name for logging
   */
  getName() {
    throw new Error("getName() not implemented");
  }
}
