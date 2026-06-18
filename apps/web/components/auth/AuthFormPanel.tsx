import { Icon } from "@/components/common/Icon";
import type { ReactNode } from "react";

export function AuthFormPanel({
  children,
  cardIcon,
  cardIconClassName,
  cardIconWrapperClassName,
  cardClassName,
  cardTitle,
  cardTitleClassName,
  cardSubtitle,
  cardHeaderClassName,
}: {
  children: ReactNode;
  cardIcon: string;
  cardIconClassName: string;
  cardIconWrapperClassName: string;
  cardClassName: string;
  cardTitle: string;
  cardTitleClassName: string;
  cardSubtitle: string;
  cardHeaderClassName: string;
}) {
  return (
    <section className={cardClassName}>
      <div className={cardIconWrapperClassName}>
        <Icon name={cardIcon} className={cardIconClassName} />
      </div>
      <div className={cardHeaderClassName}>
        <h2 className={cardTitleClassName}>{cardTitle}</h2>
        <p className="mt-3 text-base text-slate-300">{cardSubtitle}</p>
      </div>
      {children}
    </section>
  );
}
