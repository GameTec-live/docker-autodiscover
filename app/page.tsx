import type { ContainerInfo } from "dockerode";
import Docker from "dockerode";
import { ExternalLink, Server } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PortInfo = {
  privatePort: number;
  publicPort?: number;
  type: string;
  ip?: string;
};

type ContainerRow = {
  id: string;
  name: string;
  image: string;
  status: string;
  state?: string;
  ports: PortInfo[];
  openUrl?: string;
};

function getOpenUrl(ports: PortInfo[]): string | undefined {
  const pub = ports.find((p) => typeof p.publicPort === "number");
  if (!pub || !pub.publicPort) return undefined;
  const protocol = pub.type === "udp" ? "http" : "http";
  return `${protocol}://${process.env.HOST_URL}:${pub.publicPort}`;
}

async function listContainers(): Promise<ContainerRow[]> {
  const docker = new Docker();
  const containers: ContainerInfo[] = await docker.listContainers({
    all: false,
  });
  return containers.map((c) => {
    const name =
      (c.Names?.[0] || "").replace(/^\//, "") || c.Id.substring(0, 12);
    const ports: PortInfo[] = (c.Ports || []).map((p) => ({
      privatePort: p.PrivatePort,
      publicPort: p.PublicPort,
      type: p.Type,
      ip: p.IP,
    }));
    const row: ContainerRow = {
      id: c.Id,
      name,
      image: c.Image,
      status: c.Status ?? "running",
      state: c.State,
      ports,
      openUrl: getOpenUrl(ports),
    };
    return row;
  });
}

export default async function Home() {
  let rows: ContainerRow[] = [];
  let error: string | null = null;
  try {
    rows = await listContainers();
  } catch {
    error =
      "Unable to contact Docker. Make sure Docker Desktop is running and this app has access to the Docker socket.";
  }

  return (
    <main className="container mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <Server className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Running Containers</h1>
      </header>

      {error ? (
        <div className="text-destructive rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">No running containers found.</p>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <a
              key={c.id}
              href={c.openUrl ?? "#"}
              target={c.openUrl ? "_blank" : undefined}
              rel="noreferrer noopener"
              className={c.openUrl ? "" : "pointer-events-none opacity-80"}
            >
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{c.name}</span>
                    {c.openUrl ? (
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    ) : null}
                  </CardTitle>
                  <CardDescription className="truncate">
                    {c.image}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full border px-2 py-0.5 text-muted-foreground">
                      {c.status}
                    </span>
                    {c.ports.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {c.ports.map((p, i) => (
                          <span
                            key={`${p.privatePort}-${p.publicPort}-${i}`}
                            className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {p.type.toUpperCase()} {p.publicPort ?? "-"}:
                            {p.privatePort}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        No published ports
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </section>
      )}
    </main>
  );
}
