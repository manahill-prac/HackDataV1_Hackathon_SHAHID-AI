import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log for debugging without crashing
    console.error("[SHAHID.AI ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ui-card m-6 space-y-3 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-[#EF9B20]">
            Module temporarily unavailable — core evidence system still operational
          </h2>
          <p className="text-sm ui-muted">
            {this.props.moduleName
              ? `${this.props.moduleName} encountered an error.`
              : "This module encountered an error."}
          </p>
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {this.state.error?.message || "Unknown error"}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="ui-primary-btn text-sm"
          >
            Retry Module | دوبارہ کوشش کریں
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
