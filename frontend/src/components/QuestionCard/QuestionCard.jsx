import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { bookmarkQuestion, unbookmarkQuestion } from "../../api/bookmark.api";
import { getQuestionTranslation } from "../../api/question.api";
import { useLanguage } from "../../context/LanguageContext";
import { getAuthorInitials, getAuthorName } from "../../utils/data";
import styles from "./QuestionCard.module.css";
import ui from "../../styles/pageStates.module.css";

export default function QuestionCard({
  question,
  yours = false,
  onToggleBookmark,
}) {
  const { language, t } = useLanguage();
  const hash = question.question_hash || question.questionHash || question.hash;
  const questionId = question.question_id || question.questionId || question.id;
  const author = getAuthorName(question);
  const replies =
    question.answer_count ??
    question.answers_count ??
    question.answerCount ??
    0;
  const originalTitle = question.title || "";
  const originalContent = question.content || question.description || "";
  const [translated, setTranslated] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(
    Boolean(question.isBookmarked ?? question.bookmarked),
  );
  const [savingBookmark, setSavingBookmark] = useState(false);
  const initials = getAuthorInitials(question);
  const translationKey = JSON.stringify([
    hash,
    originalTitle,
    originalContent,
    language,
  ]);

  useEffect(() => {
    setIsBookmarked(Boolean(question.isBookmarked ?? question.bookmarked));
  }, [question.isBookmarked, question.bookmarked]);

  useEffect(() => {
    let active = true;

    if (language === "en" || !hash) {
      return undefined;
    }

    getQuestionTranslation(question, language)
      .then((value) => {
        if (active) setTranslated({ key: translationKey, value });
      })
      .catch((error) => {
        if (active) console.error("Question feed translation:", error);
      });

    return () => {
      active = false;
    };
  }, [language, hash, originalTitle, originalContent, question, translationKey]);

  async function handleBookmarkToggle(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!questionId || savingBookmark) return;

    const previousState = isBookmarked;
    const nextState = !isBookmarked;

    setIsBookmarked(nextState);
    setSavingBookmark(true);

    try {
      if (nextState) {
        await bookmarkQuestion(questionId || hash);
      } else {
        await unbookmarkQuestion(questionId || hash);
      }

      onToggleBookmark?.({
        question,
        nextState,
        previousState,
        questionId: questionId || hash,
      });
    } catch (error) {
      setIsBookmarked(previousState);
      console.error("Bookmark toggle failed:", error);
    } finally {
      setSavingBookmark(false);
    }
  }

  const displayTranslation =
    translated?.key === translationKey ? translated.value : null;
  const title = displayTranslation?.translatedTitle || originalTitle;
  const content = displayTranslation?.translatedContent || originalContent;
  const categoryKey = `category${question.category || "Other"}`;
  const category = t(categoryKey);

  return (
    <Link
      to={`/questions/${hash}`}
      className={`${ui.threadRow}${yours ? ` ${ui.yours}` : ""}`}
    >
      <span className={ui.threadAvatar}>{initials}</span>
      <div className={styles.threadMain}>
        <div className={styles.threadTitleRow}>
          <h3>{title}</h3>
          <button
            type="button"
            className={`${styles.bookmarkButton} ${isBookmarked ? styles.bookmarked : ""}`}
            onClick={handleBookmarkToggle}
            disabled={savingBookmark}
            aria-label={isBookmarked ? t("removeBookmark") : t("saveQuestion")}
          >
            {isBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            <span>{savingBookmark ? t("saved") : isBookmarked ? t("saved") : t("saveQuestion")}</span>
          </button>
          {yours && <span className={styles.yoursBadge}>{t("yours")}</span>}
        </div>
        <span className={styles.categoryBadge}>
          {category === categoryKey ? question.category || t("categoryOther") : category}
        </span>
        <p>{content}</p>
        <div className={styles.threadMeta}>
          <span>
            <MessageSquare size={13} /> {replies} {t("replies")}
          </span>
          <span>
            {t("recentlyBy")} {yours ? t("you") : author}
          </span>
        </div>
      </div>
    </Link>
  );
}
