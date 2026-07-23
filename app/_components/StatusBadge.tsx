interface StatusBadgeProps {
  active: boolean;
  label: string;
}

const StatusBadge = ({ active, label }: StatusBadgeProps) => (
  <div className="flex items-center gap-3 py-1.5 px-3 rounded-full bg-white/5 border border-white/10 w-fit">
    <span className="relative flex h-3 w-3">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-spotify-green opacity-75"></span>
      )}
      <span
        className={`relative inline-flex rounded-full h-3 w-3 ${
          active ? "bg-spotify-green" : "bg-red-500"
        }`}
      ></span>
    </span>
    <div className="flex flex-col text-xs leading-none">
      <span className="font-semibold text-white">{label}</span>
    </div>
  </div>
);

export default StatusBadge;
