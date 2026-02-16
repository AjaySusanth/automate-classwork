import api from "./api.js";

/**
 * Generate a link token for Telegram account linking.
 * Returns a short-lived token that user sends to bot via /start command.
 */
export const generateLinkToken = async () => {
  const response = await api.post("/telegram/link-token");
  return response.data;
};
