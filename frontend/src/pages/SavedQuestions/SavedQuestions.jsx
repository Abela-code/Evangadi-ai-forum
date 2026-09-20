import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyBookmarks } from "../../api/bookmark.api";
import EmptyState from "../../components/EmptyState/EmptyState";
import ErrorMessage from "../../components/ErrorMessage/ErrorMessage";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner";
import QuestionCard from "../../components/QuestionCard/QuestionCard";
import { useLanguage } from "../../context/LanguageContext";
import { getErrorMessage, unwrapArray } from "../../utils/data";
import btn from "../../styles/buttons.module.css";
import ui from "../../styles/pageStates.module.css";
import styles from "./SavedQuestions.module.css";

export default function SavedQuestions() {
  const { t } = useLanguage();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getMyBookmarks();
      const savedQuestions = unwrapArray(data, [
        "bookmarks",
        "questions",
        "results",
        "data",
      ]);
      setBookmarks(savedQuestions);
    } catch (err) {
      setError(getErrorMessage(err, t("couldNotLoadSavedQuestions")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleToggleBookmark = ({ question, nextState }) => {
    if (nextState) return;

    const questionHash =
      question?.question_hash || question?.questionHash || question?.hash;
    const questionId = question?.question_id ?? question?.questionId ?? question?.id;

    setBookmarks((current) =>
      current.filter((item) => {
        const itemHash =
          item?.question_hash || item?.questionHash || item?.hash || null;
        const itemId = item?.question_id ?? item?.questionId ?? item?.id ?? null;

        return !(
          (questionHash && itemHash === questionHash) ||
          (questionId != null && itemId === questionId)
        );
      }),
    );
  };

  if (loading) {
    return <LoadingSpinner label={t("loading")} />;
  }

  if (error) {
    return (
      <div className={`${ui.pageStack} ${styles.errorState}`}>
        <ErrorMessage message={error} />
        <button type="button" className={btn.secondaryButton} onClick={loadBookmarks}>
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pageShell}>
      <header className={styles.header}>
        <span className={ui.eyebrow}>{t("saved")}</span>
        <h1>{t("savedQuestions")}</h1>
        <p>{t("checkSavedQuestions")}</p>
      </header>

      {bookmarks.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            title={t("noSavedQuestionsYet")}
            message={t("bookmarkQuestionsPrompt")}
            action={
              <Link to="/dashboard" className={btn.primaryButton}>
                {t("browseQuestions")}
              </Link>
            }
          />
        </div>
      ) : (
        <div className={ui.threadList}>
          {bookmarks.map((question) => (
            <QuestionCard
              key={
                question.question_hash ||
                question.questionHash ||
                question.id ||
                question.hash
              }
              question={question}
              onToggleBookmark={handleToggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
