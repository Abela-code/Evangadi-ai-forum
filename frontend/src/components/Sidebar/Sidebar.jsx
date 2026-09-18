import { NavLink, useNavigate } from "react-router-dom";
import { BookOpen, Home, LogOut, MessageSquare, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import styles from "./Sidebar.module.css";
import ui from "../../styles/pageStates.module.css";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const initials =
    `${user?.firstName?.[0] || "U"}${user?.lastName?.[0] || ""}`.toUpperCase();
  function onLogout() {
    logout();
    navigate("/auth", { replace: true });
  }
  return (
    <aside className={styles.sidebar}>
      <div>
        <NavLink to="/dashboard" className={styles.sidebarBrand}>
          <span className={ui.brandMark}>
            <MessageSquare size={19} />
          </span>
          <span>
            <strong>Evangadi Forum</strong>
            <small>Learn together. Ask with context.</small>
          </span>
        </NavLink>
        <div className={styles.sidebarSectionLabel}>{t("navigate")}</div>
        <nav className={styles.sidebarNav}>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${styles.sidebarLink}${isActive ? ` ${styles.active}` : ""}`
            }
          >
            <Home size={18} />
            {t("home")}
          </NavLink>
          <NavLink
            to="/my-questions"
            className={({ isActive }) =>
              `${styles.sidebarLink}${isActive ? ` ${styles.active}` : ""}`
            }
          >
            <MessageSquare size={18} />
            {t("yourTopics")}
          </NavLink>
          <NavLink
            to="/rag-documents"
            className={({ isActive }) =>
              `${styles.sidebarLink}${isActive ? ` ${styles.active}` : ""}`
            }
          >
            <BookOpen size={18} />
            {t("knowledgeBase")}
          </NavLink>
        </nav>
      </div>
      <div className={styles.sidebarBottom}>
        <NavLink to="/questions/ask" className={styles.sidebarNew}>
          <Plus size={17} />
          {t("newQuestion")}
        </NavLink>
        <div className={styles.sidebarUser}>
          <span className={ui.avatar}>{initials}</span>
          <span>
            <strong>
              {user?.firstName || "User"} {user?.lastName || ""}
            </strong>
            <small>{t("learner")}</small>
          </span>
        </div>
        <button
          type="button"
          className={styles.sidebarLogout}
          onClick={onLogout}
        >
          <LogOut size={16} />
          {t("logout")}
        </button>
      </div>
    </aside>
  );
}
