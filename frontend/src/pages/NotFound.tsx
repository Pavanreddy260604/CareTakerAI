import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="text-center relative z-10 max-w-md">
        {/* Error icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
          <span className="text-5xl">🔍</span>
        </div>

        {/* Error code */}
        <h1 className="text-6xl sm:text-7xl font-mono font-bold text-destructive mb-4">
          404
        </h1>

        {/* Error message */}
        <p className="text-lg sm:text-xl text-foreground font-mono mb-2">
          Page not found
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          The requested route <code className="text-xs bg-muted/30 px-2 py-1 rounded">{location.pathname}</code> does not exist.
        </p>

        {/* Action button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-6 py-3 rounded-xl font-mono text-sm transition-all active:scale-[0.98]"
        >
          <span>←</span>
          <span>Return to Dashboard</span>
        </Link>

        {/* System status */}
        <div className="mt-8 pt-6 border-t border-muted/30">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-mono">System operational</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
