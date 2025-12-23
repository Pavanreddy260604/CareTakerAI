const messages = [
  "Continuity maintained.",
  "Monitoring uninterrupted.",
  "Observation ongoing.",
];

interface ConsistencyStateProps {
  messageIndex?: number;
}

const ConsistencyState = ({ messageIndex = 0 }: ConsistencyStateProps) => {
  const message = messages[messageIndex % messages.length];
  
  return (
    <section className="border-t border-border pt-6 mb-6">
      <p className="text-sm text-muted-foreground">
        {message}
      </p>
    </section>
  );
};

export default ConsistencyState;
