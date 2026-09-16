import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ui from "../../styles/pageStates.module.css";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";

  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() ||
    "U";

  function handleLogout() {
    logout();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="profile-menu">
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={ui.avatar}>{initials}</span>

        <span className="profile-trigger-copy">
          <strong>{displayName}</strong>
          <small>{user?.email || ""}</small>
        </span>

        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="profile-dropdown">
          <button type="button" onClick={() => setOpen(false)}>
            <UserRound size={17} />
            Profile
          </button>

          <button type="button" onClick={handleLogout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
