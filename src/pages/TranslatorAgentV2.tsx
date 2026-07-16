import { TranslatorDocumentPlatform } from "@/components/translator/TranslatorDocumentPlatform";

/** Переводчик 2.0 — документный режим (форматирование + цельный просмотр) */
export default function TranslatorAgentV2() {
  return (
    <div className="h-full min-h-0 p-4 md:p-6">
      <TranslatorDocumentPlatform />
    </div>
  );
}
