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
        <div className="fixed bottom-24 left-4 right-4 z-50 h-[640px] max-h-[82vh] overflow-hidden rounded-3xl sm:left-auto sm:right-6 sm:w-[26rem] sm:max-w-[92vw]">
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
