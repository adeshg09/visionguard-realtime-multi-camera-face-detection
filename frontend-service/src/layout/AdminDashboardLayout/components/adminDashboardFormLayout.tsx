/* Imports */
import { memo, type JSX, type ReactNode } from "react";

/* Local Imports */
import {
  Card,
  CardHeader,
  CardDescription,
  CardFooter,
  CardContent,
} from "@/components/ui/card";
import clsx from "clsx";
import { typography } from "@/theme/typography";

// ----------------------------------------------------------------------

/* Interfaces */
export interface AdminDashboardFormLayoutProps {
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

// ----------------------------------------------------------------------

/**
 * Reusable layout for Admin Dashboard forms.
 *
 * @component
 * @param {string} title - Form title displayed in card header.
 * @param {string} description - Optional description below title.
 * @param {ReactNode} children - Form fields/content.
 * @param {ReactNode} footer - Footer area (e.g., buttons).
 * @param {string} className - Additional classnames for card.
 * @returns {JSX.Element}
 */

// ----------------------------------------------------------------------
const AdminDashboardFormLayout = ({
  title,
  description,
  children,
  footer,
  className,
}: AdminDashboardFormLayoutProps): JSX.Element => {
  /* Output */
  return (
    <Card className={clsx("h-full p-0 g-0", className)}>
      <CardHeader className="px-8 py-4 border-b-2 border-b-secondary-100 dark:border-b-secondary-600 flex items-center justify-center shrink-0">
        <CardDescription className={clsx(typography.regular18)}>
          {description ?? title}
        </CardDescription>
      </CardHeader>

      <CardContent className="h-full overflow-y-auto px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{children}</div>
      </CardContent>

      {footer && (
        <CardFooter className="flex justify-between px-8 py-4 border-t-2 border-b-secondary-100 dark:border-b-secondary-600 shrink-0">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
};

export default memo(AdminDashboardFormLayout);
