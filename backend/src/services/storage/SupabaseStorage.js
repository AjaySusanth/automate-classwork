import { createClient } from "@supabase/supabase-js";
import StorageProvider from "./StorageProvider.js";

export default class SupabaseStorage extends StorageProvider {
  constructor({ supabaseUrl, supabaseKey, bucket }) {
    super();
    this.bucket = bucket;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getName() {
    return "supabase";
  }

  async upload(buffer, path, mimeType) {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      key: data.path,
    };
  }

  async delete(key) {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([key]);

    if (error) {
      console.error(`Supabase delete failed for key ${key}:`, error.message);
    }
  }
}
