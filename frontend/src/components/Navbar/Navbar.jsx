import { Bell, LogOut, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../api/notification.api";
import btn from "../../styles/buttons.module.css";
import styles from "./Navbar.module.css";
import ui from "../../styles/pageStates.module.css";
const TITLES = {
  "/dashboard": [
    "Home",
    "Browse the feed, search by keyword, or run AI similarity search.",
  ],
  "/questions/ask": [
    "Ask a question",
    "A clear title and reproducible steps get faster, more accurate answers.",
  ],
  "/my-questions": [
    "Your topics",
    "Questions you have posted. Open any thread to read replies or edit context.",
  ],
  "/rag-documents": [
    "Knowledge Base",
    "Course files, retrieval, and grounded references.",
  ],
  "/search": [
    "Semantic search",
    "Find questions by meaning, not only exact words.",
  ],
};
export default function Navbar() {
  const { pathname } = useLocation(),
    navigate = useNavigate(),
    { user, logout } = useAuth(),
    { language, setLanguage, languages, t } = useLanguage(),
    [search, setSearch] = useState("");
  const [notificationState, setNotificationState] = useState({
    notifications: [],
    unreadCount: 0,
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      setNotificationsLoading(true);
      setNow(Date.now());
      try {
        const data = await getNotifications();
        if (active) {
          setNotificationState({
            notifications: data.notifications || [],
            unreadCount: data.unreadCount || 0,
          });
          setNotificationsError("");
        }
      } catch {
        if (active) setNotificationsError("Could not load notifications.");
      } finally {
        if (active) setNotificationsLoading(false);
      }
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 20000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [user?.id]);
  const [title, subtitle] =
    pathname.startsWith("/questions/") && !TITLES[pathname]
      ? [
          "Discussion",
          "Read the thread, review related topics, and reply with markdown if you can help.",
        ]
      : TITLES[pathname] || ["Evangadi Forum", "Technical Q&A for learners."];
  function submit(e) {
    e.preventDefault();
    if (search.trim())
      navigate(`/questions?search=${encodeURIComponent(search.trim())}`);
  }
  function onLogout() {
    logout();
    navigate("/auth", { replace: true });
  }
  async function openNotification(notification) {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        setNotificationState((current) => ({
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          notifications: current.notifications.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        }));
      } catch {
        setNotificationsError("Could not update notification.");
      }
    }

    setNotificationsOpen(false);
    navigate(`/questions/${notification.questionHash}`);
  }
  async function readAllNotifications() {
    try {
      await markAllNotificationsAsRead();
      setNotificationState((current) => ({
        unreadCount: 0,
        notifications: current.notifications.map((item) => ({
          ...item,
          isRead: true,
        })),
      }));
    } catch {
      setNotificationsError("Could not update notifications.");
    }
  }
  function relativeTime(value) {
    const seconds = Math.max(0, Math.floor((now - new Date(value)) / 1000));
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  const translatedTitle =
    pathname === "/dashboard"
      ? t("home")
      : pathname === "/questions/ask"
        ? t("newQuestion")
        : pathname === "/rag-documents"
          ? t("knowledgeBase")
          : title;

  return (
    <header className={styles.navbar}>
      <div className={styles.navbarPageTitle}>
        <strong>{translatedTitle}</strong>
        <small>{subtitle}</small>
      </div>
      <form className={styles.navbarSearch} onSubmit={submit}>
        <Search size={17} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchQuestions")}
        />
      </form>
      <div className={styles.navbarUser}>
        <label className={styles.languageControl}>
          <span>{t("language")}:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <strong>
          {user?.firstName || "User"} {user?.lastName || ""}
        </strong>
        <span className={`${ui.avatar} ${ui.small}`}>
          {`${user?.firstName?.[0] || "U"}${user?.lastName?.[0] || ""}`.toUpperCase()}
        </span>
        <div className={styles.notificationMenu}>
          <button
            type="button"
            className={btn.iconButton}
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Bell size={18} />
            {notificationState.unreadCount > 0 && (
              <span className={styles.notificationBadge}>
                {notificationState.unreadCount > 99
                  ? "99+"
                  : notificationState.unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className={styles.notificationPanel}>
              <div className={styles.notificationHeader}>
                <strong>Notifications</strong>
                {notificationState.unreadCount > 0 && (
                  <button type="button" onClick={readAllNotifications}>
                    Mark all as read
                  </button>
                )}
              </div>
              {notificationsLoading ? (
                <p className={styles.notificationState}>Loading...</p>
              ) : notificationsError ? (
                <p className={styles.notificationError}>{notificationsError}</p>
              ) : notificationState.notifications.length === 0 ? (
                <p className={styles.notificationState}>You're all caught up</p>
              ) : (
                <div className={styles.notificationList}>
                  {notificationState.notifications.map((notification) => (
                    <button
                      type="button"
                      className={`${styles.notificationItem} ${
                        notification.isRead ? "" : styles.unread
                      }`}
                      key={notification.id}
                      onClick={() => openNotification(notification)}
                    >
                      <span className={styles.notificationIcon}>
                        <Bell size={15} />
                      </span>
                      <span>
                        <strong>{notification.title}</strong>
                        <span>{notification.message}</span>
                        <small>
                          {notification.questionTitle} ·{" "}
                          {relativeTime(notification.createdAt)}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <button className={btn.iconButton} onClick={onLogout}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
