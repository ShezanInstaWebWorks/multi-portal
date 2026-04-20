export function EmptyState({ icon = "📋", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-5xl mb-4 opacity-30">{icon}</div>
      <h3 className="font-display font-bold text-dark text-lg mb-2">{title}</h3>
      <p className="text-muted text-sm max-w-xs leading-relaxed mb-5">
        {description}
      </p>
      {action}
    </div>
  );
}
