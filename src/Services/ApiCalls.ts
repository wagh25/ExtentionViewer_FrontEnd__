export interface ValidateTokenResponse {
  status: boolean;
  message?: string;
  user?: any;
}

export const validateToken = async (token: string): Promise<ValidateTokenResponse | null> => {
  try {
    const response = await fetch("http://localhost:5000/auth/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Token: token }),
    });
    if (response.ok) {
      const res: ValidateTokenResponse = await response.json();
      return res;
    }
    return null;
  } catch (err) {
    console.error("Token validation error:", err);
    return null;
  }
};
