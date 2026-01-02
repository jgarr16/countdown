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
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (!token) {
    // No token, skip GitHub sync
    return;
  }

  try {
    const gistId = localStorage.getItem(STORAGE_KEY_GIST_ID);
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
      localStorage.setItem(STORAGE_KEY_GIST_ID, result.id);
    }
  } catch (error) {
    console.error("Failed to save to GitHub:", error);
    // Don't throw - allow localStorage to handle it
  }
}

export async function loadFromGitHub(): Promise<AppData | null> {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  const gistId = localStorage.getItem(STORAGE_KEY_GIST_ID);

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
        localStorage.removeItem(STORAGE_KEY_GIST_ID);
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
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_GIST_ID);
  }
}

export function getGitHubToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

