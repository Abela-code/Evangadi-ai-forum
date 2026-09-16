import styles from "./RagAnswerBody.module.css";

/**
 * Renders a grounded answer and the excerpts it was built from.
 *
 * The model is asked for plain prose that cites excerpts inline as [1], [2].
 * Those markers are turned into badges here so a reader can match a claim to
 * its source — which is the point of retrieval: an answer you can check.
 */
export default function RagAnswerBody({ answer = "", citations = [] }) {
  const text = typeof answer === "string" ? answer : "";

  if (!text.trim()) return null;

  const paragraphs = text.split(/\n{2,}/).filter((block) => block.trim());

  return (
    <div className={styles.answer}>
      {paragraphs.map((paragraph, blockIndex) => (
        <p key={blockIndex} className={styles.body}>
          {/* Split on [n] so the markers render as badges, not literal text. */}
          {paragraph.split(/(\[\d+\])/g).map((part, index) => {
            const marker = part.match(/^\[(\d+)\]$/);

            if (!marker) return part;

            return (
              <sup
                key={index}
                className={styles.citation}
                title="From an excerpt of this document"
              >
                {marker[1]}
              </sup>
            );
          })}
        </p>
      ))}

      {citations.length > 0 && (
        <div className={styles.sources}>
          <span className={styles.sourcesLabel}>Sources in this document</span>

          <ul className={styles.sourceList}>
            {citations.map((citation) => (
              <li key={citation.ref}>
                <span className={styles.sourceRef}>{citation.ref}</span>
                <span>
                  excerpt {citation.chunkIndex + 1}
                  {citation.pageStart ? ` · page ${citation.pageStart}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
