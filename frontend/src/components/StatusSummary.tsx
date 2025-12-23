interface StatusItem {
  label: string;
  value: "OK" | "LOW" | "DONE" | "PENDING" | "HIGH";
}

interface StatusSummaryProps {
  items: StatusItem[];
}

const getStatusClass = (value: StatusItem["value"]) => {
  switch (value) {
    case "OK":
    case "DONE":
      return "status-ok";
    case "PENDING":
      return "status-pending";
    case "LOW":
    case "HIGH":
      return "status-low";
    default:
      return "text-muted-foreground";
  }
};

const StatusSummary = ({ items }: StatusSummaryProps) => {
  return (
    <section className="system-card mb-6">
      <p className="system-text text-muted-foreground mb-4">STATUS</p>
      
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className={`system-text ${getStatusClass(item.value)}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatusSummary;
