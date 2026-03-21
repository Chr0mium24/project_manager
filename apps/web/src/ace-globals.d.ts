declare global {
  interface Window {
    ace?: {
      edit(target: Element): unknown;
    };
  }

  const ace: Window["ace"];
}

export {};
