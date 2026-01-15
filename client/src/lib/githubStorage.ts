/**
 * GitHub Gists-based storage with localStorage fallback
 * 
 * To enable GitHub sync:
 * 1. Create a GitHub Personal Access Token with 'gist' scope
 * 2. Store it in localStorage: localStorage.setItem('github-token', 'your-token')
 * 3. The app will automatically sync data to a Gist
 */

const GIST_FILENAME = "countdown-data.json";
const STORAGE_KEY_GIST_ID = "countdown-gist-id";
const STORAGE_KEY_TOKEN = "github-token";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureFlag = isSecure ? " Secure;" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Strict;${secureFlag}`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict;`;
}

function getStoredValue(key: string): string | null {
  const localValue = localStorage.getItem(key);
  if (localValue) return localValue;

  const cookieValue = getCookie(key);
  if (cookieValue) {
    localStorage.setItem(key, cookieValue);
  }
  return cookieValue;
}

function setStoredValue(key: string, value: string): void {
  localStorage.setItem(key, value);
  setCookie(key, value);
}

function removeStoredValue(key: string): void {
  localStorage.removeItem(key);
  deleteCookie(key);
}

interface AppData {
  targetDate?: string;
  excludedDates: Array<{ date: string; comment?: string }>;
  tasks: Array<{
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
  }>;
}

export async function saveToGitHub(data: AppData): Promise<void> {
  const token = getStoredValue(STORAGE_KEY_TOKEN);
  if (!token) {
    // No token, skip GitHub sync
    return;
  }

  try {
    const gistId = getStoredValue(STORAGE_KEY_GIST_ID);
    const url = gistId
      ? `https://api.github.com/gists/${gistId}`
      : "https://api.github.com/gists";

    const body: any = {
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2),
        },
      },
      description: "Countdown app data",
    };

    // If updating existing gist, mark as public for easier access
    if (!gistId) {
      body.public = false; // Private gist
    }

    const response = await fetch(url, {
      method: gistId ? "PATCH" : "POST",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    if (!gistId && result.id) {
      setStoredValue(STORAGE_KEY_GIST_ID, result.id);
    }
  } catch (error) {
    console.error("Failed to save to GitHub:", error);
    // Don't throw - allow localStorage to handle it
  }
}

export async function loadFromGitHub(): Promise<AppData | null> {
  const token = getStoredValue(STORAGE_KEY_TOKEN);
  const gistId = getStoredValue(STORAGE_KEY_GIST_ID);

  if (!token || !gistId) {
    return null;
  }

  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Gist not found, clear the ID
        removeStoredValue(STORAGE_KEY_GIST_ID);
      }
      return null;
    }

    const gist = await response.json();
    const file = gist.files[GIST_FILENAME];
    if (!file) {
      return null;
    }

    return JSON.parse(file.content) as AppData;
  } catch (error) {
    console.error("Failed to load from GitHub:", error);
    return null;
  }
}

export function setGitHubToken(token: string | null): void {
  if (token) {
    setStoredValue(STORAGE_KEY_TOKEN, token);
  } else {
    removeStoredValue(STORAGE_KEY_TOKEN);
    removeStoredValue(STORAGE_KEY_GIST_ID);
  }
}

export function getGitHubToken(): string | null {
  return getStoredValue(STORAGE_KEY_TOKEN);
}

export function getGitHubGistId(): string | null {
  return getStoredValue(STORAGE_KEY_GIST_ID);
}

export function setGitHubGistId(gistId: string | null): void {
  if (gistId) {
    setStoredValue(STORAGE_KEY_GIST_ID, gistId);
  } else {
    removeStoredValue(STORAGE_KEY_GIST_ID);
  }
}


