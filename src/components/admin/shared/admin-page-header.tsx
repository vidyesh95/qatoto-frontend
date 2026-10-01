export interface AdminPageHeaderProps {
  readonly title: string;
  readonly description: string;
  readonly secondaryDescription?: string;
}

export function AdminPageHeader({
  title,
  description,
  secondaryDescription,
}: AdminPageHeaderProps) {
  return (
    <header className="max-w-3xl space-y-1">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {secondaryDescription ? (
        <p className="text-sm text-muted-foreground">{secondaryDescription}</p>
      ) : null}
    </header>
  );
}
