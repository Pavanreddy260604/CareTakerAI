const messages = [
  "Continuity maintained.",
  "Monitoring uninterrupted.",
  "Observation ongoing.",
  "Systems nominal.",
  "Health patterns analyzed.",
];

interface ConsistencyStateProps {
  messageIndex?: number;
}

const ConsistencyState = ({ messageIndex = 0 }: ConsistencyStateProps) => {
  const message = messages[messageIndex % messages.length];

  return (
    <section className="border-t border-muted/30 pt-5 mb-5">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <p className="font-mono text-xs">{message}</p>
      </div>
    </section>
  );
};

export default ConsistencyState;
