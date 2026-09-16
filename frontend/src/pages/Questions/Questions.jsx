import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { getAllQuestions } from "../../api/question.api";
import QuestionCard from "../../components/QuestionCard/QuestionCard";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner";
import ErrorMessage from "../../components/ErrorMessage/ErrorMessage";
import EmptyState from "../../components/EmptyState/EmptyState";
import { getErrorMessage, unwrapArray } from "../../utils/data";
import btn from "../../styles/buttons.module.css";
import ui from "../../styles/pageStates.module.css";

const QUESTION_CATEGORIES = [
  "Technology",
  "Education",
  "Economy",
  "Politics",
  "Health",
  "Science",
  "Career",
  "Business",
  "Other",
];

export default function Questions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const params = {};
        if (search) params.search = search;
        if (category) params.category = category;
        const data = await getAllQuestions(params);
        setQuestions(unwrapArray(data, ["questions", "results"]));
      } catch (err) {
        setError(getErrorMessage(err, "Could not load questions."));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [search, category]);

  function handleCategoryChange(event) {
    const nextParams = new URLSearchParams(searchParams);
    if (event.target.value) nextParams.set("category", event.target.value);
    else nextParams.delete("category");
    setSearchParams(nextParams);
  }

  return (
    <div className={ui.pageStack}>
      <section className={ui.pageHeading}>
        <div>
          <span className={ui.eyebrow}>Community</span>
          <h1>{search ? `Search: ${search}` : "All Questions"}</h1>
          <p>Browse questions posted by forum members.</p>
        </div>

        <div className={ui.questionTools}>
          <label className={ui.categoryFilter}>
            Category
            <select value={category} onChange={handleCategoryChange}>
              <option value="">All categories</option>
              {QUESTION_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Link to="/questions/ask" className={btn.primaryButton}>
            <PlusCircle size={18} />
            Ask Question
          </Link>
        </div>
      </section>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && questions.length === 0 && (
        <EmptyState
          title="No questions found"
          message={
            search
              ? "Try a different keyword or use semantic search."
              : "No questions have been posted yet."
          }
        />
      )}

      <div className={ui.questionList}>
        {questions.map((question, index) => (
          <QuestionCard
            key={
              question.question_hash ||
              question.questionHash ||
              question.id ||
              index
            }
            question={question}
          />
        ))}
      </div>
    </div>
  );
}
