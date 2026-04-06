"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { MouseEvent, ReactNode } from "react";
import { navigateWithTransition } from "@/lib/navigation-transition";

type TransitionLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export default function TransitionLink({ href, className, children }: TransitionLinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      href === pathname
    ) {
      return;
    }

    event.preventDefault();
    navigateWithTransition(router, href);
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
