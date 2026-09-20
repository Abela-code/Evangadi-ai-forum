import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Plus, Rows3, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getAllQuestions, semanticSearch } from "../../api/question.api";
import QuestionCard from "../../components/QuestionCard/QuestionCard";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage/ErrorMessage";
import EmptyState from "../../components/EmptyState/EmptyState";
import {
  getErrorMessage,
  getQuestionOwnerId,
  unwrapArray,
} from "../../utils/data";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import btn from "../../styles/buttons.module.css";
import styles from "./Dashboard.module.css";
import ui from "../../styles/pageStates.module.css";

const SEMANTIC_MIN_LENGTH = 5; // GET /api/questions/search rejects shorter queries

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("keyword");
  const [activeSearch, setActiveSearch] = useState(null);
  const [note, setNote] = useState("");

  const loadAllQuestions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getAllQuestions();
      setQuestions(unwrapArray(data, ["questions", "results"]));
      setActiveSearch(null);
    } catch (err) {
      setError(getErrorMessage(err, t("couldNotLoadQuestions")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // The first load runs inline rather than calling loadAllQuestions(), so no
  // state is set synchronously while the effect body runs. `loading` already
  // starts true, and the cancelled flag stops a slow response from landing on
  // an unmounted page.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getAllQuestions();
        if (!cancelled)
          setQuestions(unwrapArray(data, ["questions", "results"]));
      } catch (err) {
        if (!cancelled)
          setError(getErrorMessage(err, t("couldNotLoadQuestions")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function runSearch(event) {
    event.preventDefault();

    const value = searchQuery.trim();
    setNote("");

    if (!value) {
      await loadAllQuestions();
      return;
    }

    if (searchMode === "semantic" && value.length < SEMANTIC_MIN_LENGTH) {
      setNote(
        t("semanticSearchLength", { count: SEMANTIC_MIN_LENGTH }),
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data =
        searchMode === "semantic"
          ? await semanticSearch({ query: value, k: 10 })
          : await getAllQuestions({ search: value });

      setQuestions(unwrapArray(data, ["questions", "results", "matches"]));
      setActiveSearch({ term: value, mode: searchMode });
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          searchMode === "semantic"
            ? t("semanticSearchFailed")
            : t("couldNotSearchQuestions"),
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setNote("");
    loadAllQuestions();
  }

  function switchMode(mode) {
    setSearchMode(mode);
    setNote("");
  }

  const stats = useMemo(
    () => ({
      q: questions.length,

      r: questions.reduce(
        (sum, question) =>
          sum +
          Number(
            question.answer_count ??
              question.answers_count ??
              question.answerCount ??
              0,
          ),
        0,
      ),

      u: questions.filter(
        (question) =>
          Number(
            question.answer_count ??
              question.answers_count ??
              question.answerCount ??
              0,
          ) === 0,
      ).length,
    }),
    [questions],
  );

  const uid = user?.id ?? user?.user_id;

  return (
    <div className={styles.dashboardPage}>
      <section className={styles.welcomeCard}>
        <span className={ui.eyebrow}>{t("forumHome")}</span>
        <h1>
          {t("goodToSeeYou")}, {user?.firstName || t("learnerFallback")}
        </h1>
        <p>{t("dashboardIntro")}</p>
        <div className={styles.quickGrid}>
          <Link to="/questions/ask">
            <Plus />
            <div>
              <strong>{t("newQuestion")}</strong>
              <small>{t("newQuestionDescription")}</small>
            </div>
          </Link>
          <Link to="/my-questions">
            <Rows3 />
            <div>
              <strong>{t("yourTopics")}</strong>
              <small>{t("yourTopicsDescription")}</small>
            </div>
          </Link>
          <Link to="/rag-documents">
            <BookOpen />
            <div>
              <strong>{t("knowledgeBase")}</strong>
              <small>{t("knowledgeBaseDescription")}</small>
            </div>
          </Link>
        </div>
        <div className={styles.welcomeDivider} />
        <p className={styles.tinyNote}>
          {t("feedFigures")}
        </p>
        <div className={`${styles.statsGrid} ${styles.compact}`}>
          <div>
            <small>{t("questions")}</small>
            <strong>{stats.q}</strong>
          </div>
          <div>
            <small>Replies</small>
            <strong>{stats.r}</strong>
          </div>
          <div>
            <small>{t("unanswered")}</small>
            <strong>{stats.u}</strong>
          </div>
          <div>
            <small>{t("yours")}</small>
            <strong>
              {
                questions.filter(
                  (q) => String(getQuestionOwnerId(q)) === String(uid),
                ).length
              }
            </strong>
          </div>
        </div>
      </section>
      <section className={styles.feedCard}>
        <div className={styles.feedHead}>
          <div>
            <h2>{t("discussionFeed")}</h2>
            <p>{t("feedAccentNote")}</p>
          </div>
          <span className={styles.orangePill}>
            {activeSearch
              ? `${activeSearch.mode === "semantic" ? t("semantic") : t("keyword")} ${t("results")}`
              : t("newestThreads")}
          </span>
        </div>

        <form className={styles.feedSearch} onSubmit={runSearch}>
          <div className={styles.feedSearchInput}>
            <Search size={18} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={
                searchMode === "semantic"
                  ? t("semanticPlaceholder")
                  : t("searchTitlesContent")
              }
              aria-label="Search questions"
            />
          </div>

          <div
            className={styles.feedModeToggle}
            role="group"
            aria-label={t("search")}
          >
            <button
              type="button"
              className={searchMode === "keyword" ? styles.active : ""}
              onClick={() => switchMode("keyword")}
              aria-pressed={searchMode === "keyword"}
            >
              {t("keyword")}
            </button>
            <button
              type="button"
              className={searchMode === "semantic" ? styles.active : ""}
              onClick={() => switchMode("semantic")}
              aria-pressed={searchMode === "semantic"}
            >
              {t("semantic")}
            </button>
          </div>

          <button className={btn.primaryButton} disabled={loading}>
            {loading ? t("searching") : t("search")}
          </button>

          {activeSearch && (
            <button
              type="button"
              className={btn.textButton}
              onClick={clearSearch}
            >
              <X size={15} /> {t("clear")}
            </button>
          )}

          {note && <p className={styles.feedSearchNote}>{note}</p>}
          {activeSearch && !note && (
            <p className={styles.feedSearchNote}>
              {t("searchMatches", {
                mode:
                  activeSearch.mode === "semantic"
                    ? t("semantic")
                    : t("keyword"),
                term: activeSearch.term,
              })}
            </p>
          )}
        </form>

        {loading && <LoadingSpinner label={t("loading")} />}
        {error && <ErrorMessage message={error} />}
        {!loading && !error && questions.length === 0 && (
          <EmptyState
            title={activeSearch ? t("noMatches") : t("noQuestionsYet")}
            message={
              activeSearch
                ? t("tryDifferentSearch")
                : t("firstQuestion")
            }
          />
        )}
        <div className={ui.threadList}>
          {questions.map((q, i) => (
            <QuestionCard
              key={q.question_hash || q.questionHash || q.id || i}
              question={q}
              yours={String(getQuestionOwnerId(q)) === String(uid)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
