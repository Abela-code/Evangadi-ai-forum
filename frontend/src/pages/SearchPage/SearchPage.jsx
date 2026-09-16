import { useState } from "react";
import { Search } from "lucide-react";
import { semanticSearch } from "../../api/question.api";
import QuestionCard from "../../components/QuestionCard/QuestionCard";
import ErrorMessage from "../../components/ErrorMessage/ErrorMessage";
import EmptyState from "../../components/EmptyState/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner";
import { getErrorMessage, unwrapArray } from "../../utils/data";
import btn from "../../styles/buttons.module.css";
import styles from "./SearchPage.module.css";
import ui from "../../styles/pageStates.module.css";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const value = query.trim();
    if (value.length < 5) return;

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const data = await semanticSearch({
        query: value,
        k: 10,
      });

      setResults(unwrapArray(data, ["questions", "results", "matches"]));
    } catch (err) {
      setError(getErrorMessage(err, "Semantic search failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={ui.pageStack}>
      <section className={ui.pageHeading}>
        <div>
          <span className={ui.eyebrow}>AI Search</span>
          <h1>Semantic Search</h1>
          <p>Search by meaning instead of exact keywords.</p>
        </div>
      </section>

      <section className={ui.panel}>
        <form className={styles.semanticSearchForm} onSubmit={handleSubmit}>
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Example: how does middleware work in express?"
          />
          <button className={btn.primaryButton}>Search</button>
        </form>
      </section>

      {loading && <LoadingSpinner label="Searching..." />}
      {error && <ErrorMessage message={error} />}

      {searched && !loading && !error && results.length === 0 && (
        <EmptyState
          title="No semantic matches found"
          message="Try describing the problem in a different way."
        />
      )}

      <div className={ui.questionList}>
        {results.map((question, index) => (
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
