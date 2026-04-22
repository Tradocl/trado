import { ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrackingPanelProps {
  trackingNumber: string;
  carrier: string;
}

export const CARRIER_LABELS: Record<string, string> = {
  chilexpress: "Chilexpress",
  starken: "Starken",
  correos_chile: "Correos de Chile",
  blue_express: "Blue Express",
};

function getTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const encoded = encodeURIComponent(trackingNumber);
  switch (carrier.toLowerCase()) {
    case "chilexpress":
      return `https://www.chilexpress.cl/views/rates-and-services/tracking?origen=home&numero_documento=${encoded}`;
    case "starken":
      return `https://www.starken.cl/seguimiento?codigo=${encoded}`;
    case "correos_chile":
      return `https://correos.cl/seguimiento-de-envios/?cod=${encoded}`;
    case "blue_express":
      return `https://www.blueexpress.cl/seguimiento-de-envio/?codigo=${encoded}`;
    default:
      return null;
  }
}

export function TrackingPanel({ trackingNumber, carrier }: TrackingPanelProps) {
  const carrierLabel = CARRIER_LABELS[carrier.toLowerCase()] ?? carrier;
  const trackingUrl = getTrackingUrl(carrier, trackingNumber);

  return (
    <div className="flex items-start gap-3 p-3 bg-info/10 border border-info/20 rounded-lg">
      <Package className="h-4 w-4 text-info mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-info mb-1">Seguimiento del envío</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{carrierLabel}</span>
          {" · "}
          <span className="font-mono">{trackingNumber}</span>
        </p>
        {trackingUrl && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 mt-1 text-xs text-info"
            asChild
          >
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
              Rastrear en {carrierLabel}
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
