import React from 'react';

interface MarkdownLiteProps {
  content: string;
}

export const MarkdownLite: React.FC<MarkdownLiteProps> = ({ content }) => {
  const lines = content.split('\n');
  const renderedLines: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('### ')) {
      if (inList) {
        renderedLines.push(<ul key={`list-${index}`} className="list-disc pl-5 mb-2">{listItems}</ul>);
        inList = false;
        listItems = [];
      }
      renderedLines.push(<h3 key={index} className="text-lg font-bold mt-4 mb-2 text-primary-700">{parseInline(trimmed.substring(4))}</h3>);
      return;
    }

    // Lists
    if (trimmed.startsWith('- ')) {
      inList = true;
      listItems.push(<li key={`li-${index}`} className="mb-1">{parseInline(trimmed.substring(2))}</li>);
      return;
    }

    // Close list if we hit a non-list item
    if (inList && !trimmed.startsWith('- ')) {
      renderedLines.push(<ul key={`list-${index}`} className="list-disc pl-5 mb-2">{listItems}</ul>);
      inList = false;
      listItems = [];
    }

    // Paragraphs (ignore empty lines unless they are spacers)
    if (trimmed.length > 0) {
      renderedLines.push(<p key={index} className="mb-2 text-gray-700">{parseInline(trimmed)}</p>);
    } else {
        // empty line
    }
  });

  if (inList) {
    renderedLines.push(<ul key="list-end" className="list-disc pl-5 mb-2">{listItems}</ul>);
  }

  return <div className="text-sm leading-relaxed">{renderedLines}</div>;
};

const parseInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};
