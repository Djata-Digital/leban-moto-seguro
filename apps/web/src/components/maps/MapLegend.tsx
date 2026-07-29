export function MapLegend() {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-3 flex flex-wrap gap-4 text-sm">
      <LegendItem color="bg-green-600" label="Normal / permitida" />
      <LegendItem color="bg-red-600" label="Crítico / proibida" />
      <LegendItem color="bg-amber-500" label="Atenção" />
      <LegendItem color="bg-slate-400" label="Inativa / offline" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}