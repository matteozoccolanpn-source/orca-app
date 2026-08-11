/* ═════════ C4 · scheletri ═════════
   Mentre il contenuto arriva: la stessa forma delle righe che arriveranno. */

export function Skeleton({ rows }: { rows?: number }) {
  return (
    <div className="srf">
      {Array.from({ length: rows || 3 }).map((_, i) => (
        <div className="sk-row" key={i}>
          <span className="sk" style={{ width: "44px", height: "66px", flex: "none" }} />
          <span style={{ flex: 1 }}>
            <span className="sk sk-line" style={{ display: "block", width: "62%" }} />
            <span
              className="sk sk-line"
              style={{ display: "block", width: "40%", height: "10px" }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
