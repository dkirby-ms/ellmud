import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAppContext } from "../store";

/**
 * OAuth callback handler
 * Server redirects here with ?token=...&playerId=...
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { dispatch } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const playerId = searchParams.get("playerId");

    if (token && playerId) {
      // Authenticate with OAuth token
      dispatch({ type: "LOGIN_SUCCESS", token, playerId });
      navigate("/refuge", { replace: true });
    } else {
      // No token in URL — redirect to login
      navigate("/", { replace: true });
    }
  }, [searchParams, dispatch, navigate]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-text-secondary">Completing sign in...</div>
    </div>
  );
}
