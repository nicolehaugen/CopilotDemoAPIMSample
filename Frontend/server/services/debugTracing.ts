export async function getDebugCredentials(
  managementToken: string
): Promise<string> {
  const apimResourceId = process.env.APIM_RESOURCE_ID;
  if (!apimResourceId) {
    throw new Error("Missing required env var: APIM_RESOURCE_ID");
  }

  const url = `https://management.azure.com${apimResourceId}/gateways/managed/listDebugCredentials?api-version=2024-05-01`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${managementToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiId: `${apimResourceId}/apis/gateway-wildcard`,
      purposes: ["tracing"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get debug credentials: ${errorText}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export async function getTrace(
  managementToken: string,
  traceId: string
): Promise<unknown> {
  const apimResourceId = process.env.APIM_RESOURCE_ID;
  if (!apimResourceId) {
    throw new Error("Missing required env var: APIM_RESOURCE_ID");
  }

  const url = `https://management.azure.com${apimResourceId}/gateways/managed/listTrace?api-version=2023-05-01-preview`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${managementToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ traceId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get trace: ${errorText}`);
  }

  return response.json();
}
