import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateLinkToken } from "../../services/telegramService";
import { useAuth } from "../../context/AuthContext";

export default function LinkTelegram() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleGenerateToken = async () => {
    try {
      setError("");
      setSuccess(false);
      setLoading(true);
      const data = await generateLinkToken();
      setToken(data.token);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate link token");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Link Telegram</h1>
            <p className="text-gray-600">
              Connect your Telegram account to receive assignment notifications.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {token ? "✅ Token copied to clipboard!" : "✅ Token generated successfully!"}
          </div>
        )}

        <div className="rounded-md bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">How to Link Your Telegram</h2>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Click the button below to generate a link token</li>
              <li>Copy the token</li>
              <li>
                Open Telegram and send this message to the bot:
                <div className="mt-2 bg-gray-100 rounded p-2 font-mono text-sm">
                  /start YOUR_TOKEN_HERE
                </div>
              </li>
              <li>The bot will confirm your account is linked</li>
            </ol>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGenerateToken}
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Link Token"}
            </button>
          </div>

          {token && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-gray-600 mb-2">Your token (valid for 10 minutes):</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={token}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm text-amber-800">
                  <strong>⏰ Important:</strong> This token expires in 10 minutes. Send it to the bot before it expires.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Quick send command:</p>
                <div className="bg-gray-100 rounded p-2 font-mono text-sm break-all">
                  /start {token}
                </div>
              </div>
            </div>
          )}
        </div>

        {user?.telegramLinked && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-green-700">
              ✅ Your Telegram account is already linked to receive notifications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
