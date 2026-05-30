"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { logEvent } from "@/lib/debug/event-bus";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class TalkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logEvent({
      kind: "error",
      level: "error",
      message: "react crash",
      data: { error: error.message, componentStack: info.componentStack?.slice(0, 500) },
    });
  }

  handleReset = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/talk";
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="button"
          tabIndex={0}
          onClick={this.handleReset}
          onKeyDown={(e) => e.key === "Enter" && this.handleReset()}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
            background: "linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "'Kanit', sans-serif",
              fontSize: "16px",
              fontWeight: 500,
              color: "#9A8B73",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            หนูสะดุดนิดนึงค่า~ tap to reset
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
