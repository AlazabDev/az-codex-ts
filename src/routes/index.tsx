import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AzLogo } from "@/components/AzLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AzCodex — وكيل الهندسة والتشغيل الذكي" },
      { name: "description", content: "AzCodex: محادثة احترافية مع وكيل ذكاء اصطناعي للتطوير والتشغيل وFrappe/ERPNext." },
      { property: "og:title", content: "AzCodex — وكيل الهندسة والتشغيل الذكي" },
      { property: "og:description", content: "محادثة احترافية مع وكيل ذكاء اصطناعي للتطوير والتشغيل." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-grid">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <AzLogo />
          <span className="font-mono font-semibold">AzCodex</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">تسجيل الدخول</Link>
        </Button>
      </header>
      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="mb-5 rounded-full border border-border px-3 py-1 font-mono text-xs text-primary">
          AI Engineering &amp; Operations Workspace
        </span>
        <h1 className="text-4xl font-bold leading-tight md:text-6xl">
          وكيلك الذكي لتطوير <span className="text-primary">وتشغيل</span> أنظمة العزب
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          محادثات متعددة، سياق محفوظ، وخبرة في Frappe و ERPNext و Git والبنية التحتية.
        </p>
        <Button asChild size="lg" className="mt-8 shadow-glow">
          <Link to="/chat">ابدأ المحادثة</Link>
        </Button>
      </main>
    </div>
  );
}
