import { useState } from "react";
import { BotMessageSquare, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { AIConversationPanel } from "./AIConversationPanel";

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full p-4 text-white shadow-lg transition-all duration-300 hover:scale-110 ${
          isOpen ? "rotate-90 bg-[var(--g3-active)]" : "bg-[var(--g3-active)] hover:brightness-95"
        }`}
        title={isOpen ? "Fechar assistente" : "Pergunte à IA"}
      >
        {isOpen ? <X size={24} /> : <BotMessageSquare size={28} />}
      </button>

      {isOpen ? (
        <div className="fixed inset-x-3 bottom-24 top-20 z-50 overflow-hidden rounded-3xl sm:inset-x-auto sm:right-6 sm:top-auto sm:h-[78vh] sm:max-h-[calc(100vh-7.5rem)] sm:w-[34rem] sm:max-w-[min(94vw,34rem)] lg:w-[38rem] lg:max-w-[min(94vw,38rem)]">
          <AIConversationPanel
            variant="compact"
            context={{
              pathname: location.pathname,
              pageTitle: document.title
            }}
            title="Pergunte à IA"
            subtitle=""
          />
        </div>
      ) : null}
    </>
  );
}
