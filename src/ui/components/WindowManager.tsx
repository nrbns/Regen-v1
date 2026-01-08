import React from 'react';

export function useWindowManager() {
  // Minimal stub for dev:createWindow calls
  const createWindow = (id: string, title: string, content: React.ReactNode) => {
    console.info('[WindowManager stub] createWindow', id, title);
    // No-op in v1-mode / web dev
  };

  const closeWindow = (id: string) => {
    console.info('[WindowManager stub] closeWindow', id);
  };

  return { createWindow, closeWindow };
}

export default function WindowManagerStub() {
  return null;
}
