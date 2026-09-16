import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { getAuthorInitials, getAuthorName } from "../../utils/data";
import styles from "./QuestionCard.module.css";
import ui from "../../styles/pageStates.module.css";

export default function QuestionCard({ question, yours = false }) {
  const hash = question.question_hash || question.questionHash || question.hash;
  const author = getAuthorName(question);
  const replies =
    question.answer_count ??
    question.answers_count ??
    question.answerCount ??
    0;
  const content = question.content || question.description || "";
  const initials = getAuthorInitials(question);
  return (
    <Link
      to={`/questions/${hash}`}
      className={`${ui.threadRow}${yours ? ` ${ui.yours}` : ""}`}
    >
      <span className={ui.threadAvatar}>{initials}</span>
      <div className={styles.threadMain}>
        <div className={styles.threadTitleRow}>
          <h3>{question.title}</h3>
          {yours && <span className={styles.yoursBadge}>Yours</span>}
        </div>
        <span className={styles.categoryBadge}>
          {question.category || "Other"}
        </span>
        <p>{content}</p>
        <div className={styles.threadMeta}>
          <span>
            <MessageSquare size={13} /> {replies} replies
          </span>
          <span>Recently by {yours ? "You" : author}</span>
        </div>
      </div>
    </Link>
  );
}
