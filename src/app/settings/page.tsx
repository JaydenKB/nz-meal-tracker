import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Daily targets & local LLM" showIcons={false} />
      <SettingsForm />
    </div>
  );
}
