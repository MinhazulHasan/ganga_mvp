import { PageHeader } from "@/components/layout/page-header";
import { Provenance } from "@/components/brand/provenance";
import { Badge } from "@/components/ui/badge";
import { SignalChain } from "./_components/signal-chain";
import { RadioCompare } from "./_components/radio-compare";
import { PowerBudget } from "./_components/power-budget";
import { CostSection } from "./_components/cost-section";

export const metadata = {
  title: "Field & Cost",
  description: "Wired sensors, RTU, LoRa with VHF fallback, solar power budget and cost.",
};

const META = ["Wired sensors", "LoRa + VHF fallback", "Solar powered", "MQTT over TLS :8883"];

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Field & Cost"
        title="Field hardware and cost"
        meta={
          <>
            {META.map((m) => (
              <Badge key={m} variant="outline" size="lg">
                {m}
              </Badge>
            ))}
            <Provenance kind="planned" size="md" tip="Hardware designed and priced, not deployed. Engine built." />
          </>
        }
      />
      <SignalChain />
      <RadioCompare />
      <PowerBudget />
      <CostSection />
    </>
  );
}
