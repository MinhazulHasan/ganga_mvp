import { CheckIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { whyFusion } from "@/content/architecture";

export function WhyFusionTable() {
  return (
    <Reveal>
      <Card className="overflow-hidden">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="bg-surface-2/60">
              {whyFusion.columns.map((c, i) => (
                <TableHead key={c} className={`h-12 ${i === 0 ? "pl-6" : ""}`}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {whyFusion.rows.map((row) => {
              const ganga = row[0].startsWith("GANGA");
              return (
                <TableRow key={row[0]} className={ganga ? "bg-brand-soft/70 hover:bg-brand-soft" : "hover:bg-surface-2/50"}>
                  {row.map((cell, i) => (
                    <TableCell key={i} className={`py-4 text-[14px] ${i === 0 ? "pl-6 text-[15px] font-semibold" : ganga ? "font-medium" : "text-muted"}`}>
                      {ganga && i === 0 ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-5 w-0.5 rounded-full bg-brand" aria-hidden />
                          {cell}
                        </span>
                      ) : ganga ? (
                        <span className="inline-flex items-start gap-2">
                          <CheckIcon className="mt-0.5 size-4 shrink-0 text-built" aria-hidden />
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <p className="mt-6 max-w-3xl text-[17px] leading-relaxed">{whyFusion.takeaway}</p>
    </Reveal>
  );
}
