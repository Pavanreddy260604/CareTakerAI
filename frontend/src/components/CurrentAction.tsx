interface CurrentActionProps {
  action: string | null;
  status: "PENDING" | "COMPLETED";
  onConfirm: () => void;
}

const CurrentAction = ({ action, status, onConfirm }: CurrentActionProps) => {
  if (!action) {
    return (
      <section className="system-card mb-6">
        <p className="system-text text-muted-foreground mb-2">CURRENT ACTION</p>
        <p className="text-foreground mb-4">No further actions today.</p>
        <p className="text-muted-foreground text-sm">Monitoring continues.</p>
      </section>
    );
  }

  return (
    <section className="system-card mb-6">
      <p className="system-text text-muted-foreground mb-4">CURRENT ACTION</p>
      
      <p className="text-lg font-medium text-foreground mb-6">
        {action}
      </p>
      
      <div className="flex items-center justify-between">
        <span className={`system-text ${status === "PENDING" ? "status-pending" : "status-ok"}`}>
          {status}
        </span>
        
        {status === "PENDING" && (
          <button 
            onClick={onConfirm}
            className="system-button system-button-primary"
          >
            CONFIRM COMPLETION
          </button>
        )}
      </div>
    </section>
  );
};

export default CurrentAction;
