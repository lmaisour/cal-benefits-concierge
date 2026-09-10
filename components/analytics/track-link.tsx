"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { track } from "@/lib/analytics/track";
import type { AnalyticsEvent, AnalyticsProps } from "@/lib/analytics/events";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function TrackLink({
  event,
  eventProps,
  href,
  className,
  children,
  ...rest
}: {
  event: AnalyticsEvent;
  eventProps?: AnalyticsProps;
  href: string;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track(event, eventProps)}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function TrackButtonLink({
  event,
  eventProps,
  href,
  className,
  children,
  variant,
  size,
  target,
  rel,
}: {
  event: AnalyticsEvent;
  eventProps?: AnalyticsProps;
  href: string;
  className?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      onClick={() => track(event, eventProps)}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children}
    </Link>
  );
}
