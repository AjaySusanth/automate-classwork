import SupabaseStorage from "./SupabaseStorage.js";

const provider = process.env.STORAGE_PROVIDER || "supabase";

let storageProvider;

switch (provider) {
  case "supabase":
    storageProvider = new SupabaseStorage({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_KEY,
      bucket: process.env.SUPABASE_BUCKET || "submissions",
    });
    break;
  // Future: case "azure": ...
  default:
    throw new Error(`Unknown storage provider: ${provider}`);
}

export default storageProvider;
