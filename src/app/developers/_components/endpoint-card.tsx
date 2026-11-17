import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TryIt } from "./try-it";

interface Endpoint {
  method: string;
  path: string;
  summary: string;
  params: readonly { name: string; type: string; note: string }[];
}

/** The engine accepts "template" as the second scenario id; keep the docs in line with the route. */
const fixNote = (note: string) => note.replace("or thame", "or template");

export function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="solid" size="lg" className="font-mono tracking-normal">
            {endpoint.method}
          </Badge>
          <h3 className="font-mono text-[17px] font-semibold tracking-tight">{endpoint.path}</h3>
        </div>
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted">{endpoint.summary}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 pt-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0">
          <p className="mb-2 text-[13px] font-semibold tracking-[-0.01em]">Query parameters</p>
          <div className="rounded-[16px] bg-surface-2 px-1 py-1 hairline">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoint.params.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="align-top font-mono text-[13px] font-medium">{p.name}</TableCell>
                    <TableCell className="whitespace-nowrap align-top font-mono text-xs text-muted">{p.type}</TableCell>
                    <TableCell className="min-w-[160px] align-top text-[13px] leading-relaxed text-muted">{fixNote(p.note)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <TryIt method={endpoint.method} path={endpoint.path} />
      </CardContent>
    </Card>
  );
}
