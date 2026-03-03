import type { CachedToken } from "../types/index.ts";

let cachedToken: CachedToken | null = null;

export async function getManagementToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.ENTRA_APP_ID;
  const clientSecret = process.env.ENTRA_APP_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Missing required env vars: TENANT_ID, ENTRA_APP_ID, ENTRA_APP_CLIENT_SECRET"
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    resource: "https://management.azure.com/",
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to acquire management token: ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_on: string;
  };

  // Cache token until 60 seconds before expiry
  cachedToken = {
    token: data.access_token,
    expiresAt: parseInt(data.expires_on, 10) * 1000 - 60_000,
  };

  return cachedToken.token;
}
