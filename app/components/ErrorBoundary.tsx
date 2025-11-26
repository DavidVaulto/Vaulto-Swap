"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Check if it's a chunk loading error
    if (error.name === "ChunkLoadError" || error.message.includes("chunk")) {
      console.warn("Chunk loading error detected. Attempting to reload...");
      // Reload the page after a short delay to retry loading chunks
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      // Check if it's a chunk loading error
      if (
        this.state.error?.name === "ChunkLoadError" ||
        this.state.error?.message.includes("chunk")
      ) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <div className="text-center p-8">
              <h2 className="text-2xl font-bold mb-4">Loading...</h2>
              <p className="text-gray-400">Reloading page to fetch latest code...</p>
            </div>
          </div>
        );
      }

      // Custom fallback or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">Something went wrong</h2>
            <p className="text-gray-400 mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


