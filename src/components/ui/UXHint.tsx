"use client";

import * as React from "react";

type UXHintProps = {
  show: boolean;
  children: React.ReactNode;
  className?: string;
};

export function UXHint({ show, children, className }: UXHintProps) {
  if (!show) return null;

  return <p className={className ?? "text-xs text-gray-600 mb-3"}>{children}</p>;
}
