/**
 * Vercel Domain API integration.
 * Adds/removes custom domains from the Vercel project and checks DNS status.
 */

const VERCEL_API_BASE = "https://api.vercel.com";

function getHeaders() {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN is not configured");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getProjectId() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) throw new Error("VERCEL_PROJECT_ID is not configured");
  return projectId;
}

function getTeamParam() {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${teamId}` : "";
}

/**
 * Add a custom domain to the Vercel project.
 * Vercel automatically provisions SSL once DNS is verified.
 */
export async function addDomainToVercel(domain: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const projectId = getProjectId();
    const teamParam = getTeamParam();

    const response = await fetch(
      `${VERCEL_API_BASE}/v10/projects/${projectId}/domains${teamParam}`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name: domain }),
      }
    );

    if (response.ok) {
      return { success: true };
    }

    const data = await response.json();

    // Domain already exists on this project — that's fine
    if (data.error?.code === "domain_already_in_use") {
      return { success: true };
    }

    return {
      success: false,
      error: data.error?.message || `Vercel API error: ${response.status}`,
    };
  } catch (err) {
    console.error("Failed to add domain to Vercel:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Remove a custom domain from the Vercel project.
 */
export async function removeDomainFromVercel(domain: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const projectId = getProjectId();
    const teamParam = getTeamParam();

    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}${teamParam}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );

    if (response.ok || response.status === 404) {
      // 404 means domain wasn't on the project — that's fine
      return { success: true };
    }

    const data = await response.json();
    return {
      success: false,
      error: data.error?.message || `Vercel API error: ${response.status}`,
    };
  } catch (err) {
    console.error("Failed to remove domain from Vercel:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Check the DNS configuration and SSL status of a domain on Vercel.
 */
export async function getDomainStatus(domain: string): Promise<{
  configured: boolean;
  verified: boolean;
  error?: string;
}> {
  try {
    const projectId = getProjectId();
    const teamParam = getTeamParam();

    const response = await fetch(
      `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${domain}${teamParam}`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      return { configured: false, verified: false };
    }

    const data = await response.json();

    return {
      configured: true,
      verified: data.verified === true,
    };
  } catch {
    return { configured: false, verified: false };
  }
}
