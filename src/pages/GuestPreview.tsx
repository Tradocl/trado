import { useNavigate } from "react-router-dom";
import { Shield, Lock, CheckCircle, Star, ArrowLeft, TrendingUp, Clock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_MOVEMENTS = [
  { label: "Venta MacBook Air M1", amount: "+$589.000", type: "credit", date: "Hoy", status: "Completada" },
  { label: "Compra PS5 Digital", amount: "-$380.000", type: "debit", date: "Ayer", status: "Completada" },
  { label: "Comisión Trado", amount: "-$19.500", type: "fee", date: "Ayer", status: "Descontada" },
  { label: "Retiro a banco", amount: "-$500.000", type: "debit", date: "Lun", status: "Procesado" },
  { label: "Venta iPhone 14 Pro", amount: "+$522.500", type: "credit", date: "Dom", status: "Completada" },
];

const MOCK_TRANSACTIONS = [
  { product: "MacBook Air M1", amount: "$620.000", status: "Completada", color: "#16A34A" },
  { product: "PS5 Digital", amount: "$380.000", status: "En proceso", color: "#1F25C1" },
  { product: "iPhone 14 Pro", amount: "$550.000", status: "Completada", color: "#16A34A" },
];

export default function GuestPreview() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1F25C1] px-4 pt-12 pb-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/70 text-sm mb-4">
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex items-center justify-between mb-1">
          <p className="text-white/70 text-sm font-medium">Saldo disponible</p>
          <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Vista previa</span>
        </div>
        <p className="text-white font-black text-4xl tracking-tight">$211.000</p>
        <p className="text-white/50 text-xs mt-1">$380.000 en garantía · $0 retirado</p>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: TrendingUp, label: "Nueva venta" },
            { icon: Package, label: "Comprar" },
            { icon: ArrowLeft, label: "Retirar" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => navigate("/auth")}
              className="flex flex-col items-center gap-1.5 bg-white/10 rounded-2xl py-3 px-2"
            >
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Icon size={17} className="text-white" />
              </div>
              <span className="text-white text-[11px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 space-y-5 overflow-auto pb-32">
        {/* Active transaction */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Transacción activa</p>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-gray-800">PS5 Digital</p>
              <span className="bg-blue-100 text-[#1F25C1] text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Lock size={10} /> En proceso
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">$380.000</p>
            <div className="flex items-center gap-1 mt-3">
              {["Pago", "Envío", "Confirmar"].map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === 0 ? "bg-[#1F25C1] text-white" : i === 1 ? "bg-[#1F25C1]/20 text-[#1F25C1] border border-[#1F25C1]/40 animate-pulse" : "bg-gray-100 text-gray-300"}`}>
                    {i === 0 ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${i < 2 ? "text-gray-600" : "text-gray-300"}`}>{s}</span>
                  {i < 2 && <div className={`flex-1 h-px ${i === 0 ? "bg-[#1F25C1]/30" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Movement history */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Movimientos</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {MOCK_MOVEMENTS.map((m, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${m.type === "credit" ? "bg-green-100" : m.type === "fee" ? "bg-gray-100" : "bg-red-50"}`}>
                  {m.type === "credit" ? <TrendingUp size={15} className="text-green-600" /> : m.type === "fee" ? <CheckCircle size={15} className="text-gray-400" /> : <ArrowLeft size={15} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm font-medium truncate">{m.label}</p>
                  <p className="text-gray-400 text-xs">{m.date} · {m.status}</p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${m.type === "credit" ? "text-green-600" : "text-gray-500"}`}>{m.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reputation preview */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Tu reputación</p>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1F25C1] flex items-center justify-center text-white text-lg font-black">TU</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-gray-800">Tu perfil</p>
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">✓ Verificado</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= 5 ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />)}
                  <span className="text-gray-500 text-xs ml-1">4.9 · 12 transacciones</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA sticky */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 space-y-2">
        <Button
          onClick={() => navigate("/auth?tab=register")}
          className="w-full bg-[#1F25C1] text-white h-13 rounded-2xl text-base font-bold shadow-lg"
          size="lg"
        >
          Crear cuenta gratis — Es rápido
        </Button>
        <button
          onClick={() => navigate("/auth")}
          className="w-full text-[#1F25C1] text-sm font-semibold py-2"
        >
          Ya tengo cuenta
        </button>
      </div>
    </div>
  );
}
