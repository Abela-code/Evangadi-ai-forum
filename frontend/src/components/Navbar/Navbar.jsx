import { LogOut, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
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
        <button className={btn.iconButton} onClick={onLogout}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
