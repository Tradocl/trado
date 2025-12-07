import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface DashboardCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentNickname: string | null;
  currentColor: string;
  onSave: (nickname: string | null, color: string) => void;
}

const colorOptions = [
  { value: "primary", label: "Azul", gradient: "from-primary to-primary-light" },
  { value: "emerald", label: "Verde", gradient: "from-emerald-600 to-emerald-400" },
  { value: "purple", label: "Púrpura", gradient: "from-purple-600 to-purple-400" },
  { value: "orange", label: "Naranja", gradient: "from-orange-600 to-orange-400" },
  { value: "rose", label: "Rosa", gradient: "from-rose-600 to-rose-400" },
  { value: "cyan", label: "Cian", gradient: "from-cyan-600 to-cyan-400" },
  { value: "amber", label: "Ámbar", gradient: "from-amber-600 to-amber-400" },
  { value: "slate", label: "Gris", gradient: "from-slate-700 to-slate-500" },
];

export const DashboardCustomizeDialog = ({
  open,
  onOpenChange,
  userId,
  currentNickname,
  currentColor,
  onSave,
}: DashboardCustomizeDialogProps) => {
  const [nickname, setNickname] = useState(currentNickname || "");
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nickname: nickname.trim() || null,
          dashboard_color: selectedColor,
        })
        .eq("id", userId);

      if (error) throw error;

      onSave(nickname.trim() || null, selectedColor);
      toast.success("Personalización guardada");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar Dashboard</DialogTitle>
          <DialogDescription>
            Cambia tu apodo y el color de tu tarjeta de bienvenida
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Apodo (opcional)</Label>
            <Input
              id="nickname"
              placeholder="Ej: Juan, JuanDev, etc."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              Se mostrará en lugar de tu nombre completo
            </p>
          </div>

          <div className="space-y-3">
            <Label>Color de la tarjeta</Label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`relative h-12 rounded-lg bg-gradient-to-br ${color.gradient} transition-all duration-200 ${
                    selectedColor === color.value
                      ? "ring-2 ring-offset-2 ring-foreground scale-105"
                      : "hover:scale-105"
                  }`}
                  title={color.label}
                >
                  {selectedColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vista previa</Label>
            <div className={`p-4 rounded-lg bg-gradient-to-br ${
              colorOptions.find(c => c.value === selectedColor)?.gradient || colorOptions[0].gradient
            } text-white`}>
              <p className="font-semibold">
                ¡Hola, {nickname.trim() || "Usuario"}!
              </p>
              <p className="text-sm opacity-80">Bienvenido a tu panel de control seguro</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
