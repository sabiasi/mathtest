"use client";

import { Crown, LayoutGrid, LogOut, Settings, School, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { displayName, useAuth } from "@/features/auth/AuthProvider";
import { useIsFounder } from "@/features/admin/useIsFounder";
import { usePlan } from "@/features/plans/PlanProvider";
import { useT } from "@/i18n/language";
import { initials } from "@/lib/auth/profile";

/** Right side of the header: the account menu, or "Sign in" / "Sign up". */
export function HeaderAccount() {
  const t = useT();
  const { status } = useAuth();

  if (status === "loading") return <span className="size-9 animate-pulse rounded-full bg-muted" aria-hidden="true" />;
  if (status === "signed-in") return <UserMenu />;
  if (status === "unconfigured") return null;
  return (
    <div className="flex items-center gap-1.5">
      <Link href="/signin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        {t("auth.signIn")}
      </Link>
      <Link href="/signup" className={buttonVariants({ size: "sm", className: "max-sm:hidden" })}>
        {t("auth.signUp")}
      </Link>
    </div>
  );
}

function Avatar({ size = "size-9" }: { size?: string }) {
  const { user, profile } = useAuth();
  const name = displayName(user, profile);
  const picture = user?.user_metadata?.avatar_url as string | undefined;
  return picture ? (
    // eslint-disable-next-line @next/next/no-img-element -- Google profile pictures, any size
    <img src={picture} alt="" referrerPolicy="no-referrer" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} flex items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground`}>
      {initials(name, user?.email ?? "")}
    </span>
  );
}

function UserMenu() {
  const t = useT();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { entitlements, ready } = usePlan();
  const founder = useIsFounder();
  const name = displayName(user, profile);
  const planLabel = entitlements.previewOf
    ? t("user.previewBadge")
    : entitlements.state === "trial" ? t("user.trialDays", { days: entitlements.trialDaysLeft ?? 0 }) : t(`plan.${entitlements.plan}`);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("user.menu")}
        className="rounded-full ring-offset-2 ring-offset-background transition-shadow outline-none hover:ring-2 hover:ring-primary-soft-border focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <Avatar size="size-10" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-foreground">{name}</span>
            <span className="block truncate text-sm font-normal text-muted-foreground">{user?.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/tests")}>
          <LayoutGrid aria-hidden="true" />
          {t("home.title")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/settings#plan")}>
          <Crown aria-hidden="true" />
          {t("user.plan")}
          {ready && (
            <span className="ml-auto rounded-full bg-premium-soft px-2 py-0.5 text-xs font-semibold text-premium-text">{planLabel}</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/settings")}>
          <Settings aria-hidden="true" />
          {t("user.settings")}
        </DropdownMenuItem>
        {entitlements.school && (
          <DropdownMenuItem onSelect={() => router.push(entitlements.school?.role === "admin" ? "/school" : "/settings#school")} data-menu-school="">
            <School aria-hidden="true" />
            {t("mySchool.title")}
          </DropdownMenuItem>
        )}
        {founder && (
          <DropdownMenuItem onSelect={() => router.push("/admin")} data-menu-admin="">
            <ShieldCheck aria-hidden="true" />
            {t("admin.title")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut aria-hidden="true" />
          {t("user.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
