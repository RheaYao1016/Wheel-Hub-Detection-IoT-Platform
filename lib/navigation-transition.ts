import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
};

type TransitionOptions = {
  replace?: boolean;
};

export function navigateWithTransition(router: AppRouterInstance, href: string, options: TransitionOptions = {}) {
  const runNavigation = () => {
    if (options.replace) {
      router.replace(href);
      return;
    }
    router.push(href);
  };

  if (typeof document === "undefined") {
    runNavigation();
    return;
  }

  const transitionDocument = document as TransitionDocument;
  if (typeof transitionDocument.startViewTransition === "function") {
    transitionDocument.startViewTransition(() => {
      runNavigation();
    });
    return;
  }

  runNavigation();
}
