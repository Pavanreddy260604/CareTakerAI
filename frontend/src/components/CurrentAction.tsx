interface CurrentActionProps {
  action: string | null;
  status: "PENDING" | "COMPLETED";
  onConfirm: () => void;
}

const CurrentAction = ({ action, status, onConfirm }: CurrentActionProps) => {
  if (!action) {
    return (
      <section className="bento-card p-4 mb-4 border-l-4 border-l-primary/30">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">CURRENT ACTION</p>
        <p className="text-foreground mb-2">No further actions today.</p>
        <p className="text-muted-foreground text-xs">Monitoring continues.</p>
      </section>
    );
  }

  return (
    <section className="bento-card p-4 mb-4 border-l-4 border-l-primary animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-mono text-primary uppercase tracking-wider mb-2">RECOMMENDED ACTION</p>
          <p className="text-xl font-display font-medium text-foreground leading-tight">
            {action}
          </p>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className={`pill ${status === "PENDING" ? "pill-warning" : "pill-ok"}`}>
            {status}
          </span>

          {status === "PENDING" && (
            <button
              onClick={onConfirm}
              className="btn-primary text-sm px-4 py-2"
            >
              COMPLETE
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default CurrentAction;
