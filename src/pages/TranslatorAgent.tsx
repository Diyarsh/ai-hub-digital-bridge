import { TranslatorPlatform } from "@/components/translator/TranslatorPlatform";

/** Полноэкранный агент-переводчик: задачи, редактор сегментов, глоссарий */
export default function TranslatorAgent() {
  return (
    <div className="h-full min-h-0 p-4 md:p-6">
      <TranslatorPlatform />
    </div>
  );
}
