import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AGENT_MODELS, MAX_AGENTS, parseAgents, type AgentModel, type AgentProfile } from "@/lib/agents";

export function AgentsManager({ initial }: { initial: unknown }) {
  const qc = useQueryClient();
  const [config, setConfig] = useState(() => parseAgents(initial));
  const [saving, setSaving] = useState(false);
  const patch = (id: string, p: Partial<AgentProfile>) =>
    setConfig((c) => ({ ...c, list: c.list.map((a) => (a.id === id ? { ...a, ...p } : a)) }));
  const add = () => setConfig((c) => ({ ...c, list: [...c.list, { id: `agent-${Date.now().toString(36)}`, name: "وكيل جديد", model: "openai/gpt-6-astra", instructions: "", benchTools: false }] }));
  const remove = (id: string) => setConfig((c) => {
    const list = c.list.filter((a) => a.id !== id);
    return { list, activeId: c.activeId === id ? list[0]!.id : c.activeId };
  });
  async function save() {
    if (config.list.some((a) => !a.name.trim())) { toast.error("لكل وكيل اسم مطلوب."); return; }
    setSaving(true);
    const next = parseAgents(config);
    const { error } = await supabase.auth.updateUser({ data: { agents: next } });
    setSaving(false);
    if (error) { toast.error("تعذر حفظ الوكلاء."); return; }
    qc.setQueryData(["agents"], next);
    toast.success("تم حفظ الوكلاء.");
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">أنشئ وكلاء بأدوار ونماذج مختلفة، ثم بدّل بينهم من قائمة الوكيل أسفل مربع الكتابة في المحادثة.</p>
      {config.list.map((a) => (
        <div key={a.id} className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <Input aria-label="اسم الوكيل" value={a.name} maxLength={40} onChange={(e) => patch(a.id, { name: e.target.value })} />
            <label className="flex shrink-0 items-center gap-2 text-sm"><input type="radio" name="default-agent" checked={config.activeId === a.id} onChange={() => setConfig((c) => ({ ...c, activeId: a.id }))} />افتراضي</label>
            <Button variant="ghost" size="icon" aria-label="حذف الوكيل" disabled={config.list.length <= 1} onClick={() => remove(a.id)}><Trash2 /></Button>
          </div>
          <div className="space-y-2"><Label>النموذج</Label>
            <Select dir="rtl" value={a.model} onValueChange={(v) => patch(a.id, { model: v as AgentModel })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AGENT_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>دور الوكيل وتعليماته</Label>
            <Textarea rows={3} maxLength={2000} value={a.instructions} onChange={(e) => patch(a.id, { instructions: e.target.value })} placeholder="مثال: أنت مراجع كود صارم لتطبيقات Frappe." />
          </div>
          <div className="flex items-center justify-between gap-4"><Label>السماح بأدوات البنش (على السيرفر فقط)</Label><Switch checked={a.benchTools} onCheckedChange={(benchTools) => patch(a.id, { benchTools })} /></div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={add} disabled={config.list.length >= MAX_AGENTS}><Plus />إضافة وكيل</Button>
        <Button onClick={save} disabled={saving}><Save />{saving ? "جارٍ الحفظ…" : "حفظ الوكلاء"}</Button>
      </div>
    </div>
  );
}
